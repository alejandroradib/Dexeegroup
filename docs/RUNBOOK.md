# Runbook

Operational procedures for the Dexee Talent Platform. Assumes a Vercel project and two Supabase projects (dev, production).

## Environments

| Environment | Supabase                                        | Hosting                                  | Notes                               |
| ----------- | ----------------------------------------------- | ---------------------------------------- | ----------------------------------- |
| local       | linked dev project or `supabase start` (Docker) | `npm run dev`                            | `.env.local` from `.env.example`    |
| dev         | dev project                                     | Vercel preview                           | migrations via `npm run db:push`    |
| production  | production project                              | Vercel production, domain dexeegroup.com | migrations promoted through CI only |

## First-time setup

1. `npm ci`
2. `supabase login` then `supabase link --project-ref <ref>`
3. `npm run db:push` to apply `supabase/migrations`
4. In the Supabase dashboard run `supabase/seed.sql` (dev only) or `psql "$SUPABASE_DB_URL" -f supabase/seed.sql`
5. `npm run db:seed` to load the JSON question banks into `assessment_questions`
6. `npm run db:types` to regenerate `src/types/database.ts`
7. Configure Auth: enable email confirmations, set Site URL to the deployment URL and add `https://<host>/auth/callback` to redirect URLs. Brand the email templates (Confirm signup, Reset password, Invite) with the Dexee logo and colors.
8. Create the first admin: sign up as a candidate with the Dexee email, confirm it, then `npm run promote-admin -- --email info@dexeegroup.com`.
9. `npm run rls:test` against the project to confirm access rules.

## Deploy

- Pull requests run lint, typecheck, unit tests, `db:verify` (migrations and RLS matrix on PGlite) and `next build`.
- Production deploy is a Vercel promotion of `main`. Apply migrations first: `supabase db push --linked` with the production ref from CI (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` secrets), then deploy.
- Cron jobs are declared in `vercel.json` and authenticate with `CRON_SECRET`. On the Vercel Hobby plan they run once a day (see DECISIONS 22); on Pro, set `process-attempts` and `process-outbox` back to `*/5 * * * *`.

## Rollback

- Application: redeploy the previous Vercel deployment.
- Database: migrations are forward-only. Write a new migration that reverts the change; never edit an applied migration.

## Domain and DNS

- Registrar: Squarespace, under `aradi@dexeegroup.com`. Renewal 11 Sep 2027.
- Authoritative DNS as of 18 Sep 2026: Cloudflare (`vin.ns.cloudflare.com`, `sloan.ns.cloudflare.com`). The account holding the zone is not the one under `alejandroradib@gmail.com`; confirm which login owns it before editing records.
- The application is served by Vercel. Both `dexeegroup.com` and `www.dexeegroup.com` are CNAMEs to the target Vercel prints under Settings, Domains. On Cloudflare they must be `DNS only` (grey cloud); the orange-cloud proxy breaks domain validation and can loop the certificate.
- Email is Google Workspace and does not live in this repo's control: one MX to `smtp.google.com` priority 1, the SPF TXT on the apex, and the DKIM TXT on `google._domainkey`. Never delete these three, and recreate them **before** changing nameservers, not after.
- Changing DNS provider: create every record listed above in the new provider first, then repoint nameservers at the registrar. Read the live values with `dns.resolveMx` / `dns.resolveTxt` before starting, since the DKIM public key is only recoverable from the current DNS or from the Google Workspace admin console.
- After any domain change: set `NEXT_PUBLIC_SITE_URL` in Vercel to the new origin and redeploy, then update Site URL and Redirect URLs in Supabase Authentication.

## Rotate keys

1. Supabase service role: rotate in Project settings, update `SUPABASE_SERVICE_ROLE_KEY` in Vercel and redeploy.
2. Anthropic, OpenAI, Resend: create the new key, update the environment variable, redeploy, revoke the old key.
3. `CRON_SECRET`: update in Vercel; cron requests pick it up on the next run.

## Promote an admin

`npm run promote-admin -- --email user@dexeegroup.com` (the user must exist). Or invite from `/admin/team`.

## Calibrate assessment thresholds

After roughly 100 written attempts, export attempt results and compare MCQ levels with validated writing levels. Adjust `thresholds` in `/admin/settings` (saving bumps `assessments.version`). Record the change in `docs/DECISIONS.md`.

## Handle data requests (Law 1581)

Requests appear in `/admin/candidates/<id>` and notify admins. For deletion: export the candidate's data if requested, then delete the auth user in the Supabase dashboard (cascades to profile, candidate, contacts, applications and attempts) and remove `resumes/candidates/<id>/` and `assessment-audio/attempts/<attempt>/` objects. Mark the request resolved.

## Retry a failed assessment

`/admin/assessments` lists `failed` attempts. Open one and use Retry processing (oral) or validate manually with a final level (written).

## Health and monitoring

- `GET /api/health` checks database connectivity.
- Logs are structured JSON (pino) in Vercel logs. Set `SENTRY_DSN` when the Sentry project exists.

## Secrets scan

CI runs gitleaks on every pull request. Never commit `.env.local`.

## Lead queue

Inbound briefs land in `contact_requests` with `request_type = 'hire'` and `status = 'new'`.
`/admin/leads` is the queue.

- **The promise.** The form commits Dexee to a written answer within one business day,
  saying whether the role can be filled, in what timeframe and at what cost. The queue
  measures against that: a lead still `new` after nine business hours (Monday to Friday,
  09:00 to 18:00 Bogotá) is flagged "past the promise".
- **Marking answered.** Use the button in the queue, not SQL. `answered_at` and
  `answered_by` are stamped by a database trigger so the response-time figures on the
  admin dashboard cannot be written around.
- **Converting.** Once the client has an account, paste the company id into the convert
  field. That links the lead to the company and moves it to `converted`.
- **The acknowledgement email.** Queued in `email_outbox` with `dedupe_key = lead:{id}`
  and sent by the outbox cron. If Resend is down, the lead is still saved: the insert
  happens first and on its own. A lead with no matching outbox row means the queue insert
  failed, and `lead_acknowledgement_queue_failed` is in the logs.

## Analytics

Behind `NEXT_PUBLIC_ANALYTICS_PROVIDER` (`plausible` or `ga4`) plus
`NEXT_PUBLIC_ANALYTICS_ID`. With neither set, nothing loads and `track()` is a no-op.

Nine events: `view_pricing`, `use_calculator`, `view_sample_report`, `start_lead_form`,
`submit_lead`, `start_candidate_signup`, `complete_assessment`, `view_job`, `apply_job`.
Properties are categories only; `sanitizeProps` drops anything personal before it leaves
the browser. To add an event, add the name to `ANALYTICS_EVENTS` and a case to
`tests/e2e/events.spec.ts`; the unit test fails if the catalogue and the doc disagree.

## Google Indexing API

Optional. Set `INDEXING_API_CREDENTIALS` to a service-account JSON key, as one line, for
an account granted Owner on the property in Search Console. Publishing, approving,
pausing and closing a vacancy then ping Google for both locale URLs. Without the
credential every call is a silent no-op and nothing else changes.
