-- Phase 10: mandatory assessments with a validity window, a resume requirement enforced in
-- the database, valid results exposed to the hiring company, and the fit analysis store.

-- ---------------------------------------------------------------------------------------
-- 1. Assessments: validity window and the "required to apply" flag
-- ---------------------------------------------------------------------------------------
alter table public.assessments
  add column if not exists validity_days int not null default 90
    check (validity_days between 1 and 90),
  add column if not exists required_to_apply boolean not null default false;

-- The DISC-style profile. Inactive until its question bank is loaded in the environment.
insert into public.assessments (id, type, title, description, version, is_active, time_limit_minutes, cooldown_days, config)
values
  ('aa000000-0000-4000-8000-000000000004', 'disc', 'DISC work profile',
   'Twenty-eight statements about how you act at work, across four styles. No time limit.',
   1, false, 1440, 90,
   '{"styles": ["D", "I", "S", "C"], "items_per_style": 7, "bands": {"low_below": 40, "high_above": 60}}')
on conflict (id) do nothing;

-- The four free assessments are required before a candidate can apply.
update public.assessments
   set required_to_apply = true
 where type in ('english_written', 'english_oral', 'psychometric', 'disc');

-- ---------------------------------------------------------------------------------------
-- 2. Attempts: valid_until, stamped when a result is validated
-- ---------------------------------------------------------------------------------------
alter table public.assessment_attempts
  add column if not exists valid_until timestamptz;

create index if not exists assessment_attempts_valid_idx
  on public.assessment_attempts (candidate_id, assessment_id, valid_until desc)
  where status = 'validated';

create or replace function public.set_attempt_validity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days int;
  v_type public.assessment_type;
begin
  if new.status = 'validated' and new.valid_until is null then
    select validity_days, type into v_days, v_type from public.assessments where id = new.assessment_id;
    new.validated_at := coalesce(new.validated_at, now());
    new.valid_until := new.validated_at + make_interval(days => coalesce(v_days, 90));
    -- Work-style descriptors feed the company's fit report, so they are shared by default.
    -- The candidate keeps the toggle to hide them (guard_attempt_update allows that column).
    if tg_op = 'INSERT' or old.status <> 'validated' then
      if v_type in ('psychometric', 'disc') then
        new.visible_to_companies := true;
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Named to sort after attempts_guard, which resets every column but visibility for
-- non-admin callers; validity must be stamped on the row that guard lets through.
create trigger attempts_set_validity before insert or update on public.assessment_attempts
  for each row execute function public.set_attempt_validity();

update public.assessment_attempts a
   set valid_until = a.validated_at + make_interval(days => s.validity_days)
  from public.assessments s
 where s.id = a.assessment_id
   and a.status = 'validated'
   and a.validated_at is not null
   and a.valid_until is null;

-- ---------------------------------------------------------------------------------------
-- 3. What a candidate still needs before applying: one source of truth for the trigger
--    and for the UI checklist.
-- ---------------------------------------------------------------------------------------
create or replace function public.candidate_apply_requirements(target_candidate_id uuid)
returns table (requirement text, satisfied boolean, valid_until timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and auth.uid() <> target_candidate_id
     and not public.is_admin() then
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
$$;

-- Enforced here, not only in the UI: candidates hold an insert policy on applications and
-- could post through the API directly.
create or replace function public.applications_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_missing text;
begin
  if new.source = 'candidate' and auth.uid() is not null and not public.is_admin() then
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
$$;

create trigger applications_before_insert before insert on public.applications
  for each row execute function public.applications_before_insert();

-- ---------------------------------------------------------------------------------------
-- 4. Valid results a company may see for an applicant. Numeric scores never leave; a level,
--    the dates, and band descriptors when the candidate shares them.
-- ---------------------------------------------------------------------------------------
create or replace function public.candidate_valid_results(target_candidate_id uuid)
returns table (
  type public.assessment_type,
  final_level public.cefr_level,
  validated_at timestamptz,
  valid_until timestamptz,
  bands jsonb
)
language sql
stable
security definer
set search_path = public
as $$
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
       or public.is_admin()
       or (public.current_user_role() = 'company' and public.company_can_view_candidate(target_candidate_id))
     )
   order by s.type, t.validated_at desc;
$$;

-- ---------------------------------------------------------------------------------------
-- 5. Fit analysis per application. Written by the server only; read by the hiring company.
-- ---------------------------------------------------------------------------------------
create table public.application_fit (
  application_id uuid primary key references public.applications (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed', 'skipped')),
  score int check (score is null or score between 0 and 100),
  summary text,
  strengths text[] not null default '{}',
  gaps text[] not null default '{}',
  evidence jsonb not null default '{}'::jsonb,
  model text,
  prompt_version text,
  inputs_hash text,
  attempts int not null default 0,
  last_error text,
  computed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index application_fit_status_idx on public.application_fit (status, updated_at);

create trigger application_fit_set_updated_at before update on public.application_fit
  for each row execute function public.set_updated_at();

alter table public.application_fit enable row level security;
-- The blanket revoke in 20260901000007 predates this table; default privileges would
-- otherwise hand anon a SELECT that RLS turns into an empty result instead of a refusal.
revoke all on public.application_fit from anon;

create policy application_fit_admin_all on public.application_fit for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- The subquery runs under the caller's own policies on applications, so a company sees a
-- fit row exactly when it may see the application behind it. Candidates have no policy:
-- the analysis is written for the company, not for them.
create policy application_fit_company_select on public.application_fit for select to authenticated
  using (
    public.current_user_role() = 'company'
    and exists (select 1 from public.applications a where a.id = application_fit.application_id)
  );

-- ---------------------------------------------------------------------------------------
-- 6. Grants, following 20260918000002_function_grants.sql
-- ---------------------------------------------------------------------------------------
revoke execute on function public.set_attempt_validity() from public, anon, authenticated;
revoke execute on function public.applications_before_insert() from public, anon, authenticated;
revoke execute on function public.candidate_apply_requirements(uuid) from public, anon;
grant execute on function public.candidate_apply_requirements(uuid) to authenticated;
revoke execute on function public.candidate_valid_results(uuid) from public, anon;
grant execute on function public.candidate_valid_results(uuid) to authenticated;
