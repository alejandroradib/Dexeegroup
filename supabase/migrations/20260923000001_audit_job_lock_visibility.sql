-- Audit fixes, phase A.
-- A3: a company cannot rewrite the content of a job once it has left draft / changes_requested.
-- A4: candidates.visibility = 'dexee_only' hides the candidate from hiring companies everywhere.

-- ---------------------------------------------------------------------------------------
-- A3. jobs_before_write: lock content columns for non-admin updates outside editable states.
--     Status-only changes (pause, resume, close, withdraw to draft) stay allowed, so a company
--     corrects a live job by withdrawing it to draft, editing and resubmitting.
-- ---------------------------------------------------------------------------------------
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
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- A4. company_can_view_candidate: the candidate must have opted into company visibility.
--     Every company read of candidates, candidate_cards (security invoker), experience,
--     education and candidate_valid_results goes through this function.
-- ---------------------------------------------------------------------------------------
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
      join public.candidates cand on cand.id = a.candidate_id
     where a.candidate_id = target_candidate_id
       and cand.visibility = 'visible_to_companies'
       and c.status <> 'suspended'
       and c.id in (select public.user_company_ids())
  );
$$;

-- The fit row is written for the company about the candidate; it follows the same gate.
drop policy if exists application_fit_company_select on public.application_fit;
create policy application_fit_company_select on public.application_fit for select to authenticated
  using (
    public.current_user_role() = 'company'
    and exists (
      select 1 from public.applications a
       where a.id = application_fit.application_id
         and public.company_can_view_candidate(a.candidate_id)
    )
  );
