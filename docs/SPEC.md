# Dexee Talent Platform — Product and Technical Specification

Version 1.0, September 2026. Owner: Dexee S.A.S. This document is the source of truth for the build; `docs/PHASES.md` sequences the work.

## 1. Purpose and scope

Dexee S.A.S. is a BPO and headhunting firm based in Barranquilla, Colombia, that places vetted Colombian professionals with companies in the United States. The platform replaces the brochure site at dexeegroup.com with a bilingual (EN/ES) marketing site plus a working product:

- US companies register, post vacancies and manage applicants.
- Colombian candidates build a profile, apply, and take three free assessments whose results attach to the profile: English written, English oral (validated by Dexee) and a work-style profile (psychometric screening).
- Dexee operates the middle: verifies companies, moderates vacancies, holds the database of companies, candidates and placements, validates assessments, recommends candidates and decides when a company receives a candidate's contact details.

Design reference: deel.com and app.deel.com for layout patterns, density and tone. Dexee's own brand, copy and assets only; nothing from Deel is reused.

Out of scope for v1: billing and payments, contract generation and e-signature, interview scheduling, video interviews, ATS or HRIS integrations, a browsable talent pool for companies, native mobile apps.

## 2. Users and roles

| Role      | Who                                           | Can                                                                                                                                                              |
| --------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Company   | US client user (owner or member of a company) | Manage company profile and team, create and manage vacancies, review applicants, move them through the pipeline, save candidates, request contact details        |
| Candidate | Colombian professional                        | Manage profile, browse and apply to vacancies, track applications, take assessments, control visibility of the work-style profile                                |
| Admin     | Dexee staff                                   | Everything above plus verification, moderation, database views and exports, contact release, recommendations, assessment validation, placements, team management |

One user has exactly one role. A company can have several users (owner plus members). Admins cannot self-register.

## 3. Business rules

1. Dexee controls contact. A company sees a candidate's first name, last initial, headline, city, experience, skills and assessment badges. Email, phone, LinkedIn, portfolio and resume are visible only after a Dexee admin releases contact for that specific application.
2. Vacancies from companies with status `pending` go to a review queue; admins publish or request changes. Companies with status `verified` publish directly. Suspended companies cannot publish or see applicants.
3. Contract types: `independent_contractor`, `dexee_eor` (Dexee hires in Colombia and bills the client monthly), `direct_hire`, `project_based`. Each has a one-paragraph explanation in the UI.
4. Salaries and expectations are USD per month, integers.
5. Each assessment can be taken once every 90 days (`cooldown_days`, configurable per assessment). One open attempt per assessment at a time.
6. English levels follow CEFR (A1 to C2). `english_written_level` is automatic; `english_oral_level` requires admin validation; `english_verified_level` is the lower of the two once both exist and is the level shown on badges.
7. The work-style profile is visible to companies only when the candidate enables `visible_to_companies` on the attempt; companies then see band descriptors, never numeric scores.
8. Assessment results are labeled as Dexee screening results, never as certifications or clinical assessments.
9. Candidate sign-up requires explicit consent to personal data processing under Colombian Law 1581 of 2012; consent text version and timestamp are stored. Candidates can request data access, correction or deletion from Settings; deletion requests create an admin task.
10. When an application reaches `hired`, admins are notified to record a placement.

## 4. Information architecture

All routes are prefixed by locale (`/en`, `/es`). Default locale `en`; candidate sign-up defaults to `es`.

Marketing (public): `/`, `/for-companies`, `/for-talent`, `/jobs`, `/jobs/[slug]`, `/about`, `/contact`, `/privacy`, `/terms`.

Auth: `/sign-in`, `/sign-up` (choose Company or Candidate), `/sign-up/company`, `/sign-up/candidate`, `/verify-email`, `/forgot-password`, `/reset-password`, `/invite/[token]`.

Company: `/company` (dashboard), `/company/onboarding`, `/company/jobs`, `/company/jobs/new`, `/company/jobs/[id]/edit`, `/company/jobs/[id]/pipeline`, `/company/candidates` (applicants across jobs), `/company/shortlist`, `/company/settings` (tabs: company, team, notifications).

Candidate: `/candidate` (dashboard), `/candidate/onboarding`, `/candidate/profile`, `/candidate/jobs`, `/candidate/jobs/[slug]`, `/candidate/applications`, `/candidate/assessments`, `/candidate/assessments/[type]`, `/candidate/assessments/[type]/attempt/[attemptId]`, `/candidate/assessments/[type]/result/[attemptId]`, `/candidate/settings` (tabs: account, privacy, notifications).

Admin: `/admin` (dashboard), `/admin/companies`, `/admin/companies/[id]`, `/admin/jobs`, `/admin/jobs/[id]`, `/admin/candidates`, `/admin/candidates/[id]`, `/admin/applications`, `/admin/placements`, `/admin/assessments` (validation queue), `/admin/assessments/attempts/[id]`, `/admin/team`, `/admin/activity`, `/admin/settings` (assessment thresholds, consent text version).

Route handlers: `/api/cron/process-attempts` (Vercel Cron, protected by `CRON_SECRET`), `/api/storage/signed-upload` (returns a signed upload URL for resumes and audio after validating size and type), `/api/health`.

