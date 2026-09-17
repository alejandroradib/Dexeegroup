# Dexee Talent Platform — Build Plan

One phase per Claude Code session. Do not start a phase until the previous one is merged. Every phase ends with tests green, acceptance criteria checked and a manual QA list for the reviewer.

Session opener (paste at the start of each session, changing the phase number):

> Read CLAUDE.md, docs/SPEC.md and Phase N in docs/PHASES.md. Enter plan mode and give me the file-level plan, including migrations and tests. After I approve, implement Phase N completely, run lint, typecheck and tests, and stop when every acceptance criterion passes. Finish by listing the manual QA checklist for this phase and anything you had to assume.

---

## Phase 0 — Bootstrap

Goal: a running skeleton with tooling, i18n and CI, linked to the Supabase dev project.

Tasks

1. Initialize Next.js (App Router, TypeScript, `src/` dir), Tailwind, shadcn/ui (Button, Input, Label, Select, Textarea, Card, Badge, Dialog, Sheet, Tabs, Table, Toast, Skeleton, DropdownMenu, Accordion, RadioGroup, Checkbox, Progress, Tooltip), next-intl with `[locale]` routing and `messages/en.json`, `messages/es.json`.
2. ESLint (next, typescript, import order, jsx-a11y), Prettier, Husky pre-commit running lint and typecheck, `tsconfig` strict.
3. Supabase CLI: `supabase init`, link to the dev project, `package.json` scripts listed in CLAUDE.md, `db:types` generating `src/types/database.ts`.
4. `.env.example` with every variable from SPEC section 15 and a comment each. `src/lib/env.ts` validating env with zod at boot (server and public schemas separately).
5. Base layout: marketing header and footer, app shell with sidebar and top bar (empty nav), `LanguageSwitch`, `EmptyState`, `StatusChip`, `Stepper` components, design tokens in `globals.css`.
6. GitHub Actions workflow `ci.yml`: install, lint, typecheck, unit tests, build on pull requests.
7. `docs/DECISIONS.md` created with library versions and initial decisions. `README.md` with setup steps.

Acceptance criteria

- `npm run dev` serves `/en` and `/es` with the language switch working and no hardcoded strings.
- `npm run lint`, `npm run typecheck`, `npm run test` (one placeholder test) and `npm run build` pass; CI workflow passes on a pull request.
- `supabase db push` runs against the linked dev project with an empty migration set.
- `src/lib/env.ts` fails fast with a readable message when a required variable is missing.

Manual QA: open both locales on desktop and mobile widths; confirm the app shell collapses the sidebar on mobile.

---

## Phase 1 — Data layer

Goal: complete schema, access rules, storage and seed, verified by automated RLS tests.

Tasks

1. Migrations, in order: enums; utility functions and `set_updated_at`; tables from SPEC 7.2 with constraints and indexes from 7.4; `handle_new_user` trigger; access functions from 7.3; policies implementing the matrix in section 8; views `public_jobs`, `assessment_questions_public`, `candidate_cards`; storage buckets and policies; triggers `log_application_event`, cooldown and single-open-attempt enforcement, publish guard (company must be verified to publish), `sync_candidate_english_levels`; `email_outbox` and `ai_usage` tables.
2. `supabase/seed.sql`: three companies (one pending, two verified), six published jobs across role families and contract types (one confidential, one hiding salary), eight candidates with varied levels and availability, contacts, experience, education, four applications in different stages (one with contact released), one recommendation, the three assessment rows (inactive), five notifications.
3. `scripts/promote-admin.ts` and `scripts/rls-test.ts` (creates test users through the Auth admin API, runs assertions with per-user clients, cleans up).
4. `npm run db:types` output committed.
5. Unit tests for `compute_profile_completeness` logic mirrored in TypeScript (`src/lib/profile/completeness.ts`) and slug generation.

Acceptance criteria

- `npm run rls:test` passes and covers at least: anon reads `public_jobs` but cannot read `jobs`, `candidates` or `candidate_contacts`; a candidate reads and updates only their own rows; a company user reads applicants of its own jobs only, cannot read another company's jobs or applicants, cannot read `candidate_contacts` until `contact_released` is true and can afterwards, cannot read `job_commercials` or `placements`, cannot set `contact_released`; a candidate cannot insert an application to a draft job or a second application to the same job; a pending company cannot set a job to `published`; a second `in_progress` attempt for the same assessment is rejected; an attempt inside the cooldown is rejected; admin reads everything.
- Seed loads cleanly after `db:reset` and after `db:push` on a fresh dev project.
- Every table has RLS enabled (assert with a query in the test script).

