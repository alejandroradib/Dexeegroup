# Decisions

Record of library versions and decisions not covered by `docs/SPEC.md`. Newest first.

## Library versions (September 2026)

| Package                               | Version      | Notes                                                                                                                |
| ------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| next                                  | 16.3.5       | App Router, Turbopack, `proxy.ts` replaces `middleware.ts`, `PageProps`/`LayoutProps` route types via `next typegen` |
| react / react-dom                     | 19.2.8       | React Compiler lint rules enabled through eslint-config-next                                                         |
| typescript                            | 5.9          | strict, `noUncheckedIndexedAccess`                                                                                   |
| tailwindcss / @tailwindcss/postcss    | 4.3          | tokens declared in `@theme inline` in `src/app/globals.css`                                                          |
| next-intl                             | 4.14         | `[locale]` routing, `localePrefix: always`, messages typed through `src/types/global.d.ts`                           |
| @supabase/supabase-js / @supabase/ssr | 2.116 / 0.12 | cookie-based sessions in the proxy and server components                                                             |
| zod                                   | 4.6          | shared schemas in `src/lib/validation`; `z.email`, `z.uuid` top-level helpers                                        |
| react-hook-form / @hookform/resolvers | 7.88 / 5.9   | form schemas avoid `.default()` and `z.coerce` so input and output types match                                       |
| radix-ui                              | 1.6          | single package; shadcn-style primitives hand-written in `src/components/ui`                                          |
| @tanstack/react-table                 | 8.21         | v9 alpha API rejected for stability                                                                                  |
| @dnd-kit/core                         | 6.3          | Kanban drag and drop                                                                                                 |
| @anthropic-ai/sdk                     | 0.126        | `completeJson` helper in `src/lib/ai/anthropic.ts`                                                                   |
| openai                                | 7.17         | Whisper transcription behind `TranscriptionProvider`                                                                 |
| resend / @react-email/components      | 6.28 / 1.0   | templates in `emails/`                                                                                               |
| @react-pdf/renderer                   | 4.9          | server-rendered result PDFs                                                                                          |
| vitest                                | 4.1          | unit tests in `tests/unit`                                                                                           |
| @playwright/test                      | 1.63         | e2e in `tests/e2e`                                                                                                   |
| @electric-sql/pglite                  | 0.5          | in-memory Postgres for migration verification and RLS tests in CI                                                    |
| supabase (CLI)                        | 2.117        | migrations and type generation                                                                                       |

## Decisions

1. **`npm run db:verify` replaces Docker for CI.** The Supabase CLI local stack needs Docker, which CI runners and this build environment lack. `scripts/verify-migrations.ts` boots PGlite, stubs the `auth` and `storage` schemas and roles, applies every migration, loads `seed.sql` and the JSON banks, asserts RLS on every table and runs the 81-check access matrix in `scripts/lib/rls-matrix.ts`. `npm run rls:test` runs the same matrix against a linked project through PostgREST with throwaway users.
2. **`current_user_role()` instead of `current_role()`.** `current_role` is a reserved word in Postgres; the function the spec calls `current_role()` is named `current_user_role()`.
3. **`assessment_questions_public` is a security definer view.** The spec asks for security invoker, but a column-level grant that hides `answer_key` from `authenticated` would also hide it from admins (who are `authenticated`). A definer view with no candidate policy on the base table keeps keys server-side and admin access intact.
4. **Database types are generated locally.** `scripts/gen-types-local.ts` emits `src/types/database.ts` from the PGlite schema in the same shape as `supabase gen types`. `npm run db:types` overwrites it once a project is linked.
5. **Publish guard skips the service role and admins.** `jobs_before_write` raises `company_not_verified` only when `auth.uid()` is set and the user is not an admin, so admins can publish jobs of pending companies and seeds run cleanly.
6. **Guard triggers back the RLS matrix.** Column-level restrictions the spec expresses in prose (candidates can only withdraw, companies cannot set `contact_released`, users can only mark notifications read, candidates cannot set their own English levels) are enforced by `BEFORE UPDATE` triggers, since RLS cannot express per-column rules.
7. **`cooldown_waived` on attempts.** Implements "Reject resets the cooldown" without deleting the attempt: rejected attempts stop counting toward the 90-day rule.
8. **Brand palette from the Dexee brand kit.** Navy `#011842`, green `#02AA86` (accent only, never small text), deep green `#007A61` for links, graphite, slate, mist and mint. Fonts Montserrat (headings) and Inter (body) served locally from the kit under OFL.
9. **Consent version is a code constant.** `CONSENT_VERSION` in `src/lib/legal.ts`, shown on the sign-up form and stored in `candidates.data_consent_version`.
10. **`candidate_cards` includes `desired_salary_min_usd`.** Salary expectation is not contact data and companies need it to shortlist.
11. **Company onboarding stores `hiring_needs` jsonb and profiles store `notification_prefs` jsonb**, as described in SPEC 10.2.
12. **Sentry is behind `SENTRY_DSN` but the SDK is not installed yet.** The build stays free of the `withSentryConfig` wrapper until an org and project exist; `src/lib/logger.ts` (pino) covers structured logs meanwhile.
13. **Email digests dedupe in the outbox.** `email_outbox.dedupe_key` (`new-application:{job}:{user}:{hour}`) implements "at most one new-application email per job per hour".
14. **Legacy peer dependencies.** `.npmrc` sets `legacy-peer-deps=true` because `@react-email/components` pins peers behind React 19.2.
15. **Admin invites reuse `handle_new_user`.** `inviteUserByEmail` creates the auth user; the action then upserts the profile with role `admin`. Deactivation bans the auth user for 100 years rather than deleting history.
16. **IPIP-50 attribution.** Items in `supabase/seed/ipip50.json` are the public-domain 50-item IPIP Big-Five factor markers from ipip.ori.org. SJT items and all English content are original.
17. **MVP document incorporations (2026-09-18).** From the earlier "MVP Dexee Platform" document we adopted four items the spec did not cover: (a) an AI practice interview for candidates (`mock_interviews` table, six bilingual questions per role family, Anthropic grading into a 0-20 report; one open interview per candidate, 30-day cooldown, no effect on matching or on what companies see); (b) granular sign-up consents stored in `candidates.consent_flags` (terms and data policy are required; job contact and aggregated analytics are optional and editable from settings); (c) candidate country of residence from a fixed LatAm list with an admin filter; (d) a free-tools adoption panel on the admin dashboard. Not adopted: DISC (the spec chose IPIP Big Five), the collaborator payroll portal (Phase 2 of the MVP document) and the MVP's alternative pipeline stage names.
18. **Consent metadata is jsonb, not columns.** `consent_flags` keeps `{ terms, data_policy, job_contact, analytics, version }` so future consents do not need a migration; `data_consent_version` stays as the authoritative column for the accepted policy version.