Role routing: middleware resolves the session and profile role; unauthenticated users hitting `(app)` routes go to `/sign-in?next=`; a user hitting another role's area is redirected to their own dashboard.

## 5. Design system

Tokens as CSS variables in `src/app/globals.css`, consumed by Tailwind and shadcn:

- Colors: `--primary` [brand primary, default navy #0B1F3A], `--accent` [default #1F6FEB], `--highlight` [default #F5A524], neutral gray scale, semantic success/warning/danger/info. Light theme only in v1.
- Typography: [brand font, default Inter]; scale 12/14/16/18/24/32/40; headings tight, body 1.5 line height.
- Radius 12px on cards and inputs, 999px on chips; subtle 1px borders; shadows only on overlays.
- Layout: marketing pages max-width 1200px; app shell with 260px left sidebar (collapsible on mobile), 64px top bar with language switch, notifications bell and user menu.

Reusable components beyond shadcn primitives: `StatusChip` (color map per status), `Stepper` (numbered steps with progress), `EmptyState` (icon, title, description, action), `DataTable` (TanStack Table: sorting, filters, pagination, CSV export hook), `KanbanBoard` (dnd-kit), `TagInput`, `SalaryRangeInput`, `CefrBadge`, `WorkStyleBadge`, `AudioRecorder` (mic check, countdown, waveform, re-record once), `CountdownTimer`, `ConsentCheckbox`, `LanguageSwitch`, `NotificationBell`.

Status chip colors: draft gray, pending_review amber, changes_requested orange, published green, paused slate, closed neutral; applications: applied blue, screening indigo, shortlisted violet, interview cyan, offer teal, hired green, rejected red, withdrawn gray.

## 6. Internationalization

- next-intl with `[locale]` segment; messages in `messages/en.json` and `messages/es.json`, namespaced by area (`marketing`, `auth`, `company`, `candidate`, `admin`, `assessments`, `emails`, `common`, `enums`).
- Enum labels (sectors, role families, statuses, contract types, CEFR descriptions) are translated from the `enums` namespace.
- Language preference stored in `profiles.locale`; on login redirect to the user's locale. Anonymous visitors keep the URL locale.
- Emails are sent in the recipient's locale.
- Dates formatted with the locale; currency always `USD 2,500 / month` style.

## 7. Data model

Postgres, schema `public`. `id` columns are `uuid default gen_random_uuid()`. `created_at`/`updated_at` are `timestamptz default now()`, with a generic `set_updated_at` trigger.

### 7.1 Enums

- `user_role`: company, candidate, admin
- `locale`: en, es
- `company_status`: pending, verified, suspended
- `company_size`: s1_10, s11_50, s51_200, s201_1000, s1000_plus
- `sector`: technology, financial_services, healthcare, professional_services, marketing, ecommerce_retail, real_estate, logistics, manufacturing, education, legal, other
- `role_family`: finance_accounting, software_engineering, data, customer_support, sales_sdr, marketing, design, operations_va, hr, legal, project_management, other
- `seniority`: junior, mid, senior, lead
- `cefr_level`: A1, A2, B1, B2, C1, C2
- `employment_type`: full_time, part_time
- `work_mode`: remote, hybrid, onsite
- `contract_type`: independent_contractor, dexee_eor, direct_hire, project_based
- `job_status`: draft, pending_review, changes_requested, published, paused, closed
- `availability`: immediate, two_weeks, one_month, three_months
- `candidate_visibility`: visible_to_companies, dexee_only
- `application_status`: applied, screening, shortlisted, interview, offer, hired, rejected, withdrawn
- `application_source`: candidate, dexee_recommended
- `note_visibility`: company, dexee_only
- `member_role`: owner, member
- `placement_status`: active, ended
- `assessment_type`: english_written, english_oral, psychometric, disc (added in Phase 10, see section 17)
- `question_type`: mcq, writing, audio, likert, situational
- `attempt_status`: in_progress, submitted, processing, ai_scored, pending_validation, validated, expired, failed

### 7.2 Tables

**profiles** — id (pk, fk auth.users on delete cascade), role user_role not null, full_name, email not null, locale locale default 'en', created_at, updated_at. Trigger `handle_new_user` on `auth.users` insert creates the row with role from `raw_user_meta_data->>'role'`, accepting only `company` or `candidate`; anything else becomes `candidate`. Admin promotion happens only through `scripts/promote-admin.ts`.

**companies** — id, owner_user_id fk profiles, name not null, legal_name, website, sector sector, country char(2) default 'US', state, city, size company_size, description, logo_path, status company_status default 'pending', verified_at, verified_by, created_at, updated_at.

**company_members** — id, company_id fk, user_id fk profiles null, invited_email, role member_role default 'member', invite_token unique, invited_by, accepted_at, created_at. Unique (company_id, user_id). The owner row is created with the company.

**jobs** — id, company_id fk, title not null, slug unique, role_family, seniority, description text, responsibilities text, requirements text, skills text[] default '{}', english_level_required cefr_level, employment_type, work_mode default 'remote', contract_type, hours_per_week int, timezone_overlap text, start_date date, salary_min_usd int, salary_max_usd int, show_salary bool default true, confidential_company bool default false, status job_status default 'draft', review_message text, published_at, closes_at, created_by fk profiles, created_at, updated_at. Check `salary_min_usd <= salary_max_usd`. Slug generated from title plus short id.

**job_commercials** — job_id pk fk jobs, client_bill_rate_usd int, placement_fee_usd int, internal_notes text, updated_by, updated_at. Admin only.

**candidates** — id pk fk profiles, first_name not null, last_name not null, headline, summary, country char(2) default 'CO', city, years_experience numeric(4,1), role_family, skills text[] default '{}', desired_roles text[] default '{}', desired_salary_min_usd int, availability, preferred_contract_types contract_type[] default '{}', english_self_level cefr_level, english_written_level cefr_level, english_oral_level cefr_level, english_verified_level cefr_level, english_verified_at, psychometric_completed_at, profile_completeness int default 0, visibility candidate_visibility default 'visible_to_companies', data_consent_at timestamptz not null, data_consent_version text not null, created_at, updated_at.

**candidate_contacts** — candidate_id pk fk candidates, email, phone, linkedin_url, portfolio_url, resume_path, updated_at. Restricted (see section 8).

**candidate_experience** — id, candidate_id fk, company, title, start_date date, end_date date, is_current bool, description, sort_order int.

**candidate_education** — id, candidate_id fk, institution, degree, field, start_year int, end_year int.

**applications** — id, job_id fk, candidate_id fk, status application_status default 'applied', source application_source default 'candidate', cover_note, contact_requested_at, contact_released bool default false, contact_released_by, contact_released_at, created_at, updated_at. Unique (job_id, candidate_id). Trigger on status change inserts into `application_events`.

**application_events** — id, application_id fk, from_status, to_status, note, actor_user_id, created_at.

**notes** — id, candidate_id fk, application_id fk null, author_user_id fk, body not null, visibility note_visibility, created_at.

**saved_candidates** — company_id fk, candidate_id fk, created_by, created_at. Primary key (company_id, candidate_id).

**placements** — id, application_id unique fk, company_id fk, candidate_id fk, contract_type, start_date date, end_date date, monthly_salary_usd int, monthly_bill_rate_usd int, status placement_status default 'active', created_by, created_at, updated_at. Admin only.

**assessments** — id, type assessment_type unique, title, description, version int default 1, is_active bool default false, time_limit_minutes int, cooldown_days int default 90, config jsonb (thresholds, prompts, item counts), created_at.

**assessment_questions** — id, assessment_id fk, section text, band cefr_level null, sort_order int, prompt text not null, question_type, options jsonb (array of {id, text}), answer_key jsonb (mcq: {correct: "b"}; situational: {best: "c"}; likert: {factor, reverse}), weight numeric default 1, factor text null, is_active bool default true, created_at. Never exposed to non-admin clients; served through the view in 7.3.

**assessment_attempts** — id, assessment_id fk, candidate_id fk, status attempt_status default 'in_progress', started_at, expires_at, submitted_at, ai_result jsonb, ai_level cefr_level, final_level cefr_level, final_score numeric, report jsonb, integrity jsonb (tab_leaves int, submitted_after_expiry bool), validated_by, validated_at, validation_comment, visible_to_companies bool default false, created_at, updated_at. Partial unique index: one row per (assessment_id, candidate_id) where status = 'in_progress'.

**assessment_answers** — id, attempt_id fk, question_id fk, answer_text, selected_option text, likert_value int, audio_path, audio_duration_seconds numeric, transcript text, ai_feedback jsonb, created_at. Unique (attempt_id, question_id).

**contact_requests** — id, name, email, company, request_type text check in (hire, talent, other), message, locale, created_at. Insert allowed to anon through a server action with rate limiting.

**notifications** — id, user_id fk, type text, title, body, link, read_at, created_at.

**admin_activity** — id, actor_user_id fk, action text, entity_type text, entity_id uuid, metadata jsonb, created_at. Written by every admin action.

**data_requests** — id, candidate_id fk, kind text check in (access, correction, deletion), status text default 'open', resolved_by, resolved_at, created_at.

### 7.3 Views and functions

- `public_jobs` (security definer, grant select to anon and authenticated): published jobs with title, slug, role_family, seniority, contract_type, employment_type, work_mode, english_level_required, skills, salary range only when `show_salary`, company name and logo unless `confidential_company` (then "Confidential" and null logo), published_at, closes_at.
- `assessment_questions_public` (security invoker): all columns of `assessment_questions` except `answer_key`, filtered to `is_active`.
- `candidate_cards` (security invoker): candidates joined to a computed `last_initial`, without contact fields; used by company pipelines and admin lists.
- `is_admin()`, `current_role()`, `user_company_ids()` (companies where the user is owner or accepted member), `company_can_view_candidate(candidate_id)` (exists an application from that candidate to a job of the user's companies, and the company is not suspended), `company_can_view_contact(candidate_id)` (same, and `contact_released = true`). All `security definer`, `stable`, search_path pinned.
- `assessment_cooldown_ok(assessment_id, candidate_id)` returns the next allowed date or null.
- `compute_profile_completeness(candidate_id)` returns 0–100 using weights: identity and headline 15, summary 10, at least one experience 20, education 10, skills (3+) 15, English self-level 10, salary and availability 10, resume 10.
- Triggers: `set_updated_at`, `handle_new_user`, `log_application_event`, `sync_candidate_english_levels` (after attempt validation or written scoring, updates `english_written_level`, `english_oral_level`, `english_verified_level`).

### 7.4 Indexes

`jobs(status, published_at desc)`, `jobs(company_id)`, `jobs using gin(skills)`, `applications(job_id, status)`, `applications(candidate_id)`, `candidates(role_family)`, `candidates(english_verified_level)`, `candidates using gin(skills)`, `assessment_attempts(candidate_id, assessment_id, status)`, `notifications(user_id, read_at)`, `admin_activity(created_at desc)`.

## 8. Access control (RLS)

Every table has RLS enabled. Service role bypasses RLS and is used only server-side.

| Table                                     | Anonymous                       | Candidate                                                                                    | Company user                                                                                                                     | Admin |
| ----------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----- |
| profiles                                  | none                            | own row: select, update (full_name, locale)                                                  | own row: select, update                                                                                                          | all   |
| companies                                 | none                            | none                                                                                         | select and update companies in `user_company_ids()`; insert with self as owner                                                   | all   |
| company_members                           | none                            | none                                                                                         | select members of own companies; owner inserts and deletes                                                                       | all   |
| jobs                                      | none (use public_jobs)          | none (use public_jobs)                                                                       | select, insert, update, delete for own companies; cannot set status to `published` unless company verified (enforced by trigger) | all   |
| job_commercials                           | none                            | none                                                                                         | none                                                                                                                             | all   |
| candidates                                | none                            | own row: select, insert, update                                                              | select via `company_can_view_candidate`                                                                                          | all   |
| candidate_contacts                        | none                            | own row                                                                                      | select via `company_can_view_contact`                                                                                            | all   |
| candidate_experience, candidate_education | none                            | own rows                                                                                     | select via `company_can_view_candidate`                                                                                          | all   |
| applications                              | none                            | own rows: select, insert (only to published jobs, cooldown none), update only to `withdrawn` | select and update status on applications to own companies' jobs; cannot set `contact_released`                                   | all   |
| application_events                        | none                            | own applications                                                                             | own companies' applications                                                                                                      | all   |
| notes                                     | none                            | none                                                                                         | select and insert `company` visibility on own companies' applications                                                            | all   |
| saved_candidates                          | none                            | none                                                                                         | own companies                                                                                                                    | all   |
| placements                                | none                            | none                                                                                         | none                                                                                                                             | all   |
| assessments                               | none                            | select active                                                                                | none                                                                                                                             | all   |
| assessment_questions                      | none                            | none (use view)                                                                              | none                                                                                                                             | all   |
| assessment_attempts                       | none                            | own rows: select, insert (cooldown enforced by trigger), update only `visible_to_companies`  | none                                                                                                                             | all   |
| assessment_answers                        | none                            | own attempts, only while `in_progress` for insert and update                                 | none                                                                                                                             | all   |
| contact_requests                          | none (insert via server action) | none                                                                                         | none                                                                                                                             | all   |
| notifications                             | none                            | own rows: select, update read_at                                                             | same                                                                                                                             | all   |
| admin_activity                            | none                            | none                                                                                         | none                                                                                                                             | all   |
| data_requests                             | none                            | own rows: select, insert                                                                     | none                                                                                                                             | all   |

Storage: bucket `logos` public read, write by company owners and admins under `companies/{company_id}/`; bucket `resumes` private, path `candidates/{candidate_id}/resume.pdf`, read by owner, admins, and companies via server-generated signed URLs (10 minutes) only when `company_can_view_contact`; bucket `assessment-audio` private, path `attempts/{attempt_id}/{question_id}.webm`, write by owner during `in_progress`, read by owner and admins via signed URLs.

`scripts/rls-test.ts` creates four users (candidate, company owner, second company owner, admin) plus seed data and asserts the matrix above, including the contact-release toggle and the cross-company isolation.

## 9. Authentication and onboarding

- Supabase Auth, email and password, email verification required before accessing `(app)` routes. Password reset flow. Google sign-in prepared behind a feature flag, off by default.
- Sign-up captures the role from the chosen path and passes it in `options.data.role`. Candidate sign-up form includes the Law 1581 consent checkbox; the server action rejects sign-up without it and, after the user exists, writes `candidates.data_consent_at` and `data_consent_version` (constant `CONSENT_VERSION` in `src/lib/legal.ts`).
- Company onboarding creates `companies` (status pending) and the owner row in `company_members`, then shows a banner: "Dexee verifies companies within one business day".
- Team invites: owner enters an email; server action creates a `company_members` row with `invite_token`, sends the invite email; `/invite/[token]` signs the user up as company role and links the membership.
- Admin invites: from `/admin/team`, server action uses the Auth admin API to invite by email and sets role admin in `profiles`.
- Sessions handled by `@supabase/ssr` in middleware and server components; role read from `profiles` per request (cached in the request scope).

## 10. Feature specification by area

### 10.1 Marketing site

- Home: hero "Vetted Colombian talent for US teams, hired in days" with an intent selector (I want to hire → /for-companies; I'm looking for a remote job → /for-talent; I want my English level assessed → /for-talent#assessments); metrics strip from a `site_metrics` constant editable in code (candidates in the database, average days to shortlist, client retention); three-step timeline (Today: post the role; In days: receive a Dexee-vetted shortlist; In weeks: hire and onboard through Dexee); four service cards (Headhunting; Staff augmentation with Dexee as employer of record; Free English assessment; Free work-style profile); testimonials from a constant; CTAs "Post a job" and "Book a call" (Calendly link placeholder).
- For Companies: value proposition, how it works, four contract options with explanations, pricing placeholder ("Talk to us"), FAQ (accordion), CTA.
- For Talent: value proposition, assessments explained with what the candidate receives, how applications work, FAQ, CTA "Create your profile".
- Jobs board: server-rendered list from `public_jobs` with filters (keyword, role family, seniority, contract type, work mode, minimum salary, English level) in the URL query string; job page at `/jobs/[slug]` with JobPosting JSON-LD; "Apply" sends anonymous visitors to `/sign-up/candidate?next=`.
- Contact form with rate limiting and honeypot; Privacy and Terms as MDX files per locale (`content/legal/{locale}/privacy.mdx`).

### 10.2 Company area

- Onboarding wizard: company details (name, legal name, website, sector, country, state, city, size, description, logo) and hiring needs (role families, expected hires this year, preferred contract types, stored in `companies.hiring_needs jsonb`).
- Job wizard, three steps, autosave to draft on each step:
  1. Role: title, role family, seniority, description, responsibilities, requirements, skills (TagInput with suggestions from existing skills), English level required. "Draft with AI" generates description, responsibilities and requirements from title, seniority, role family and up to five keywords; the company edits the result; the action is logged with tokens used.
  2. Compensation and contract: salary range USD/month, show-salary toggle, contract type (radio cards with explanations), employment type, hours per week, required overlap with US time zones (select: none, 2h, 4h, full ET/CT/MT/PT day), work mode, start date, confidential toggle.
  3. Review: preview as candidates see it; "Save draft" or "Submit". Submit publishes when the company is verified, otherwise sets `pending_review`. A job in `changes_requested` shows the admin message at the top of the wizard.
- Jobs list: DataTable with status chips, applicant counts by stage, dates; actions edit, pause, resume, close, duplicate.
- Pipeline per job: Kanban with the seven visible columns (applied, screening, shortlisted, interview, offer, hired, rejected; withdrawn shown in a collapsed list). Cards: first name and last initial, headline, years of experience, CefrBadge, WorkStyleBadge, source badge. Drag writes the status change through a server action (never optimistic without rollback). Card drawer: profile as allowed by RLS; contact block shows details or "Contact details available through Dexee" with "Request contact details" (sets `contact_requested_at`, notifies admins; button disabled after request); resume link only when released; company notes; save to shortlist.
- Candidates page: all applicants across jobs with filters; Shortlist page: saved candidates.
- Dashboard: open jobs, new applicants in the last 7 days, applicants by stage, pending actions (drafts, changes requested, contact requests pending).
- Settings: company profile, team (members list, invite, remove), notification preferences (`profiles.notification_prefs jsonb`).

### 10.3 Candidate area

- Onboarding wizard after consent, autosave per step, resumable: 1) identity and contact (first and last name, city, phone, LinkedIn, portfolio; contact fields write to `candidate_contacts`), 2) headline, summary, role family, skills, years of experience, 3) experience rows, 4) education rows, 5) English self-level with CEFR descriptions and desired roles, 6) expected salary USD/month, availability, preferred contract types, 7) resume upload (PDF, max 5 MB, virus-safe by type check and size; stored in `resumes`). Completeness meter with checklist of missing items.
- Job board (same component as public, inside the shell) and job page with one-click Apply plus optional note (max 600 chars); duplicate prevented by the unique constraint with a friendly message; withdraw available while status is before `offer`.
- Applications: list with StatusChip and per-application timeline from `application_events` (company-visible notes excluded).
- Assessments hub: three cards with state machine display (not started, in progress with time remaining, processing, pending Dexee validation, completed with level or bands, available again on date) and CTA. Result pages show scores allowed for the candidate, feedback and a PDF download (server-rendered with `@react-pdf/renderer`).
- Profile page with "Preview as a company sees it" toggle (renders `candidate_cards` fields plus badges, hides contact block).
- Dashboard: completeness, recommended jobs (same role family, English level required ≤ verified or self level, salary max ≥ expectation; top 6), application summary, assessment prompts.
- Settings: account (email, password, locale), privacy (work-style visibility, data access/correction/deletion requests), notifications.

