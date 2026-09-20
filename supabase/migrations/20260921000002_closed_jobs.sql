-- Phase 9.5: a closed vacancy returned a bare 404, which throws away the inbound link and
-- leaves a visitor who followed a search result with nothing. This view backs a page that
-- says the role closed and points at the open ones, with no JobPosting markup on it.
--
-- Deliberately narrow: title, company and dates only. A closed listing does not need the
-- description, the salary or the requirements, and the less it exposes the better.

create view public.public_jobs_closed
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
  and (
    j.status in ('closed', 'paused')
    or (j.status = 'published' and j.closes_at is not null and j.closes_at <= now())
  );

grant select on public.public_jobs_closed to anon, authenticated;
