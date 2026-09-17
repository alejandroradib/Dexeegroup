# Dexee Talent Platform

Bilingual (EN/ES) talent platform for Dexee S.A.S. (Barranquilla, Colombia). US companies post vacancies, Colombian candidates apply and take free assessments, and Dexee curates the process and controls the release of candidate contact details.

Read `docs/SPEC.md` (product and technical specification) and `docs/PHASES.md` (build plan with acceptance criteria) before doing any work. The spec wins over assumptions. If the spec is silent or contradictory, stop and ask; do not invent behavior.

## Stack

- Next.js (latest stable, App Router, TypeScript, React Server Components by default), Tailwind CSS, shadcn/ui, next-intl.
- Supabase: Postgres with Row Level Security, Auth via `@supabase/ssr`, Storage. Schema changes happen only through SQL migrations in `supabase/migrations`.
- Server-side logic (scoring, AI calls, emails, admin actions) runs in Server Actions or Route Handlers using the service-role client. The browser only ever holds the anon key.
- AI: Anthropic Messages API (current Sonnet model; confirm the model id in the Anthropic docs at build time) for job-description drafting and assessment grading. Speech-to-text: OpenAI Whisper behind a provider interface so it can be swapped.
- Email: Resend with React Email templates. Hosting: Vercel. Scheduled work: Vercel Cron.
- Tests: Vitest (unit), Playwright (e2e), RLS assertions in `scripts/rls-test.ts`.
- Record library versions and any decision not covered by the spec in `docs/DECISIONS.md`.

## Commands

- `npm run dev` — local app
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`
- `npm run db:push` — apply migrations to the linked Supabase project
- `npm run db:reset` — reset the local database and reseed (requires Docker and `supabase start`)
- `npm run db:types` — regenerate `src/types/database.ts` from the schema
- `npm run db:seed` — load `supabase/seed.sql` and the JSON question banks
- `npm run rls:test` — run access assertions with anon, candidate, company and admin clients
- `npm run promote-admin -- --email user@dexeegroup.com` — promote an existing user to admin (service role)

## Repository layout

- `src/app/[locale]/(marketing)` public pages
- `src/app/[locale]/(auth)` sign-in, sign-up, verification, invites
- `src/app/[locale]/(app)/company`, `/candidate`, `/admin` role areas
- `src/app/api` route handlers (cron, uploads, webhooks)
- `src/components/ui` shadcn primitives; `src/components/layout`; `src/components/domain/<area>`
- `src/lib` supabase clients, auth helpers, i18n, ai providers, email, assessments (scoring), utils
- `src/server/actions/<area>` server actions; `src/server/services/<area>` data access. Components never call Supabase directly.
- `messages/en.json`, `messages/es.json`
- `supabase/migrations`, `supabase/seed.sql`, `supabase/seed/*.json`
- `emails/` React Email templates
- `docs/`, `scripts/`, `tests/unit`, `tests/e2e`

## Non-negotiable rules

1. Every table has RLS enabled with explicit policies. Nothing is readable by anonymous users unless `docs/SPEC.md` says so. Access rules are enforced in the database, never only in the UI.
2. Candidate contact details live in `candidate_contacts` and resumes in a private bucket. A company can read them only when `applications.contact_released = true` for an application to one of that company's jobs. Commercial data (bill rates, fees, margins) lives in `job_commercials` and `placements`, readable by admins only.
3. Assessment answer keys never leave the server. Scoring and AI grading run server-side; the client receives results only.
4. All user-facing text goes through next-intl messages. No hardcoded strings in components, emails or validation messages.
5. Validate every input with zod on the server. Never trust a role, company id or candidate id sent by the client; derive them from the session.
6. No secrets in the repo. `.env.example` lists every variable with a one-line comment.
7. Salaries are USD per month everywhere. Timestamps are stored in UTC.
8. UI copy tone: professional and direct. No exclamation marks, no emojis.
9. Candidate profiles never collect photo, date of birth, age, marital status, religion or other protected characteristics.

## Coding conventions

- Server Components by default; add `"use client"` only for interactivity.
- Forms: react-hook-form + zod schemas shared between client and server (`src/lib/validation`).
- Data access through `src/server/services`; return typed results (`{ ok, data } | { ok: false, error }`), never throw across the action boundary.
- Every list has pagination, loading skeleton, empty state and error state.
- Accessible by default: labels on inputs, focus states, keyboard navigation, AA contrast.
- Files over 300 lines get split. No `any`. No disabled lint rules without a comment explaining why.

## How to work

- Start each phase in plan mode: read the phase in `docs/PHASES.md`, list the files you will create or change and the migrations involved, then implement.
- Small, reviewable commits with conventional messages (`feat(company): job wizard step 2`, `fix(rls): candidate_contacts policy`).
- Run `npm run lint && npm run typecheck && npm run test` before every commit. Run `npm run rls:test` after any migration.
- A phase is done when every acceptance criterion in `docs/PHASES.md` passes, tests are green, seed data exercises the feature, and you have listed what the reviewer should test manually.
- When a task needs a credential, a third-party account or a product decision, stop and ask.
