-- Hardening from the Supabase database linter (0011, 0028, 0029).
-- 1. Security definer helpers are callable through /rest/v1/rpc by default because Postgres grants
--    EXECUTE to PUBLIC on new functions. Only `authenticated` (and `anon` for job_is_published)
--    should keep that grant.
-- 2. Trigger functions never need to be callable through the API.
-- 3. Utility functions pin their search_path.

alter function public.cefr_rank(public.cefr_level) set search_path = public;
alter function public.cefr_min(public.cefr_level, public.cefr_level) set search_path = public;

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature, p.prorettype = 'trigger'::regtype as is_trigger
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.prosecdef or p.prorettype = 'trigger'::regtype)
  loop
    execute format('revoke execute on function %s from public', fn.signature);
    execute format('revoke execute on function %s from anon', fn.signature);
    if fn.is_trigger then
      execute format('revoke execute on function %s from authenticated', fn.signature);
    end if;
  end loop;
end
$$;

-- Re-assert the grants the application relies on (idempotent).
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.user_company_ids() to authenticated;
grant execute on function public.is_company_owner(uuid) to authenticated;
grant execute on function public.company_can_view_candidate(uuid) to authenticated;
grant execute on function public.company_can_view_contact(uuid) to authenticated;
grant execute on function public.job_is_published(uuid) to authenticated, anon;
grant execute on function public.application_company_id(uuid) to authenticated;
grant execute on function public.candidate_owns_attempt(uuid) to authenticated;
grant execute on function public.attempt_is_open(uuid) to authenticated;
grant execute on function public.assessment_cooldown_ok(uuid, uuid) to authenticated;
grant execute on function public.compute_profile_completeness(uuid) to authenticated;
