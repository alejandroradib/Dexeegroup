-- Audit H2 (CORRECCIONES-3): the helpers that only RLS policies, triggers and other
-- functions call move out of the API-exposed schema. PostgREST serves only the schemas in
-- pgrst.db_schemas (public, graphql_public), so nothing in `private` is reachable through
-- /rest/v1/rpc/, while policies and triggers keep working: they bind by OID, and every role
-- keeps USAGE on the schema and EXECUTE on the functions. The functions the application
-- calls with rpc() stay in public: candidate_valid_results, candidate_apply_requirements,
-- candidate_application_jobs and assessment_cooldown_ok (candidates.ts reads the next allowed
-- date through it).
--
-- Generated from the live definitions (pg_get_functiondef) with the textual replacement
-- public.<moved>( -> private.<moved>( in the fifteen bodies that reference a moved function.

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

alter function public.application_company_id(target_application_id uuid) set schema private;
alter function public.attempt_is_open(target_attempt_id uuid) set schema private;
alter function public.candidate_owns_attempt(target_attempt_id uuid) set schema private;
alter function public.company_can_view_candidate(target_candidate_id uuid) set schema private;
alter function public.company_can_view_contact(target_candidate_id uuid) set schema private;
alter function public.compute_profile_completeness(target_candidate_id uuid) set schema private;
alter function public.current_user_role() set schema private;
alter function public.is_admin() set schema private;
alter function public.is_company_owner(target_company_id uuid) set schema private;
alter function public.job_is_published(target_job_id uuid) set schema private;
alter function public.user_company_ids() set schema private;

-- Bodies that named a moved function by its old schema, re-issued with the new one.
-- private.company_can_view_candidate
CREATE OR REPLACE FUNCTION private.company_can_view_candidate(target_candidate_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.companies c on c.id = j.company_id
      join public.candidates cand on cand.id = a.candidate_id
     where a.candidate_id = target_candidate_id
       and cand.visibility = 'visible_to_companies'
       and c.status <> 'suspended'
       and c.id in (select private.user_company_ids())
  );
$function$;

-- private.company_can_view_contact
CREATE OR REPLACE FUNCTION private.company_can_view_contact(target_candidate_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.companies c on c.id = j.company_id
      join public.candidates cand on cand.id = a.candidate_id
     where a.candidate_id = target_candidate_id
       and a.contact_released = true
       and cand.visibility = 'visible_to_companies'
       and c.status <> 'suspended'
       and c.id in (select private.user_company_ids())
  );
$function$;

-- public.applications_before_insert
CREATE OR REPLACE FUNCTION public.applications_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_missing text;
begin
  if new.source = 'candidate' and auth.uid() is not null and not private.is_admin() then
    select string_agg(r.requirement, ',' order by r.requirement)
      into v_missing
      from public.candidate_apply_requirements(new.candidate_id) r
     where not r.satisfied;
    if v_missing is not null then
      raise exception 'requirements_missing:%', v_missing using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$function$;

-- public.candidate_apply_requirements
CREATE OR REPLACE FUNCTION public.candidate_apply_requirements(target_candidate_id uuid)
 RETURNS TABLE(requirement text, satisfied boolean, valid_until timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null
     and auth.uid() <> target_candidate_id
     and not private.is_admin() then
    raise exception 'requirements_own_only' using errcode = '42501';
  end if;

  return query
    select s.type::text as requirement,
           exists (
             select 1 from public.assessment_attempts t
              where t.assessment_id = s.id
                and t.candidate_id = target_candidate_id
                and t.status = 'validated'
                and t.valid_until > now()
           ) as satisfied,
           (select max(t.valid_until) from public.assessment_attempts t
             where t.assessment_id = s.id
               and t.candidate_id = target_candidate_id
               and t.status = 'validated') as valid_until
      from public.assessments s
     where s.required_to_apply and s.is_active
     order by s.type;

  return query
    select 'resume'::text,
           exists (
             select 1 from public.candidate_contacts c
              where c.candidate_id = target_candidate_id and c.resume_path is not null
           ),
           null::timestamptz;
end;
$function$;

-- public.candidate_valid_results
CREATE OR REPLACE FUNCTION public.candidate_valid_results(target_candidate_id uuid)
 RETURNS TABLE(type assessment_type, final_level cefr_level, validated_at timestamp with time zone, valid_until timestamp with time zone, bands jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select distinct on (s.type)
         s.type,
         t.final_level,
         t.validated_at,
         t.valid_until,
         case
           when s.type in ('psychometric', 'disc') and t.visible_to_companies then
             (select jsonb_object_agg(k, v ->> 'band')
                from jsonb_each(coalesce(t.report -> 'factors', t.report -> 'styles', '{}'::jsonb)) as e(k, v))
           else null
         end as bands
    from public.assessment_attempts t
    join public.assessments s on s.id = t.assessment_id
   where t.candidate_id = target_candidate_id
     and t.status = 'validated'
     and t.valid_until > now()
     and (
       auth.uid() is null
       or auth.uid() = target_candidate_id
       or private.is_admin()
       or (private.current_user_role() = 'company' and private.company_can_view_candidate(target_candidate_id))
     )
   order by s.type, t.validated_at desc;
$function$;

-- public.guard_application_update
CREATE OR REPLACE FUNCTION public.guard_application_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role public.user_role;
begin
  if auth.uid() is null or private.is_admin() then
    return new;
  end if;
  v_role := private.current_user_role();

  if new.job_id <> old.job_id or new.candidate_id <> old.candidate_id
     or new.source <> old.source or new.cover_note is distinct from old.cover_note then
    raise exception 'application_fields_locked' using errcode = '42501';
  end if;
  if new.contact_released <> old.contact_released
     or new.contact_released_by is distinct from old.contact_released_by
     or new.contact_released_at is distinct from old.contact_released_at then
    raise exception 'contact_release_admin_only' using errcode = '42501';
  end if;

  if v_role = 'candidate' then
    if new.contact_requested_at is distinct from old.contact_requested_at then
      raise exception 'application_fields_locked' using errcode = '42501';
    end if;
    if new.status <> old.status then
      if new.status <> 'withdrawn' then
        raise exception 'candidate_can_only_withdraw' using errcode = '42501';
      end if;
      if old.status not in ('applied', 'screening', 'shortlisted', 'interview') then
        raise exception 'withdraw_not_allowed' using errcode = 'P0001';
      end if;
    end if;
  elsif v_role = 'company' then
    if new.status = 'withdrawn' and old.status <> 'withdrawn' then
      raise exception 'company_cannot_withdraw' using errcode = '42501';
    end if;
    if old.status = 'withdrawn' and new.status <> 'withdrawn' then
      raise exception 'application_withdrawn' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$function$;

-- public.guard_attempt_update
CREATE OR REPLACE FUNCTION public.guard_attempt_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not private.is_admin() then
    if new.visible_to_companies is distinct from old.visible_to_companies then
      -- only this column may change; reset everything else
      new := old;
      new.visible_to_companies := not old.visible_to_companies;
    else
      raise exception 'attempt_fields_locked' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

-- public.guard_candidate_update
CREATE OR REPLACE FUNCTION public.guard_candidate_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not private.is_admin() then
    new.english_written_level := old.english_written_level;
    new.english_oral_level := old.english_oral_level;
    new.english_verified_level := old.english_verified_level;
    new.english_verified_at := old.english_verified_at;
    new.psychometric_completed_at := old.psychometric_completed_at;
    new.candidate_tags := old.candidate_tags;
    new.data_consent_at := old.data_consent_at;
    new.data_consent_version := old.data_consent_version;
  end if;
  return new;
end;
$function$;

-- public.guard_company_update
CREATE OR REPLACE FUNCTION public.guard_company_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not private.is_admin() then
    if new.status <> old.status
       or coalesce(new.verified_at, 'epoch') <> coalesce(old.verified_at, 'epoch')
       or coalesce(new.verified_by, '00000000-0000-0000-0000-000000000000') <> coalesce(old.verified_by, '00000000-0000-0000-0000-000000000000')
       or new.owner_user_id <> old.owner_user_id
       or new.is_demo <> old.is_demo then
      raise exception 'company_fields_locked' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

-- public.guard_contact_request_update
CREATE OR REPLACE FUNCTION public.guard_contact_request_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not private.is_admin() then
    raise exception 'lead_admin_only' using errcode = '42501';
  end if;
  if new.status <> old.status and new.status in ('answered', 'converted') then
    if new.answered_at is null then
      new.answered_at := now();
    end if;
    if new.answered_by is null then
      new.answered_by := auth.uid();
    end if;
  end if;
  return new;
end;
$function$;

-- public.guard_mock_interview_update
CREATE OR REPLACE FUNCTION public.guard_mock_interview_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not private.is_admin() then
    if old.status <> 'in_progress' then
      raise exception 'interview_closed' using errcode = '42501';
    end if;
    new.status := old.status;
    new.questions := old.questions;
    new.report := old.report;
    new.overall_score := old.overall_score;
    new.completed_at := old.completed_at;
    new.role_family := old.role_family;
    new.language := old.language;
    new.expires_at := old.expires_at;
    new.processing_attempts := old.processing_attempts;
  end if;
  return new;
end;
$function$;

-- public.guard_notification_update
CREATE OR REPLACE FUNCTION public.guard_notification_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not private.is_admin() then
    if new.user_id <> old.user_id or new.type <> old.type or new.title <> old.title
       or new.body is distinct from old.body or new.link is distinct from old.link then
      raise exception 'notification_fields_locked' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

-- public.guard_profile_update
CREATE OR REPLACE FUNCTION public.guard_profile_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is not null and not private.is_admin() then
    if new.role <> old.role or new.email <> old.email or new.id <> old.id then
      raise exception 'profile_fields_locked' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

-- public.jobs_before_write
CREATE OR REPLACE FUNCTION public.jobs_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_company_status public.company_status;
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.slugify(new.title) || '-' || left(replace(new.id::text, '-', ''), 6);
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if auth.uid() is not null and not private.is_admin() then
      select status into v_company_status from public.companies where id = new.company_id;
      if v_company_status is distinct from 'verified' then
        raise exception 'company_not_verified' using errcode = 'P0001';
      end if;
    end if;
    if new.published_at is null then
      new.published_at := now();
    end if;
    new.review_message := null;
  end if;

  if tg_op = 'UPDATE' and auth.uid() is not null and not private.is_admin() then
    if new.company_id <> old.company_id then
      raise exception 'job_company_locked' using errcode = '42501';
    end if;
    -- companies cannot write the admin's review message
    if new.review_message is distinct from old.review_message then
      new.review_message := old.review_message;
    end if;
    -- companies cannot write the applicants' terms snapshot either (audit G4)
    if new.reopen_snapshot is distinct from old.reopen_snapshot then
      new.reopen_snapshot := old.reopen_snapshot;
    end if;
    -- content is frozen once the job is under review, live, paused or closed
    if old.status not in ('draft', 'changes_requested') and (
         new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.responsibilities is distinct from old.responsibilities
      or new.requirements is distinct from old.requirements
      or new.skills is distinct from old.skills
      or new.role_family is distinct from old.role_family
      or new.seniority is distinct from old.seniority
      or new.english_level_required is distinct from old.english_level_required
      or new.employment_type is distinct from old.employment_type
      or new.work_mode is distinct from old.work_mode
      or new.contract_type is distinct from old.contract_type
      or new.hours_per_week is distinct from old.hours_per_week
      or new.timezone_overlap is distinct from old.timezone_overlap
      or new.start_date is distinct from old.start_date
      or new.salary_min_usd is distinct from old.salary_min_usd
      or new.salary_max_usd is distinct from old.salary_max_usd
      or new.show_salary is distinct from old.show_salary
      or new.confidential_company is distinct from old.confidential_company
      or new.slug is distinct from old.slug
    ) then
      raise exception 'job_locked_for_edit' using errcode = '42501';
    end if;
  end if;

  -- Withdrawing a live job to draft while applicants are in the running: remember the terms
  -- they applied to (decision 71). Same eight fields and key names as snapshotMaterialTerms
  -- in src/lib/jobs/material-terms.ts, so diffMaterialTerms reads it unchanged. Runs for
  -- every actor; whoever withdraws, the applicants keep their reference point.
  if tg_op = 'UPDATE'
     and new.status = 'draft'
     and old.status in ('published', 'paused', 'pending_review')
     and exists (
       select 1 from public.applications ap
        where ap.job_id = old.id
          and ap.status in ('applied', 'screening', 'shortlisted', 'interview', 'offer')
     ) then
    new.reopen_snapshot := jsonb_build_object(
      'salary_min_usd', old.salary_min_usd,
      'salary_max_usd', old.salary_max_usd,
      'contract_type', old.contract_type,
      'employment_type', old.employment_type,
      'seniority', old.seniority,
      'english_level_required', old.english_level_required,
      'work_mode', old.work_mode,
      'hours_per_week', old.hours_per_week
    );
  end if;

  return new;
end;
$function$;

-- public.refresh_profile_completeness
CREATE OR REPLACE FUNCTION public.refresh_profile_completeness()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_candidate uuid;
begin
  if tg_table_name = 'candidates' then
    v_candidate := new.id;
  elsif tg_op = 'DELETE' then
    v_candidate := old.candidate_id;
  else
    v_candidate := new.candidate_id;
  end if;
  update public.candidates
     set profile_completeness = private.compute_profile_completeness(v_candidate)
   where id = v_candidate
     and profile_completeness <> private.compute_profile_completeness(v_candidate);
  return null;
end;
$function$;
