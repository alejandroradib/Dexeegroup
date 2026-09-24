# Local demo stack

A self-contained, Supabase-compatible backend for demos and manual testing on a machine that
cannot reach `*.supabase.co` and has no Docker. It runs the real migrations and seed against a
local PostgreSQL 16, serves the REST API through PostgREST, and emulates the parts of GoTrue
(auth) and Storage the app uses. Everything lives under `scripts/demo/` and `.demo/` (gitignored).

## Requirements

- PostgreSQL 16 server binaries at `/usr/lib/postgresql/16/bin` (override with `PGBIN=...`).
  A `postgres` OS user must exist when running as root (initdb refuses to run as root).
- Node 22, `npx tsx`, `curl`, `tar` with xz support (PostgREST is downloaded once into `.demo/bin`).
- No Docker, no network access to Supabase.

## Run it

```bash
npm run demo                       # postgres + PostgREST + gateway; leave it running
cp .env.demo .env.local && npm run dev   # in a second terminal
```

`npm run demo` does the following, idempotently:

1. `scripts/demo/setup-db.sh`: `initdb` into `.demo/pgdata` (once), starts Postgres on
   `127.0.0.1:54329` with trust auth, creates the roles `anon`, `authenticated`, `service_role`
   and `authenticator`, the `auth`/`storage` stubs (`scripts/demo/stubs.sql`), then applies every
   file in `supabase/migrations`, `supabase/seed.sql` and the JSON question banks
   (`scripts/demo/load-banks.ts`). Re-runs finish in well under a second.
2. Downloads PostgREST v13.0.4 into `.demo/bin` if missing and writes `.demo/postgrest.conf`.
3. Starts PostgREST on `127.0.0.1:3001` and the gateway on `http://127.0.0.1:54320`.
4. Writes `.env.demo` with the Supabase URL, anon key, service-role key, `SUPABASE_DB_URL`,
   `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET` and `EMAIL_FROM`. AI, Whisper and Resend keys are left
   empty; features that need them degrade the way they do without credentials.

Ctrl+C stops PostgREST and the gateway. Postgres keeps running so the next `npm run demo` is
instant; stop it with `npm run demo:db -- --stop`. Rebuild the database from scratch with
`npm run demo:db -- --reset` (drops the `dexee` database and re-applies migrations, seed and banks).

Useful commands:

```bash
npm run demo:db                                   # ensure postgres is up and seeded, nothing else
psql -h 127.0.0.1 -p 54329 -U postgres dexee      # superuser shell
tail -f .demo/postgres.log                        # server log
```

## What the gateway serves

| Prefix          | Backed by                                   | Notes                                                                          |
| --------------- | ------------------------------------------- | ------------------------------------------------------------------------------ |
| `/rest/v1/*`    | PostgREST (reverse proxy)                   | Role comes from the JWT `role` claim; `auth.uid()` reads `request.jwt.claims`. |
| `/auth/v1/*`    | `scripts/demo/auth.ts` on `auth.users`      | Password sign-in, refresh, signup, user read/update, logout, admin user CRUD.  |
| `/storage/v1/*` | Files under `.demo/storage/<bucket>/<path>` | Signed upload URLs, signed download URLs, public read, list, remove.           |

Auth details worth knowing:

- Tokens are HS256 JWTs signed with the fixed secret in `scripts/demo/config.ts`; PostgREST uses
  the same secret, so RLS policies see the signed-in user.
- Signup auto-confirms the email (there is no mailer). `resetPasswordForEmail`, `resend` and
  `inviteUserByEmail` respond successfully but send nothing; password recovery and email links
  do not work in the demo. Use the admin API or `psql` to change a password instead.
- `signInWithPassword` verifies bcrypt hashes in `auth.users.encrypted_password`, so the seed
  accounts work with their seeded password.
- Storage does not enforce the `storage.objects` RLS policies: the app always goes through the
  service-role client for storage, and the signed-upload route authorizes paths before signing.

## Seed accounts

Every account uses the password `DexeeSeed2026!`.

