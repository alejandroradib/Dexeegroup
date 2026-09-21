-- Audit fixes, phase D.
-- D2: released contact details follow the candidate's visibility choice.
-- D4: applicants keep seeing the job behind their application whatever its status, and the
--     company records the material terms when it withdraws a live job to edit it.

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
      join public.candidates cand on cand.id = a.candidate_id
     where a.candidate_id = target_candidate_id
       and a.contact_released = true
       and cand.visibility = 'visible_to_companies'
       and c.status <> 'suspended'
       and c.id in (select public.user_company_ids())
  );
$$;

-- Material terms at the moment a live job was withdrawn to draft; null otherwise.
alter table public.jobs
  add column if not exists reopen_snapshot jsonb;

-- The jobs behind the calling candidate's applications: title, slug, company (respecting
-- confidentiality), contract type and status. Security definer because public_jobs only
-- carries published jobs and a candidate has no policy on jobs.
create or replace function public.candidate_application_jobs()
returns table (
  id uuid,
  title text,
  slug text,
  company_name text,
  confidential_company boolean,
  contract_type public.contract_type,
  status public.job_status
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct
         j.id,
         j.title,
         j.slug,
         case when j.confidential_company then 'Confidential' else c.name end as company_name,
         j.confidential_company,
         j.contract_type,
         j.status
    from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.companies c on c.id = j.company_id
   where a.candidate_id = auth.uid();
$$;

revoke execute on function public.candidate_application_jobs() from public, anon;
grant execute on function public.candidate_application_jobs() to authenticated;
