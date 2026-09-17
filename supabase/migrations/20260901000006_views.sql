-- Views (SPEC 7.3)

-- Published jobs for anonymous visitors. Security definer: hides everything the
-- public should not see (confidential company, hidden salary, internal fields).
create view public.public_jobs
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
  and (j.closes_at is null or j.closes_at > now());

grant select on public.public_jobs to anon, authenticated;

-- Questions without answer keys, for candidates taking an assessment.
-- Security definer so the base table needs no candidate policy (the key never leaves it).
create view public.assessment_questions_public
with (security_invoker = false) as
select
  q.id, q.assessment_id, q.section, q.band, q.sort_order, q.prompt, q.question_type,
  q.options, q.weight, q.factor, q.is_active, q.created_at
from public.assessment_questions q
where q.is_active = true;

grant select on public.assessment_questions_public to authenticated;

-- Candidate card: what a company is allowed to see before contact release.
create view public.candidate_cards
with (security_invoker = true) as
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
from public.candidates c;

grant select on public.candidate_cards to authenticated;