Manual QA: inspect the Supabase dashboard: buckets exist with the right public flag; `public_jobs` hides the confidential company and the hidden salary.

---

## Phase 2 — Auth, roles and marketing site

Goal: users can register by role, verify email, land on their empty area; the public site is complete.

Tasks

1. Auth pages and server actions (sign-up by role, sign-in, verify, forgot and reset password), middleware with role routing and `next` handling, Law 1581 consent on candidate sign-up with version stored, invite acceptance route (company members and admins).
2. Company, candidate and admin shells with navigation per SPEC section 4 and placeholder dashboards.
3. Marketing pages per SPEC 10.1, legal MDX content, contact form with rate limiting and honeypot, public jobs board and job page with JSON-LD, metadata, sitemap, robots, hreflang.
4. `promote-admin` used to create the first admin from `ADMIN_EMAIL`.
5. Playwright: sign-up candidate → verify (use Supabase test helper or auto-confirm in dev) → lands on `/candidate`; company sign-up lands on `/company/onboarding`; role isolation redirects.

Acceptance criteria

- A candidate cannot complete sign-up without the consent checkbox; `data_consent_at` and version are stored.
- Role routing: each role reaches only its area; unauthenticated users are redirected with `next` preserved.
- Public job page passes Google's Rich Results test structure for JobPosting (validate the JSON-LD with a schema test in unit tests).
- Lighthouse ≥ 90 performance and accessibility on `/en` and `/en/jobs`.
- All strings translated in both locales; contact form writes `contact_requests` and blocks the 6th submission per IP in an hour.

Manual QA: full sign-up in both roles in both locales; password reset; invite flow for a company member; confidential job shows "Confidential".

---

## Phase 3 — Company area

Goal: a company can onboard, publish vacancies and manage applicants without ever seeing unreleased contact data.

Tasks: SPEC 10.2 in full, including the AI drafting action with usage logging, kanban with server-side status changes and rollback, contact request flow, shortlist, dashboard, settings and team.

Acceptance criteria

- Job wizard autosaves each step; submit from a pending company yields `pending_review`; from a verified company yields `published` with `published_at` set and the job appears on the public board within one request.
- Pipeline drag writes `application_events`; refreshing the page shows the same state; a failed action reverts the card and shows a toast.
- Card drawer for a non-released application shows no email, phone, LinkedIn, portfolio or resume in the HTML (assert in e2e by DOM inspection and by intercepting the network payloads).
- "Request contact details" creates an admin notification and disables the button.
- Team invite email is queued in `email_outbox`; accepting the invite grants access to the company's jobs.
- Unit tests for the job zod schema; e2e: create job → publish → candidate applies (seeded) → company sees the card without contact.

Manual QA: draft with AI on three different titles; duplicate a job; pause and resume; switch locale inside the shell.

---

## Phase 4 — Candidate area

Goal: a candidate can build a complete profile, apply, track applications and see the assessments hub.

Tasks: SPEC 10.3 in full except the assessment flows themselves (hub, states and result page shells only).

Acceptance criteria

- Onboarding is resumable at any step; completeness recalculates after each save and matches the SQL function.
- Resume upload rejects non-PDF and files over 5 MB server-side; the stored path follows the convention and is unreadable by anon.
- Apply creates the application; a second attempt shows the friendly duplicate message; withdraw works before `offer` and is blocked after.
- Recommended jobs respect the three matching rules.
- "Preview as a company sees it" renders exactly the `candidate_cards` fields.
- e2e: candidate onboarding → apply → withdraw; privacy settings create a `data_requests` row.

Manual QA: complete onboarding on a phone-sized viewport; confirm Spanish is the default for candidates.

---

## Phase 5 — Admin area

Goal: Dexee operates the platform end to end from the console.

Tasks: SPEC 10.4 in full, including CSV export, `admin_activity` on every mutation, placements with margin, assessment queue shell, thresholds settings page, team and activity views.

Acceptance criteria

