-- Row Level Security (SPEC 8)

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.jobs enable row level security;
alter table public.job_commercials enable row level security;
alter table public.candidates enable row level security;
alter table public.candidate_contacts enable row level security;
alter table public.candidate_experience enable row level security;
alter table public.candidate_education enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;
alter table public.notes enable row level security;
alter table public.saved_candidates enable row level security;
alter table public.placements enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_answers enable row level security;
alter table public.contact_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_activity enable row level security;
alter table public.data_requests enable row level security;
alter table public.email_outbox enable row level security;
alter table public.ai_usage enable row level security;

-- Admin: everything, on every table
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'companies', 'company_members', 'jobs', 'job_commercials', 'candidates',
    'candidate_contacts', 'candidate_experience', 'candidate_education', 'applications',
    'application_events', 'notes', 'saved_candidates', 'placements', 'assessments',
    'assessment_questions', 'assessment_attempts', 'assessment_answers', 'contact_requests',
    'notifications', 'admin_activity', 'data_requests', 'email_outbox', 'ai_usage'
  ] loop
    execute format('create policy %I on public.%I for all to authenticated
      using (public.is_admin()) with check (public.is_admin())', t || '_admin_all', t);
  end loop;
end;
$$;

-- profiles
create policy profiles_own_select on public.profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_own_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- companies
create policy companies_member_select on public.companies for select to authenticated
  using (id in (select public.user_company_ids()));
create policy companies_member_update on public.companies for update to authenticated
  using (id in (select public.user_company_ids()))
  with check (id in (select public.user_company_ids()));
create policy companies_owner_insert on public.companies for insert to authenticated
  with check (owner_user_id = auth.uid() and status = 'pending' and public.current_user_role() = 'company');

-- company_members
create policy company_members_select on public.company_members for select to authenticated
  using (company_id in (select public.user_company_ids()));
create policy company_members_owner_insert on public.company_members for insert to authenticated
  with check (public.is_company_owner(company_id) and role = 'member');
create policy company_members_owner_delete on public.company_members for delete to authenticated
  using (public.is_company_owner(company_id) and role = 'member');

-- jobs
create policy jobs_company_select on public.jobs for select to authenticated
  using (company_id in (select public.user_company_ids()));
create policy jobs_company_insert on public.jobs for insert to authenticated
  with check (company_id in (select public.user_company_ids()) and created_by = auth.uid());
create policy jobs_company_update on public.jobs for update to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));
create policy jobs_company_delete on public.jobs for delete to authenticated
  using (company_id in (select public.user_company_ids()) and status in ('draft', 'closed'));

-- candidates
create policy candidates_own_select on public.candidates for select to authenticated
  using (id = auth.uid());
create policy candidates_own_insert on public.candidates for insert to authenticated
  with check (id = auth.uid() and public.current_user_role() = 'candidate');
create policy candidates_own_update on public.candidates for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy candidates_company_select on public.candidates for select to authenticated
  using (public.current_user_role() = 'company' and public.company_can_view_candidate(id));

-- candidate_contacts
create policy candidate_contacts_own_all on public.candidate_contacts for all to authenticated
  using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());
create policy candidate_contacts_company_select on public.candidate_contacts for select to authenticated
  using (public.current_user_role() = 'company' and public.company_can_view_contact(candidate_id));

-- candidate_experience / candidate_education
create policy candidate_experience_own_all on public.candidate_experience for all to authenticated
  using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());
create policy candidate_experience_company_select on public.candidate_experience for select to authenticated
  using (public.current_user_role() = 'company' and public.company_can_view_candidate(candidate_id));
create policy candidate_education_own_all on public.candidate_education for all to authenticated
  using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());
create policy candidate_education_company_select on public.candidate_education for select to authenticated
  using (public.current_user_role() = 'company' and public.company_can_view_candidate(candidate_id));

-- applications
create policy applications_candidate_select on public.applications for select to authenticated
  using (candidate_id = auth.uid());
create policy applications_candidate_insert on public.applications for insert to authenticated
  with check (
    candidate_id = auth.uid()
    and public.current_user_role() = 'candidate'
    and source = 'candidate'
    and status = 'applied'
    and contact_released = false
    and public.job_is_published(job_id)
  );
create policy applications_candidate_update on public.applications for update to authenticated
  using (candidate_id = auth.uid())
  with check (candidate_id = auth.uid() and status = 'withdrawn');
create policy applications_company_select on public.applications for select to authenticated
  using (
    public.current_user_role() = 'company'
    and public.application_company_id(id) in (select public.user_company_ids())
    and public.company_can_view_candidate(candidate_id)
  );
create policy applications_company_update on public.applications for update to authenticated
  using (
    public.current_user_role() = 'company'
    and public.application_company_id(id) in (select public.user_company_ids())
    and public.company_can_view_candidate(candidate_id)
  )
  with check (
    public.application_company_id(id) in (select public.user_company_ids())
    and contact_released = false
  );

-- application_events
create policy application_events_candidate_select on public.application_events for select to authenticated
  using (exists (select 1 from public.applications a where a.id = application_id and a.candidate_id = auth.uid()));
create policy application_events_company_select on public.application_events for select to authenticated
  using (
    public.current_user_role() = 'company'
    and public.application_company_id(application_id) in (select public.user_company_ids())
  );

-- notes
create policy notes_company_select on public.notes for select to authenticated
  using (
    public.current_user_role() = 'company'
    and visibility = 'company'
    and application_id is not null
    and public.application_company_id(application_id) in (select public.user_company_ids())
  );
create policy notes_company_insert on public.notes for insert to authenticated
  with check (
    public.current_user_role() = 'company'
    and visibility = 'company'
    and author_user_id = auth.uid()
    and application_id is not null
    and public.application_company_id(application_id) in (select public.user_company_ids())
  );

-- saved_candidates
create policy saved_candidates_company_all on public.saved_candidates for all to authenticated
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()) and public.company_can_view_candidate(candidate_id));

-- assessments (candidates see active ones)
create policy assessments_candidate_select on public.assessments for select to authenticated
  using (is_active = true and public.current_user_role() = 'candidate');

-- assessment_questions: no non-admin policy; served through the view

-- assessment_attempts
create policy attempts_candidate_select on public.assessment_attempts for select to authenticated
  using (candidate_id = auth.uid());
create policy attempts_candidate_insert on public.assessment_attempts for insert to authenticated
  with check (candidate_id = auth.uid() and status = 'in_progress' and public.current_user_role() = 'candidate');
create policy attempts_candidate_update on public.assessment_attempts for update to authenticated
  using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

-- assessment_answers
create policy answers_candidate_select on public.assessment_answers for select to authenticated
  using (public.candidate_owns_attempt(attempt_id));
create policy answers_candidate_insert on public.assessment_answers for insert to authenticated
  with check (public.attempt_is_open(attempt_id));
create policy answers_candidate_update on public.assessment_answers for update to authenticated
  using (public.attempt_is_open(attempt_id)) with check (public.attempt_is_open(attempt_id));

-- notifications
create policy notifications_own_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- data_requests
create policy data_requests_own_select on public.data_requests for select to authenticated
  using (candidate_id = auth.uid());
create policy data_requests_own_insert on public.data_requests for insert to authenticated
  with check (candidate_id = auth.uid() and status = 'open');

-- assessment_questions has no candidate policy: candidates read the
-- assessment_questions_public view (security definer, strips answer_key).

-- anon never touches base tables
revoke all on all tables in schema public from anon;
grant select on public.public_jobs to anon;