### 10.4 Admin area

- Dashboard: companies pending, jobs pending review, applications last 7 days, contact requests pending, attempts pending validation, active placements, candidates by verified English level (bar), funnel of applications by status.
- Companies: DataTable with search and status filter; detail page with profile, members, jobs, internal notes; actions verify, suspend, reinstate, edit. Verification triggers company email and publishes any jobs waiting in `pending_review` that the admin selects.
- Jobs: queue tab (`pending_review`, `changes_requested`) and all-jobs tab; detail page with preview, edit, approve (→ published), request changes (message → `changes_requested`, email), pause, close; `job_commercials` panel editable here only.
- Candidates: DataTable with search by name, skills, role family, English levels, availability, city, completeness, visibility; tags (`candidate_tags` text[] on candidates); detail page with full profile including contacts and resume, applications, notes (`dexee_only`), assessment history; CSV export of the current filter (server action streaming, admin activity logged).
- Applications: DataTable across all jobs with filters; status change; "Release contact details" (sets `contact_released`, notifies and emails the company); "Recommend candidate to job" (dialog: choose job; creates application with `source = dexee_recommended`, status `shortlisted`; notifies company and candidate; candidate may withdraw).
- Placements: create from a `hired` application (contract type, start date, monthly salary, monthly bill rate); list active and ended with computed monthly margin and total monthly margin; end placement action.
- Assessments: validation queue of `pending_validation` attempts sorted oldest first; attempt page (see 11.2); thresholds and prompts editable in `assessments.config` from `/admin/settings` with version bump.
- Team: admins list, invite, deactivate. Activity: `admin_activity` log with filters.

