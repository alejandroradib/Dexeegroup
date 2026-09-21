-- Audit fixes, phase C.
-- C1: `factor` duplicates the scoring key for the Likert instruments; it leaves the public view.
-- C7: team invitations expire.

-- Postgres cannot drop a column through create or replace view, so the view is recreated.
drop view if exists public.assessment_questions_public;
create view public.assessment_questions_public
with (security_invoker = false) as
select
  q.id, q.assessment_id, q.section, q.band, q.sort_order, q.prompt, q.question_type,
  q.options, q.weight, q.is_active, q.created_at
from public.assessment_questions q
where q.is_active = true;

grant select on public.assessment_questions_public to authenticated;
revoke all on public.assessment_questions_public from anon;

alter table public.company_members
  add column if not exists invite_expires_at timestamptz;

-- Pending invites created before this column get the same window from now.
update public.company_members
   set invite_expires_at = now() + interval '7 days'
 where invite_token is not null and accepted_at is null and invite_expires_at is null;

-- New pending invites default to seven days; the action sets it explicitly as well.
alter table public.company_members
  alter column invite_expires_at set default (now() + interval '7 days');
