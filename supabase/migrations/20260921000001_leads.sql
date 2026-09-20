-- Phase 9.4: qualify the inbound lead instead of taking a free-text message.
-- contact_requests already existed but nothing read it; these columns and the admin
-- policies below turn it into a queue with a response commitment attached.

create type public.lead_status as enum ('new', 'answered', 'converted', 'discarded');

alter table public.contact_requests
  add column if not exists role_to_fill text,
  add column if not exists seniority public.seniority,
  add column if not exists budget_band text,
  add column if not exists needed_by text,
  add column if not exists status public.lead_status not null default 'new',
  add column if not exists answered_at timestamptz,
  add column if not exists answered_by uuid references public.profiles (id) on delete set null,
  add column if not exists company_id uuid references public.companies (id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

-- The form no longer requires a message: a qualified lead carries structured fields.
alter table public.contact_requests alter column message drop not null;

-- Budget bands and delivery windows are presented as a fixed choice, not free text, so
-- the queue can be filtered. Values match src/lib/validation/lead.ts.
alter table public.contact_requests
  add constraint contact_requests_budget_band_check
  check (budget_band is null or budget_band in
    ('under_2k', '2k_4k', '4k_7k', '7k_plus', 'not_sure'));

alter table public.contact_requests
  add constraint contact_requests_needed_by_check
  check (needed_by is null or needed_by in
    ('immediate', 'one_month', 'quarter', 'exploring'));

-- The queue is read newest-first within a status.
create index contact_requests_status_idx
  on public.contact_requests (status, created_at desc);

create trigger contact_requests_set_updated_at before update on public.contact_requests
  for each row execute function public.set_updated_at();

-- Only an admin moves a lead through the queue. RLS already denies anonymous and
-- non-admin access entirely; this guard also stops the service role from recording an
-- answer without saying who gave it, which is what the response-time report relies on.
create or replace function public.guard_contact_request_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'lead_admin_only' using errcode = '42501';
  end if;
  if new.status <> old.status and new.status in ('answered', 'converted') then
    if new.answered_at is null then
      new.answered_at := now();
    end if;
    if new.answered_by is null then
      new.answered_by := auth.uid();
    end if;
  end if;
  return new;
end;
$$;

create trigger contact_requests_guard before update on public.contact_requests
  for each row execute function public.guard_contact_request_update();

revoke execute on function public.guard_contact_request_update() from public, anon, authenticated;
