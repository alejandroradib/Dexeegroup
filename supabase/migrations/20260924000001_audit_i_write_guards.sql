-- Audit I, block 1: write guards on candidate-owned tables (DECISIONS 93).
--
-- Every guard lets admins and the service role through (auth.uid() is null for the service
-- role; private.is_admin() covers admins) and constrains what an authenticated non-admin
-- user can write. Where a legitimate flow wrote a protected column from the user's client,
-- the corresponding server action moved to the service role with an explicit ownership check
-- (see confirmAudioUpload).

-- ---------------------------------------------------------------------------------------
-- 1. candidates: the server creates the row with the service role at sign-up, so the
--    candidate needs no insert policy. The guard now runs on insert too, as a backstop.
-- ---------------------------------------------------------------------------------------
drop policy if exists candidates_own_insert on public.candidates;

drop trigger if exists candidates_guard on public.candidates;
drop function if exists public.guard_candidate_update();

create or replace function public.guard_candidate_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not private.is_admin() then
    if tg_op = 'INSERT' then
      new.english_written_level := null;
      new.english_oral_level := null;
      new.english_verified_level := null;
      new.english_verified_at := null;
      new.psychometric_completed_at := null;
      new.candidate_tags := '{}';
      new.profile_completeness := 0;
    else
      new.english_written_level := old.english_written_level;
      new.english_oral_level := old.english_oral_level;
      new.english_verified_level := old.english_verified_level;
      new.english_verified_at := old.english_verified_at;
      new.psychometric_completed_at := old.psychometric_completed_at;
      new.candidate_tags := old.candidate_tags;
      new.profile_completeness := old.profile_completeness;
      new.data_consent_at := old.data_consent_at;
      new.data_consent_version := old.data_consent_version;
    end if;
  end if;
  return new;
end;
$$;

create trigger candidates_guard before insert or update on public.candidates
  for each row execute function public.guard_candidate_write();

-- ---------------------------------------------------------------------------------------
-- 2. assessment_attempts: a candidate's insert carries nothing but the assessment and their
--    own id. Timing, question set, integrity, visibility and every result column are
--    server-owned. The single-open-attempt and cooldown rules stay as they were.
-- ---------------------------------------------------------------------------------------
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
  if auth.uid() is not null and not private.is_admin() then
    new.status := 'in_progress';
    new.started_at := now();
    new.expires_at := null;
    new.submitted_at := null;
    new.question_ids := '{}';
    new.ai_result := null;
    new.ai_level := null;
    new.final_level := null;
    new.final_score := null;
    new.report := null;
    new.integrity := '{"tab_leaves": 0, "submitted_after_expiry": false}'::jsonb;
    new.processing_attempts := 0;
    new.validated_by := null;
    new.validated_at := null;
    new.validation_comment := null;
    new.valid_until := null;
    new.visible_to_companies := false;
    new.cooldown_waived := false;
  end if;
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

-- ---------------------------------------------------------------------------------------
-- 3. assessment_answers: the candidate writes their answer to a question that belongs to
--    the attempt, nothing else. Transcript, model feedback and duration come from the
--    server; an audio path must sit under the attempt's own folder, so a signed URL can never
--    point at another candidate's recording.
-- ---------------------------------------------------------------------------------------
create or replace function public.guard_answer_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question_ids uuid[];
begin
  if auth.uid() is not null and not private.is_admin() then
    select t.question_ids into v_question_ids
      from public.assessment_attempts t where t.id = new.attempt_id;
    if v_question_ids is null or not (new.question_id = any (v_question_ids)) then
      raise exception 'question_not_in_attempt' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' then
      new.transcript := null;
      new.ai_feedback := null;
      new.audio_duration_seconds := null;
    else
      new.transcript := old.transcript;
      new.ai_feedback := old.ai_feedback;
      new.audio_duration_seconds := old.audio_duration_seconds;
    end if;
    if new.audio_path is not null
       and new.audio_path !~ ('^attempts/' || new.attempt_id::text || '/[A-Za-z0-9_-]+\.[a-z0-9]+$') then
      raise exception 'audio_path_invalid' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists answers_guard on public.assessment_answers;
create trigger answers_guard before insert or update on public.assessment_answers
  for each row execute function public.guard_answer_write();

-- Same ceiling as the zod schema in the server action.
alter table public.assessment_answers
  drop constraint if exists assessment_answers_text_length;