## 11. Assessments

All banks are original content authored during the build (Phase 6) and stored in `supabase/seed/*.json`; no items copied from published tests. Scoring lives in `src/lib/assessments/*` as pure functions with unit tests; server actions call them.

### 11.1 English written

- Structure: 40 MCQ (14 grammar, 13 vocabulary, 13 reading across three short work-related passages) drawn at random from a bank of at least 60 active items respecting band quotas: 14 items band A2/B1, 14 band B2, 12 band C1/C2. Plus one writing task (bank of at least 6 prompts, e.g., write an email to a client explaining a delay and proposing a solution, 150–200 words). Single timer, 45 minutes, `expires_at = started_at + 45 min`; submissions after expiry plus 60 seconds grace are stored with `integrity.submitted_after_expiry = true` and excluded from the writing score.
- MCQ scoring: 1 point per correct item; accuracy per band. Initial level rule (thresholds in `assessments.config`, to be calibrated after 100 attempts): overall < 20% → A1; band1 < 70% → A2; band1 ≥ 70% and band2 < 55% → B1; band2 ≥ 55% and band3 < 50% → B2; band3 ≥ 50% and overall ≥ 75% → C1; band3 ≥ 80% and overall ≥ 90% → C2.
- Writing scoring: Anthropic model with a fixed rubric returning strict JSON: `task_achievement`, `coherence`, `lexical_range`, `grammatical_accuracy` each 0–5, `total` 0–20, `level` mapped 0–5 A2, 6–9 B1, 10–13 B2, 14–17 C1, 18–20 C2, `feedback` array of three short lines in the candidate's locale, `flags` {off_topic, too_short}. Temperature 0. Response validated with zod; on parse failure retry once, then mark attempt `failed` for admin retry.
- Final written level: the lower of MCQ level and writing level. If they differ by two or more levels, or any flag is set, status becomes `pending_validation` for a quick admin check; otherwise `validated` automatically. `candidates.english_written_level` is updated by the sync trigger.

