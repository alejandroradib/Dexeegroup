-- Incorporations from the MVP document: granular consents, AI mock interview, candidate country filter.

-- Granular consent flags captured at sign-up (terms, data policy, job contact, aggregated analytics)
alter table public.candidates
  add column if not exists consent_flags jsonb not null default '{}'::jsonb;

-- AI mock interview: free practice tool that produces a feedback report and soft-skill scores for Dexee
create type public.interview_status as enum ('in_progress', 'completed', 'failed', 'expired');

create table public.mock_interviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  role_family public.role_family not null,
  language public.locale not null default 'es',
  status public.interview_status not null default 'in_progress',
  questions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  report jsonb,
  overall_score numeric(4,1),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours',
  completed_at timestamptz,
  processing_attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mock_interviews_candidate_idx on public.mock_interviews (candidate_id, status, created_at desc);
create unique index mock_interviews_one_open on public.mock_interviews (candidate_id) where status = 'in_progress';

create trigger mock_interviews_set_updated_at before update on public.mock_interviews
  for each row execute function public.set_updated_at();

-- Candidates may only write their answers while the interview is open; scoring is server-side.
create or replace function public.guard_mock_interview_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
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
$$;

create trigger mock_interviews_guard before update on public.mock_interviews
  for each row execute function public.guard_mock_interview_update();

alter table public.mock_interviews enable row level security;

create policy mock_interviews_admin_all on public.mock_interviews for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy mock_interviews_own_select on public.mock_interviews for select to authenticated
  using (candidate_id = auth.uid());
create policy mock_interviews_own_insert on public.mock_interviews for insert to authenticated
  with check (candidate_id = auth.uid() and status = 'in_progress' and public.current_user_role() = 'candidate');
create policy mock_interviews_own_update on public.mock_interviews for update to authenticated
  using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

revoke all on table public.mock_interviews from anon;

create index candidates_country_idx on public.candidates (country);
