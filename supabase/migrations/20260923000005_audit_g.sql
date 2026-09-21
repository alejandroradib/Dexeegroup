-- Audit fixes, phase G (CORRECCIONES-3).
--
-- G1. The public questions view is removed. It was security definer, filtered only by
--     is_active and granted to every authenticated user, so any free account could download
--     the whole active bank in one PostgREST call, keys excluded but reconstructible. The
--     application never read it: every question read goes through the service client,
--     limited to attempt.question_ids (assessments.ts). Nothing replaces it.
drop view if exists public.assessment_questions_public;

-- G3. The outbox stops reporting as sent what never left. Without a provider a row is parked
--     as 'skipped' with last_error = 'no_provider' and no sent_at; processOutbox requeues
--     those rows once a provider is configured.
alter table public.email_outbox drop constraint if exists email_outbox_status_check;
alter table public.email_outbox
  add constraint email_outbox_status_check
  check (status in ('pending', 'sent', 'failed', 'skipped'));

-- G4. The material-terms snapshot belongs to the trigger, not to the company. A company
--     could withdraw a job, null the snapshot with its own JWT and resubmit with no notice
--     to applicants. Now: any transition from a live state to draft with applicants in the
--     running captures the snapshot from OLD, and a non-admin update can never change it.
--     Only the service role (no auth.uid()) clears it, after the notice is sent.
create or replace function public.jobs_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_status public.company_status;
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.slugify(new.title) || '-' || left(replace(new.id::text, '-', ''), 6);
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if auth.uid() is not null and not public.is_admin() then
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

  if tg_op = 'UPDATE' and auth.uid() is not null and not public.is_admin() then
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
$$;