### 11.2 English oral

- Four prompts (bank of at least 8, four drawn per attempt): introduce yourself and your experience; describe a work situation you resolved; explain a process from your field to a newcomer; respond to a client complaint. Candidate reads the prompt, has 20 seconds to prepare, records 60–90 seconds (MediaRecorder, `audio/webm;codecs=opus`, 48 kHz mono, max 3 MB per answer), may re-record once per prompt, then uploads through a signed URL. Microphone check before starting. No overall timer beyond per-answer limits; attempt expires 30 minutes after start.
- Processing (`/api/cron/process-attempts` every 5 minutes, plus an immediate trigger after submit using `after()`): status `processing`; each answer is transcribed (Whisper, language `en`, returns text and duration); words per minute computed; the model receives the four transcripts with durations and a rubric returning strict JSON per answer (`fluency`, `coherence`, `lexical_range`, `grammatical_accuracy` 0–5) and an overall `level` using the same 0–20 mapping on the average, plus `feedback` (three lines). Status → `pending_validation`. Failures after three retries → `failed`, admin notified.
- Validation page for admins: per answer an audio player (signed URL), transcript, AI scores; fields for pronunciation and intelligibility (0–5, reviewer-entered), final level override, comment; "Validate" writes `final_level`, `validated_by`, `validated_at`, notifies the candidate, and the sync trigger updates `english_oral_level`, `english_verified_level` and `english_verified_at`. "Reject" (bad audio) resets the cooldown so the candidate can retake within 7 days.
- Only validated oral levels appear as "verified by Dexee".

