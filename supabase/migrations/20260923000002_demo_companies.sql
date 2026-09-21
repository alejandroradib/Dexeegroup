-- Audit fix, phase B: demo companies exist for walkthroughs inside a signed-in session and
-- must never reach public surfaces (job board, sitemap, Google indexing).

alter table public.companies
  add column if not exists is_demo boolean not null default false;

-- Only Dexee sets the flag; a company cannot flag or unflag itself.
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
       or new.owner_user_id <> old.owner_user_id
       or new.is_demo <> old.is_demo then
      raise exception 'company_fields_locked' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- Same columns as before, one more predicate.
create or replace view public.public_jobs
with (security_invoker = false) as
select
  j.id,
  j.title,
  j.slug,
  j.role_family,
  j.seniority,
  j.contract_type,
  j.employment_type,
  j.work_mode,
  j.english_level_required,
  j.skills,
  j.description,
  j.responsibilities,
  j.requirements,
  j.hours_per_week,
  j.timezone_overlap,
  j.start_date,
  case when j.show_salary then j.salary_min_usd end as salary_min_usd,
  case when j.show_salary then j.salary_max_usd end as salary_max_usd,
  j.show_salary,
  j.confidential_company,
  case when j.confidential_company then 'Confidential' else c.name end as company_name,
  case when j.confidential_company then null else c.logo_path end as company_logo_path,
  case when j.confidential_company then null else c.sector end as company_sector,
  case when j.confidential_company then null else c.size end as company_size,
  j.published_at,
  j.closes_at
from public.jobs j
join public.companies c on c.id = j.company_id
where j.status = 'published'
  and c.status <> 'suspended'
  and not c.is_demo
  and (j.closes_at is null or j.closes_at > now());

create or replace view public.public_jobs_closed
with (security_invoker = false) as
select
  j.id,
  j.title,
  j.slug,
  j.role_family,
  j.seniority,
  case when j.confidential_company then 'Confidential' else c.name end as company_name,
  j.published_at,
  coalesce(j.closes_at, j.updated_at) as closed_at
from public.jobs j
join public.companies c on c.id = j.company_id
where j.published_at is not null
  and c.status <> 'suspended'
  and not c.is_demo
  and (
    j.status in ('closed', 'paused')
    or (j.status = 'published' and j.closes_at is not null and j.closes_at <= now())
  );
