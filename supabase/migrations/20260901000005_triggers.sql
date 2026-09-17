-- Triggers: updated_at, auth sync, slugs, guards, events, completeness, level sync

-- updated_at on every table that has the column
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'companies', 'jobs', 'job_commercials', 'candidates', 'candidate_contacts',
    'applications', 'placements', 'assessment_attempts'
  ] loop
    execute format('create trigger %I_set_updated_at before update on public.%I
      for each row execute function public.set_updated_at()', t, t);
  end loop;
end;
$$;

-- profiles row for every auth user; only company or candidate may self-register
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_locale public.locale;
begin
  v_role := case coalesce(new.raw_user_meta_data ->> 'role', '')
    when 'company' then 'company'::public.user_role
    else 'candidate'::public.user_role end;
  v_locale := case coalesce(new.raw_user_meta_data ->> 'locale', '')
    when 'es' then 'es'::public.locale else 'en'::public.locale end;
  insert into public.profiles (id, role, full_name, email, locale)
  values (new.id, v_role, new.raw_user_meta_data ->> 'full_name', coalesce(new.email, ''), v_locale)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- profiles: non-admins may change only full_name, locale and notification_prefs
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role <> old.role or new.email <> old.email or new.id <> old.id then
      raise exception 'profile_fields_locked' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- companies: only admins change status, verification and ownership
create or replace function public.guard_company_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.status <> old.status
       or coalesce(new.verified_at, 'epoch') <> coalesce(old.verified_at, 'epoch')
       or coalesce(new.verified_by, '00000000-0000-0000-0000-000000000000') <> coalesce(old.verified_by, '00000000-0000-0000-0000-000000000000')
       or new.owner_user_id <> old.owner_user_id then
      raise exception 'company_fields_locked' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger companies_guard before update on public.companies
  for each row execute function public.guard_company_update();

-- owner membership row created with the company
create or replace function public.create_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.company_members (company_id, user_id, role, accepted_at)
  values (new.id, new.owner_user_id, 'owner', now())
  on conflict (company_id, user_id) do nothing;
  return new;
end;
$$;

create trigger companies_owner_membership after insert on public.companies
  for each row execute function public.create_owner_membership();

-- jobs: slug, publish guard, published_at, review_message reset
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
  end if;
  return new;
end;
$$;

create trigger jobs_before_write before insert or update on public.jobs
  for each row execute function public.jobs_before_write();

-- applications: candidate can only withdraw; company can move status and request contact
create or replace function public.guard_application_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  v_role := public.current_user_role();

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
$$;

create trigger applications_guard before update on public.applications
  for each row execute function public.guard_application_update();

-- applications: log every status change
create or replace function public.log_application_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_events (application_id, from_status, to_status, actor_user_id)
    values (new.id, null, new.status, auth.uid());
  elsif new.status <> old.status then
    insert into public.application_events (application_id, from_status, to_status, actor_user_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger applications_log_event after insert or update on public.applications
  for each row execute function public.log_application_event();

-- notifications: users may only mark as read
create or replace function public.guard_notification_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.user_id <> old.user_id or new.type <> old.type or new.title <> old.title
       or new.body is distinct from old.body or new.link is distinct from old.link then
      raise exception 'notification_fields_locked' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger notifications_guard before update on public.notifications
  for each row execute function public.guard_notification_update();

-- candidates: recompute completeness; non-admins cannot set assessment levels or tags
create or replace function public.guard_candidate_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
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
$$;

create trigger candidates_guard before update on public.candidates
  for each row execute function public.guard_candidate_update();

create or replace function public.refresh_profile_completeness()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
     set profile_completeness = public.compute_profile_completeness(v_candidate)
   where id = v_candidate
     and profile_completeness <> public.compute_profile_completeness(v_candidate);
  return null;
end;
$$;

create trigger candidates_completeness after insert or update on public.candidates
  for each row execute function public.refresh_profile_completeness();
create trigger candidate_contacts_completeness after insert or update or delete on public.candidate_contacts
  for each row execute function public.refresh_profile_completeness();
create trigger candidate_experience_completeness after insert or update or delete on public.candidate_experience
  for each row execute function public.refresh_profile_completeness();
create trigger candidate_education_completeness after insert or update or delete on public.candidate_education
  for each row execute function public.refresh_profile_completeness();

-- assessment attempts: cooldown and single open attempt on insert; candidates may only toggle visibility
create or replace function public.attempts_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next timestamptz;
  v_limit int;
begin
  if exists (
    select 1 from public.assessment_attempts t
     where t.assessment_id = new.assessment_id and t.candidate_id = new.candidate_id
       and t.status = 'in_progress'
  ) then
    raise exception 'attempt_already_open' using errcode = 'P0001';
  end if;
  v_next := public.assessment_cooldown_ok(new.assessment_id, new.candidate_id);
  if v_next is not null then
    raise exception 'cooldown_active:%', to_char(v_next at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      using errcode = 'P0001';
  end if;
  if new.expires_at is null then
    select time_limit_minutes into v_limit from public.assessments where id = new.assessment_id;
    if v_limit is not null then
      new.expires_at := new.started_at + make_interval(mins => v_limit);
    end if;
  end if;
  return new;
end;
$$;

create trigger attempts_before_insert before insert on public.assessment_attempts
  for each row execute function public.attempts_before_insert();

create or replace function public.guard_attempt_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
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
$$;

create trigger attempts_guard before update on public.assessment_attempts
  for each row execute function public.guard_attempt_update();

-- sync candidate levels after validation
create or replace function public.sync_candidate_english_levels()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type public.assessment_type;
  v_written public.cefr_level;
  v_oral public.cefr_level;
begin
  if new.status <> 'validated' or (tg_op = 'UPDATE' and old.status = 'validated' and old.final_level is not distinct from new.final_level) then
    return new;
  end if;
  select type into v_type from public.assessments where id = new.assessment_id;

  if v_type = 'english_written' then
    update public.candidates set english_written_level = new.final_level where id = new.candidate_id;
  elsif v_type = 'english_oral' then
    update public.candidates set english_oral_level = new.final_level where id = new.candidate_id;
  elsif v_type = 'psychometric' then
    update public.candidates set psychometric_completed_at = coalesce(new.validated_at, now()) where id = new.candidate_id;
    return new;
  end if;

  select english_written_level, english_oral_level into v_written, v_oral
    from public.candidates where id = new.candidate_id;
  if v_written is not null and v_oral is not null then
    update public.candidates
       set english_verified_level = public.cefr_min(v_written, v_oral),
           english_verified_at = now()
     where id = new.candidate_id;
  end if;
  return new;
end;
$$;

create trigger attempts_sync_levels after insert or update on public.assessment_attempts
  for each row execute function public.sync_candidate_english_levels();