### 11.3 Work-style profile (psychometric screening)

- Instrument: the public-domain IPIP 50-item Big Five inventory (factors: extraversion, agreeableness, conscientiousness, emotional_stability, intellect), 10 items per factor, Likert 1–5, with reverse-keyed items flagged in `answer_key`. Items and keys loaded from `supabase/seed/ipip50.json` (transcribed from ipip.ori.org, cited in `docs/DECISIONS.md`). Plus 10 original situational judgment items about remote work (written communication, autonomy, reliability, handling ambiguity, client orientation), four options each, one best answer.
- Scoring: factor raw = sum of item values with reversed items as `6 − value`, range 10–50, scaled to 0–100 as `(raw − 10) / 40 × 100`; bands low < 40, mid 40–60, high > 60. SJT score 0–10.
- Report generated deterministically from templates (no LLM): per factor a neutral descriptor for its band from `src/lib/assessments/workstyle-copy.{en,es}.ts` (working preferences, environments where the person tends to perform well), SJT summary, three strengths derived from the two highest factors and SJT ≥ 7. No time limit; attempt expires after 24 hours.
- Candidate sees full report with scales. Companies see band descriptors only when `visible_to_companies` is on (toggle in candidate settings and on the result page). Admins see everything.

### 11.3a DISC work profile (Phase 10)

