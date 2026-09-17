-- Access helper functions (SPEC 7.3). All security definer, stable, search_path pinned.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Named current_user_role() because current_role is a reserved word in SQL.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.user_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id from public.companies c where c.owner_user_id = auth.uid()
  union
  select m.company_id from public.company_members m
   where m.user_id = auth.uid() and m.accepted_at is not null;
$$;

create or replace function public.is_company_owner(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.companies c
     where c.id = target_company_id and c.owner_user_id = auth.uid()
  );
$$;

create or replace function public.company_can_view_candidate(target_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.companies c on c.id = j.company_id
     where a.candidate_id = target_candidate_id
       and c.status <> 'suspended'
       and c.id in (select public.user_company_ids())
  );
$$;

create or replace function public.company_can_view_contact(target_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.companies c on c.id = j.company_id
     where a.candidate_id = target_candidate_id
       and a.contact_released = true
       and c.status <> 'suspended'
       and c.id in (select public.user_company_ids())
  );
$$;

-- True when the job accepts applications. Used by candidate insert policies,
-- which cannot read public.jobs directly.
create or replace function public.job_is_published(target_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.jobs j
      join public.companies c on c.id = j.company_id
     where j.id = target_job_id and j.status = 'published' and c.status <> 'suspended'
  );
$$;

-- The company that owns an application's job, for company-side policies.
create or replace function public.application_company_id(target_application_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select j.company_id from public.applications a join public.jobs j on j.id = a.job_id
   where a.id = target_application_id;
$$;

create or replace function public.candidate_owns_attempt(target_attempt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.assessment_attempts t
     where t.id = target_attempt_id and t.candidate_id = auth.uid()
  );
$$;

create or replace function public.attempt_is_open(target_attempt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.assessment_attempts t
     where t.id = target_attempt_id
       and t.candidate_id = auth.uid()
       and t.status = 'in_progress'
       and (t.expires_at is null or t.expires_at + interval '60 seconds' > now())
  );
$$;

-- Returns the next date a candidate may start the assessment, or null when allowed now.
create or replace function public.assessment_cooldown_ok(target_assessment_id uuid, target_candidate_id uuid)
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cooldown int;
  v_last timestamptz;
  v_next timestamptz;
begin
  select cooldown_days into v_cooldown from public.assessments where id = target_assessment_id;
  if v_cooldown is null then
    return null;
  end if;
  select max(coalesce(t.submitted_at, t.started_at)) into v_last
    from public.assessment_attempts t
   where t.assessment_id = target_assessment_id
     and t.candidate_id = target_candidate_id
     and t.cooldown_waived = false
     and t.status in ('submitted', 'processing', 'ai_scored', 'pending_validation', 'validated');
  if v_last is null then
    return null;
  end if;
  v_next := v_last + make_interval(days => v_cooldown);
  if v_next <= now() then
    return null;
  end if;
  return v_next;
end;
$$;

-- Profile completeness 0-100 (SPEC 7.3 weights)
create or replace function public.compute_profile_completeness(target_candidate_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.candidates%rowtype;
  score int := 0;
  has_resume boolean;
begin
  select * into c from public.candidates where id = target_candidate_id;
  if not found then
    return 0;
  end if;
  if coalesce(c.first_name, '') <> '' and coalesce(c.last_name, '') <> '' and coalesce(c.headline, '') <> '' then
    score := score + 15;
  end if;
  if coalesce(c.summary, '') <> '' then
    score := score + 10;
  end if;
  if exists (select 1 from public.candidate_experience e where e.candidate_id = c.id) then
    score := score + 20;
  end if;
  if exists (select 1 from public.candidate_education e where e.candidate_id = c.id) then
    score := score + 10;
  end if;
  if coalesce(array_length(c.skills, 1), 0) >= 3 then
    score := score + 15;
  end if;
  if c.english_self_level is not null then
    score := score + 10;
  end if;
  if c.desired_salary_min_usd is not null and c.availability is not null then
    score := score + 10;
  end if;
  select coalesce(cc.resume_path, '') <> '' into has_resume
    from public.candidate_contacts cc where cc.candidate_id = c.id;
  if coalesce(has_resume, false) then
    score := score + 10;
  end if;
  return least(score, 100);
end;
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.user_company_ids() to authenticated;
grant execute on function public.is_company_owner(uuid) to authenticated;
grant execute on function public.company_can_view_candidate(uuid) to authenticated;
grant execute on function public.company_can_view_contact(uuid) to authenticated;
grant execute on function public.job_is_published(uuid) to authenticated, anon;
grant execute on function public.application_company_id(uuid) to authenticated;
grant execute on function public.candidate_owns_attempt(uuid) to authenticated;
grant execute on function public.attempt_is_open(uuid) to authenticated;
grant execute on function public.assessment_cooldown_ok(uuid, uuid) to authenticated;
grant execute on function public.compute_profile_completeness(uuid) to authenticated;