alter table public.assessment_answers
  add constraint assessment_answers_text_length
  check (answer_text is null or length(answer_text) <= 6000);

-- ---------------------------------------------------------------------------------------
-- 4. candidate_contacts.resume_path: null or under the candidate's own folder. Enforced on
--    any change of the value, for every writer, so a stored path can never name another
--    candidate's file. Unchanged legacy values are left alone.
-- ---------------------------------------------------------------------------------------
create or replace function public.guard_candidate_contact_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.resume_path is not null
     and (tg_op = 'INSERT' or new.resume_path is distinct from old.resume_path)
     and new.resume_path not like 'candidates/' || new.candidate_id::text || '/%' then
    raise exception 'resume_path_invalid' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists candidate_contacts_guard on public.candidate_contacts;
create trigger candidate_contacts_guard before insert or update on public.candidate_contacts
  for each row execute function public.guard_candidate_contact_write();

-- ---------------------------------------------------------------------------------------
-- 5. mock_interviews: everything the grader reads or the runner trusts starts from its
--    default for a candidate's insert, not just the transcript.
-- ---------------------------------------------------------------------------------------
create or replace function public.guard_mock_interview_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not private.is_admin() then
    new.status := 'in_progress';
    new.questions := '[]'::jsonb;
    new.answers := '{}'::jsonb;
    new.report := null;
    new.overall_score := null;
    new.started_at := now();
    new.expires_at := now() + interval '2 hours';
    new.completed_at := null;
    new.processing_attempts := 0;
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

-- ---------------------------------------------------------------------------------------
-- 6. Companies never read the candidates table. candidate_cards becomes a definer view
--    that applies the access rule itself and exposes only card columns; the services
--    already read through it.
-- ---------------------------------------------------------------------------------------
drop policy if exists candidates_company_select on public.candidates;

drop view if exists public.candidate_cards;
create view public.candidate_cards as
select
  c.id,
  c.first_name,
  left(c.last_name, 1) as last_initial,
  c.headline,
  c.summary,
  c.city,
  c.country,
  c.years_experience,
  c.role_family,
  c.skills,
  c.desired_roles,
  c.desired_salary_min_usd,
  c.availability,
  c.preferred_contract_types,
  c.english_self_level,
  c.english_written_level,
  c.english_oral_level,
  c.english_verified_level,
  c.english_verified_at,
  c.psychometric_completed_at,
  c.profile_completeness,
  c.visibility,
  c.created_at
from public.candidates c
where private.is_admin()
   or c.id = auth.uid()
   or (private.current_user_role() = 'company' and private.company_can_view_candidate(c.id));

grant select on public.candidate_cards to authenticated;

-- ---------------------------------------------------------------------------------------
-- 7. Smaller guards.
-- ---------------------------------------------------------------------------------------
-- 7a. A candidate may ask about their own cooldown only.
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
  if auth.uid() is not null and target_candidate_id <> auth.uid() and not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
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

-- 7b. A company note names the candidate of the application it is attached to.
create or replace function private.application_candidate_id(target_application_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select a.candidate_id from public.applications a where a.id = target_application_id;
$$;
grant execute on function private.application_candidate_id(uuid) to authenticated;

drop policy if exists notes_company_insert on public.notes;
create policy notes_company_insert on public.notes for insert to authenticated
  with check (
    private.current_user_role() = 'company'
    and visibility = 'company'
    and author_user_id = auth.uid()
    and application_id is not null
    and private.application_company_id(application_id) in (select private.user_company_ids())
    and candidate_id = private.application_candidate_id(application_id)
  );

-- 7c. An owner inserts invitations only: no user attached, not accepted, with email and token.
drop policy if exists company_members_owner_insert on public.company_members;
create policy company_members_owner_insert on public.company_members for insert to authenticated
  with check (
    private.is_company_owner(company_id)
    and role = 'member'
    and user_id is null
    and accepted_at is null
    and invited_email is not null
    and invite_token is not null
  );

-- 7d. SVG can carry script; logos are raster only.
update storage.buckets
   set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
 where id = 'logos';

-- 7e. Company websites are http(s) URLs or empty. Bare domains already stored get a scheme.
update public.companies
   set website = 'https://' || website
 where website is not null
   and website <> ''
   and website !~* '^[a-z][a-z0-9+.-]*://';
alter table public.companies
  drop constraint if exists companies_website_scheme;
alter table public.companies
  add constraint companies_website_scheme
  check (website is null or website = '' or website ~* '^https?://\S+$');