- Instrument: 28 original Likert items (1–5) on the four-factor model of workplace behaviour (dominance, influence, steadiness, conscientiousness), seven per style, two reverse-keyed, in `supabase/seed/disc.json`. Generic "DISC"; never presented as a certified DiSC(R) product.
- Scoring (`src/lib/assessments/disc.ts`, no LLM): style raw = sum with reversed items as `6 − value`, range 7–35, scaled `(raw − 7) / 28 × 100`, bands as in 11.3; unanswered items count as the midpoint. Primary style = highest scaled; secondary = second highest when within 15 points, else none. Report from templates in `disc-copy.{en,es}.ts` with a headline, one descriptor per style and a fixed disclaimer.
- Visibility and lifecycle as in 11.3: candidate sees scales, companies see band descriptors when shared, no time limit, attempt expires after 24 hours. Shipped inactive; activation procedure in `docs/RUNBOOK.md`.

### 11.4 Integrity and lifecycle

- Server-side expiry; one `in_progress` attempt per assessment; cooldown enforced by trigger and surfaced as "available again on".
- Client logs tab-visibility changes as a counter in `integrity.tab_leaves` (informational only).
- Attempts `in_progress` past expiry are moved to `expired` by the cron; expired attempts do not consume the cooldown.

## 12. Notifications and email

Events, recipients and templates (`emails/<template>.tsx`, bilingual):

| Event                                                             | Recipient                | In-app | Email template                                               |
| ----------------------------------------------------------------- | ------------------------ | ------ | ------------------------------------------------------------ |
| Sign-up                                                           | user                     | no     | verify-email                                                 |
| Company verified / suspended                                      | company users            | yes    | company-status                                               |
| Job approved / changes requested / published                      | company users            | yes    | job-status                                                   |
| New application                                                   | company users            | yes    | new-application (digest: at most one email per job per hour) |
| Application status changed                                        | candidate                | yes    | application-status                                           |
| Contact requested                                                 | admins                   | yes    | none                                                         |
| Contact released                                                  | company users            | yes    | contact-released                                             |
| Dexee recommendation                                              | company users, candidate | yes    | recommendation                                               |
| Assessment scored (written), pending validation (oral), validated | candidate                | yes    | assessment-result                                            |
| Team invite / admin invite                                        | invitee                  | no     | invite                                                       |
| Hired → placement pending                                         | admins                   | yes    | none                                                         |
| Data request created                                              | admins                   | yes    | none                                                         |

`notifications` rows are inserted by the same server action that performs the change. Emails are sent through a queue table `email_outbox` (id, to, template, payload, locale, status, attempts, sent_at) processed by `/api/cron/process-outbox` every 5 minutes, so a Resend outage never blocks a user action. Unsubscribe applies to digests only; transactional emails always send.

## 13. SEO and analytics

- Metadata per marketing page per locale; Open Graph image; `hreflang` alternates; `sitemap.xml` including published jobs; `robots.txt` excluding `(app)` routes.
- JobPosting JSON-LD on each public job page: title, description (HTML), datePosted, validThrough, employmentType (FULL_TIME/PART_TIME/CONTRACTOR), hiringOrganization (company name, or "Dexee" when confidential), jobLocationType TELECOMMUTE, applicantLocationRequirements Colombia, baseSalary (USD, MONTH, min–max) only when `show_salary`, identifier (job id).
- Analytics: Plausible or GA4 behind `NEXT_PUBLIC_ANALYTICS_PROVIDER`; cookie notice only when GA4 is enabled.

## 14. Integrations

- Anthropic: `src/lib/ai/anthropic.ts` with a single `completeJson(schema, system, user)` helper; every prompt lives in `src/lib/ai/prompts/*.ts` with a version string; usage logged to `ai_usage` (id, feature, model, input_tokens, output_tokens, cost_estimate, created_at).
- Speech-to-text: `src/lib/ai/transcription.ts` exposes `transcribe(fileUrl): { text, durationSeconds }` with the Whisper implementation; provider chosen by env.
- Resend: `src/lib/email/send.ts`; templates in `emails/`; from `EMAIL_FROM`; reply-to Dexee inbox.
- Rate limiting: Upstash Ratelimit when configured, in-memory fallback in development.

## 15. Non-functional requirements

