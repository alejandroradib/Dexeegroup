# Dexee Talent Platform

Bilingual (EN/ES) talent platform for Dexee S.A.S. US companies post vacancies, Colombian candidates build a profile, apply and take three free assessments, and Dexee curates the process and controls the release of contact details.

The product specification lives in `docs/SPEC.md`; the build plan in `docs/PHASES.md`; decisions and versions in `docs/DECISIONS.md`; operations in `docs/RUNBOOK.md`; staff instructions in `docs/ADMIN-GUIDE.md`.

## Stack

Next.js 16 (App Router, TypeScript), Tailwind CSS 4, shadcn-style primitives on Radix, next-intl, Supabase (Postgres with RLS, Auth, Storage), Anthropic Messages API, OpenAI Whisper, Resend with React Email, Vercel with Cron, Vitest, Playwright, PGlite for database verification in CI.

## Setup

```bash
cp .env.example .env.local        # fill in Supabase keys at minimum
npm ci
npm run dev                       # http://localhost:3000/en and /es
```

Database (linked Supabase project):

```bash
supabase link --project-ref <ref>
npm run db:push                   # apply supabase/migrations
psql "$SUPABASE_DB_URL" -f supabase/seed.sql   # dev seed (accounts use DexeeSeed2026!)
npm run db:seed                   # load JSON question banks
npm run db:types                  # regenerate src/types/database.ts
npm run promote-admin -- --email info@dexeegroup.com
npm run rls:test                  # access matrix against the linked project
```

Without a Supabase project you can still verify the schema and access rules locally:

```bash
npm run db:verify                 # migrations + seed + 73 RLS assertions on PGlite
```

## Commands

| Command                                                 | Purpose                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| `npm run dev` / `npm run build` / `npm start`           | local app, production build, serve                            |
| `npm run lint` / `npm run typecheck` / `npm run test`   | ESLint, `next typegen && tsc`, Vitest                         |
| `npm run test:e2e`                                      | Playwright (`E2E_SEEDED=1` enables tests that need seed data) |
| `npm run db:verify`                                     | migrations, seed, banks and RLS matrix in PGlite              |
| `npm run db:push` / `db:reset` / `db:types` / `db:seed` | Supabase CLI and bank loader                                  |
| `npm run rls:test`                                      | remote RLS assertions with throwaway users                    |
| `npm run promote-admin -- --email x`                    | promote a user to admin                                       |

## Repository layout

```
src/app/[locale]/(marketing)   public site, jobs board, legal pages
src/app/[locale]/(auth)        sign-in, sign-up by role, verify, reset, invites
src/app/[locale]/(app)         company, candidate and admin areas
src/app/api                    cron, signed uploads, PDF, health
src/components/ui              primitives      src/components/domain/<area>   feature components
src/server/actions/<area>      server actions  src/server/services/<area>     data access
src/lib                        env, supabase clients, i18n, ai, assessments scoring, email, validation
supabase/migrations            schema, functions, triggers, RLS, storage
supabase/seed.sql              dev seed        supabase/seed/*.json           question banks
emails/                        React Email templates and bilingual copy
scripts/                       verify-migrations, gen-types-local, rls-test, seed, promote-admin
tests/unit, tests/e2e          Vitest and Playwright
```

## Environments and deploy

See `docs/RUNBOOK.md`. Cron jobs (`vercel.json`) process assessment attempts, the email outbox and audio retention, authenticated by `CRON_SECRET`.