| Role      | Email                                   | Notes                                                   |
| --------- | --------------------------------------- | ------------------------------------------------------- |
| Admin     | `admin@example.com`                  | Dexee Admin                                             |
| Company   | `owner@northwind-logistics.example.com` | Owner of Northwind Logistics (pending review)           |
| Company   | `owner@harborhealth.example.com`        | Owner of Harbor Health Admin (verified)                 |
| Company   | `owner@brightline.example.com`          | Owner of Brightline SaaS (verified)                     |
| Company   | `member@brightline.example.com`         | Accepted member at Brightline SaaS                      |
| Candidate | `laura.gomez@example.com`               | Has an application in interview stage, contact released |
| Candidate | `andres.pineda@example.com`             | Shortlisted, contact requested                          |
| Candidate | `camila.rojas@example.com`              | In screening                                            |
| Candidate | `santiago.mora@example.com`             |                                                         |
| Candidate | `valentina.ruiz@example.com`            |                                                         |
| Candidate | `daniel.castro@example.com`             | Dexee-recommended application                           |
| Candidate | `mariana.torres@example.com`            |                                                         |
| Candidate | `felipe.herrera@example.com`            |                                                         |

The seed also contains 8 jobs (6 published, 1 pending review, 1 draft), a pending company
invite (`finance.lead@harborhealth.example.com`, token `seed-invite-token-harbor-0001`) and the
three assessments, which the bank loader activates once the question banks are in place.

## Demo data in the hosted project

`scripts/seed-demo.ts` prints SQL for a labelled demo set that can live next to real data: one
recruiter account with a verified company ("Demo Health Partners") and four jobs, one candidate
account with three validated results and DISC left to take, and four background candidates who
already applied to those jobs with four valid results each and a ready fit analysis. Every row
uses the id prefix `dd000000-` and every account an `@demo.dexeegroup.com` address, and every
title, headline and summary says it is demo data.

    npx tsx scripts/seed-demo.ts                 # full SQL, one transaction
    npx tsx scripts/seed-demo.ts --part=head     # accounts, company, jobs, profiles
    npx tsx scripts/seed-demo.ts --part=attempts=03
    npx tsx scripts/seed-demo.ts --part=tail     # applications, fit, note
    npx tsx scripts/seed-demo.ts --cleanup       # removes everything above

Apply with psql or, for the hosted project, with the Supabase MCP `execute_sql` one part at a
time (the full file exceeds its size limit). Passwords are hashed in the database with
`extensions.crypt`, so pgcrypto must be installed in the `extensions` schema, as it is on
Supabase. Loaded into the hosted project on 2026-09-21; the project identifier, the accounts
and the password are in the handover notes, not in this file. The script reads the password
from `DEMO_SEED_PASSWORD` and refuses to run without it.

Fit rows are marked `model = 'demo-seed'`. The refresh action only recomputes applications
without a ready row, so they survive a click; a real `ANTHROPIC_API_KEY` recomputes only new
applications.

## Ports and files

| Item           | Value                                         |
| -------------- | --------------------------------------------- |
| Supabase URL   | `http://127.0.0.1:54320`                      |
| PostgREST      | `http://127.0.0.1:3001`                       |
| Postgres       | `postgres://postgres@127.0.0.1:54329/dexee`   |
| Data directory | `.demo/pgdata` (owned by the `postgres` user) |
| Storage files  | `.demo/storage/`                              |
| Keys and env   | `.env.demo`                                   |

## Troubleshooting

- `postgres did not come up`: read `.demo/postgres.log`. A stale `postmaster.pid` after a crash
  can be removed from `.demo/pgdata` and the script re-run.
- Port 54320 or 3001 already in use: another `npm run demo` is running. Stop it first; the start
  script reuses a running PostgREST but refuses to start a second gateway.
- Schema looks stale after adding a migration: `npm run demo:db -- --reset`. The setup script does
  not apply new migrations to an existing database.
- The browser must reach `127.0.0.1:54320` directly (it is the `NEXT_PUBLIC_SUPABASE_URL`), so
  run the app and the demo stack on the same machine.
