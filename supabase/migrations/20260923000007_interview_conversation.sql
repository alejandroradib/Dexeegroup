-- Conversational practice interview (DECISIONS 92).
--
-- The interview becomes a turn-by-turn conversation with an AI interviewer, optionally tied
-- to a job the candidate applied to. The transcript is authored by the server (service role):
-- the candidate never writes it directly, so a forged interviewer turn cannot reach the
-- grader. `questions`/`answers` stay for rows created by the previous six-question runner.

alter table public.mock_interviews
  add column if not exists job_id uuid references public.jobs (id) on delete set null,
  add column if not exists transcript jsonb not null default '[]'::jsonb,
  add column if not exists candidate_turns int not null default 0;

create index if not exists mock_interviews_job_idx on public.mock_interviews (job_id)
  where job_id is not null;

-- Non-admin users may still only write `answers` while the interview is open. The new
-- columns are frozen for them like `questions` and `report` already were.
create or replace function public.guard_mock_interview_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    new.job_id := old.job_id;
    new.transcript := old.transcript;
    new.candidate_turns := old.candidate_turns;
  end if;
  return new;
end;
$$;

-- A candidate may only tie an interview to a job they can see: published, or one they applied to.
create or replace function public.guard_mock_interview_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not private.is_admin() then
    new.transcript := '[]'::jsonb;
    new.candidate_turns := 0;
    if new.job_id is not null and not exists (
      select 1 from public.jobs j
       where j.id = new.job_id
         and (j.status = 'published'
              or exists (select 1 from public.applications a
                          where a.job_id = j.id and a.candidate_id = auth.uid()))
    ) then
      raise exception 'job_not_visible' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists mock_interviews_guard_insert on public.mock_interviews;
create trigger mock_interviews_guard_insert before insert on public.mock_interviews
  for each row execute function public.guard_mock_interview_insert();