- Verifying a company emails it and lets the admin publish its waiting jobs in the same action.
- Request changes sets `changes_requested` with the message, and the company sees the message in the wizard.
- Release contact flips `contact_released`, notifies and emails the company, and the company's drawer now shows contact details (e2e continues Phase 3 flow).
- Recommend candidate creates a `shortlisted` application with source `dexee_recommended`, visible to the company with the source badge and to the candidate in Applications.
- Creating a placement from a hired application computes monthly margin correctly (unit test) and the placement list totals match.
- CSV export contains only the current filter and logs an activity row.

Manual QA: run the whole hiring loop with the seed data from three browsers (company, candidate, admin).

---

## Phase 6 — Assessments

Split into three sessions.

### 6a — English written

Tasks: author the bank (≥ 60 MCQ items with band, section and key; ≥ 6 writing prompts) in `supabase/seed/english_written.json`; seed loader; attempt lifecycle (start with cooldown check, timer, autosave answers, submit); MCQ scoring and level mapping in `src/lib/assessments/english-written.ts`; writing grader in `src/lib/ai/prompts/english-writing.ts` with zod-validated JSON; combination rule; result page; badge sync.

Acceptance criteria

- Unit tests cover the level mapping at every threshold boundary and the combination rule (including the two-level gap sending the attempt to validation).
- Answer keys are absent from every client payload (e2e network assertion).
- Expired attempts are rejected server-side after the grace period; the cron marks abandoned attempts `expired`.
- A second attempt inside 90 days is refused with the next available date.

### 6b — Work-style profile

Tasks: `supabase/seed/ipip50.json` with factor and reverse keys, 10 original SJT items; scoring in `src/lib/assessments/workstyle.ts`; deterministic report builder with bilingual copy; visibility toggle; company-facing band summary in the pipeline drawer; PDF result.

Acceptance criteria

- Unit tests: reverse-keyed scoring, 0–100 scaling, band assignment, report determinism (same answers → same report).
- Company drawer shows bands only when `visible_to_companies` is true and never shows numeric scores.

### 6c — English oral

Tasks: prompt bank (≥ 8); `AudioRecorder` with mic check, preparation countdown, 60–90 s recording, one re-record; signed upload route with size and MIME validation; processing pipeline (transcription provider, grader prompt, retries, `failed` state) in the cron and the post-submit trigger; admin validation page; reject-and-retake path; badge sync and "verified by Dexee" label.

Acceptance criteria

- Recording works in Chrome, Safari and Firefox (manual), uploads under 3 MB per answer, and the attempt moves to `processing` then `pending_validation` within one cron cycle in dev.
- Validation writes `english_oral_level`, `english_verified_level` (lower of written and oral) and `english_verified_at`; the candidate is notified; the badge appears in company views.
- Transcription and grading failures retry three times then surface in the admin queue as `failed` with a retry action.

Manual QA for Phase 6: take all three assessments as a seeded candidate; validate the oral attempt as admin; confirm the levels and the PDF downloads.

---

## Phase 7 — Notifications, email, SEO and quality

Tasks: `email_outbox` processor and all templates from SPEC section 12 in both locales; in-app notifications bell with read state and per-user preferences; new-application digest; analytics provider and cookie notice; retention cron for assessment audio; Sentry and health check; accessibility pass with axe on wizards and board; empty, loading and error states audit; mobile audit of every app page.

Acceptance criteria

- Every event in the table of section 12 produces the expected notification and outbox row (unit tests on the event dispatcher).
- Outbox processor retries failed sends and never sends twice.
- axe reports no serious or critical violations on the audited pages.
- Lighthouse ≥ 90 on marketing pages after adding analytics.

---

## Phase 8 — Production and handover

Tasks: production Supabase project with migrations applied through CI, backups enabled, Auth email templates branded; Vercel production project with env vars, cron jobs and domain dexeegroup.com; `docs/RUNBOOK.md` (deploy, rollback, rotate keys, promote admin, calibrate thresholds, handle data requests) and `docs/ADMIN-GUIDE.md` for Dexee staff; final `rls:test` against production with throwaway users, then cleanup.

Acceptance criteria

- Production smoke: sign-up both roles, publish a job, apply, release contact, take the written assessment; all emails delivered.
- No secret in the repo history (scan with gitleaks in CI).
- Runbook reviewed and followed once end to end by someone who did not write it.