- Security: CSP and standard security headers in `next.config`; server-only imports for service-role code (`server-only` package); signed URLs with 10-minute expiry; upload validation by size and MIME; every admin mutation writes `admin_activity`; auth and public forms rate limited; dependency audit in CI.
- Privacy: data minimization; consent versioning; data request handling; retention rule documented (assessment audio deleted 12 months after validation via cron).
- Performance: server components and streaming; pagination everywhere (25 per page); indexes in 7.4; images through `next/image`; Lighthouse ≥ 90 on marketing pages.
- Accessibility: WCAG 2.1 AA basics verified with axe in e2e for the wizards and the board.
- Observability: structured logs (pino) with request ids; Sentry behind `SENTRY_DSN`; `/api/health` checks database connectivity.
- Testing: unit tests for scoring, level mapping, completeness, slug generation and validation schemas; RLS tests; e2e for the flows in `docs/PHASES.md`; CI on every pull request (lint, typecheck, unit, build; e2e on main with secrets).
- Environments: local (`.env.local`), dev (Supabase dev project, Vercel preview), production (Supabase prod, Vercel production, domain dexeegroup.com). Migrations promoted with `supabase db push` per environment; never edit production by hand.

Environment variables: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` (scripts only), `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`, `NEXT_PUBLIC_ANALYTICS_PROVIDER`, `NEXT_PUBLIC_ANALYTICS_ID`, `CALENDLY_URL`.

## 16. Assumptions and open items

- Brand palette and font: placeholders in section 5 until Dexee provides them.
- Legal texts (privacy policy, terms, consent wording): placeholders per locale to be replaced before launch.
- Pricing is not shown; "Talk to us" until Dexee decides.
- Assessment thresholds are initial values to calibrate with real data.
- Dexee will operate `dexee_eor` placements; if not, remove the option from the enum labels shown in the UI (keep the enum value).

## 17. Phase 10 amendment — mandatory assessments, validity and fit analysis

Requested by Dexee on 2026-09-20 and built in Phase 10. Where this section and the sections above disagree, this section wins.

- **Four free assessments, all required to apply.** `assessments.required_to_apply bool` (default true for the four seeded rows). A candidate may register, complete the profile and browse jobs without them; sending an application requires a valid result for every active required assessment plus a resume on file. The candidate assessments hub (10.3) shows four cards, not three.
- **Validity.** `assessments.validity_days int` (1–90, default 90). `assessment_attempts.valid_until timestamptz` is set by trigger `attempts_set_validity` to `validated_at + validity_days` when an attempt becomes `validated`, and is null otherwise. A result is valid while `valid_until > now()`. Expired results stay visible to the candidate as history and count for nothing else. The 90-day cooldown in 11.4 is unchanged.
- **Apply gate.** `candidate_apply_requirements(candidate_id)` returns one row per requirement (`english_written`, `english_oral`, `psychometric`, `disc`, `resume`) with `satisfied` and `valid_until`; callable only by the candidate, an admin or the service role. Trigger `applications_before_insert` raises `requirements_missing:<comma list>` for `source = 'candidate'` inserts by a non-admin user. `applyToJob` checks the function first and returns the list to the UI, which links each pending item to the assessment or the resume step.
- **Valid results travel with the application.** `candidate_valid_results(candidate_id)` returns the latest valid attempt per type (type, level, score, `valid_until`, and `bands` for psychometric and disc only when `visible_to_companies`), gated by self, admin or `company_can_view_candidate`. Pipeline cards and the applicant drawer render from it. `visible_to_companies` defaults to true on first validation of psychometric and disc; the candidate can turn either off in Settings.
- **Fit analysis.** Table `application_fit` (pk `application_id`, status pending/ready/failed/skipped, score 0–100, summary, strengths[], gaps[], evidence jsonb, model, prompt_version, inputs_hash, attempts, last_error, computed_at). RLS: admins all; a company reads rows for applications to its jobs; candidates never read it; anon revoked. Computed server-side after each application with `after()` and retried by `/api/cron/process-attempts` (max 3 attempts). Inputs: job fields, candidate profile, valid results and the resume text extracted with `unpdf` and passed through `src/lib/resume/redact.ts`, which removes contact data and any line mentioning protected attributes before the model sees it. Prompt `candidate-fit.v1` in `src/lib/ai/prompts/candidate-fit.ts`; response validated with zod; work profiles are context and may not lower a score. Without `ANTHROPIC_API_KEY` rows are `skipped` with `last_error = ai_unavailable`.
- **Company report.** The pipeline page shows a recommended panel: applicants ranked by fit score (ties by earlier application), top 3 and top 5 tiers, and under every applicant, ranked or pending, the evaluated profile from `candidate_valid_results`: English oral and written CEFR levels, Big Five factors outside the mid range and DISC styles outside the mid range (or "not shared" when the candidate hid a profile). Pending and skipped states are shown, and a refresh action is limited to five applications per call. The panel informs interviews; it never changes an application's stage or hides an applicant.
- **Marketing.** `/for-talent`, `/how-we-verify`, `/sample-report`, `/pricing` describe four assessments, 90-day validity, the apply requirement and the fit report. The former "role skills" check, which never existed, is removed (see `docs/CLAIMS.md`).
- **Unchanged.** Rules 1–9 of CLAUDE.md; answer keys server-side; contact release; the pricing and guarantee content of Phase 9.
