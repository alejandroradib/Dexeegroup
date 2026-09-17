-- Core tables (SPEC 7.2)

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text,
  email text not null,
  locale public.locale not null default 'en',
  notification_prefs jsonb not null default '{"digest": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete restrict,
  name text not null,
  legal_name text,
  website text,
  sector public.sector,
  country char(2) not null default 'US',
  state text,
  city text,
  size public.company_size,
  description text,
  logo_path text,
  hiring_needs jsonb not null default '{}'::jsonb,
  status public.company_status not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  invited_email text,
  role public.member_role not null default 'member',
  invite_token text unique,
  invited_by uuid references public.profiles (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, user_id),
  check (user_id is not null or invited_email is not null)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  slug text unique,
  role_family public.role_family,
  seniority public.seniority,
  description text,
  responsibilities text,
  requirements text,
  skills text[] not null default '{}',
  english_level_required public.cefr_level,
  employment_type public.employment_type,
  work_mode public.work_mode not null default 'remote',
  contract_type public.contract_type,
  hours_per_week int check (hours_per_week is null or hours_per_week between 1 and 60),
  timezone_overlap text,
  start_date date,
  salary_min_usd int check (salary_min_usd is null or salary_min_usd >= 0),
  salary_max_usd int check (salary_max_usd is null or salary_max_usd >= 0),
  show_salary boolean not null default true,
  confidential_company boolean not null default false,
  status public.job_status not null default 'draft',
  review_message text,
  published_at timestamptz,
  closes_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_salary_range check (
    salary_min_usd is null or salary_max_usd is null or salary_min_usd <= salary_max_usd
  )
);

create table public.job_commercials (
  job_id uuid primary key references public.jobs (id) on delete cascade,
  client_bill_rate_usd int,
  placement_fee_usd int,
  internal_notes text,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create table public.candidates (
  id uuid primary key references public.profiles (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  headline text,
  summary text,
  country char(2) not null default 'CO',
  city text,
  years_experience numeric(4,1) check (years_experience is null or years_experience >= 0),
  role_family public.role_family,
  skills text[] not null default '{}',
  desired_roles text[] not null default '{}',
  desired_salary_min_usd int check (desired_salary_min_usd is null or desired_salary_min_usd >= 0),
  availability public.availability,
  preferred_contract_types public.contract_type[] not null default '{}',
  english_self_level public.cefr_level,
  english_written_level public.cefr_level,
  english_oral_level public.cefr_level,
  english_verified_level public.cefr_level,
  english_verified_at timestamptz,
  psychometric_completed_at timestamptz,
  profile_completeness int not null default 0 check (profile_completeness between 0 and 100),
  visibility public.candidate_visibility not null default 'visible_to_companies',
  candidate_tags text[] not null default '{}',
  data_consent_at timestamptz not null,
  data_consent_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidate_contacts (
  candidate_id uuid primary key references public.candidates (id) on delete cascade,
  email text,
  phone text,
  linkedin_url text,
  portfolio_url text,
  resume_path text,
  updated_at timestamptz not null default now()
);

create table public.candidate_experience (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  company text not null,
  title text not null,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  sort_order int not null default 0
);

create table public.candidate_education (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  institution text not null,
  degree text,
  field text,
  start_year int,
  end_year int
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  status public.application_status not null default 'applied',
  source public.application_source not null default 'candidate',
  cover_note text check (cover_note is null or char_length(cover_note) <= 600),
  contact_requested_at timestamptz,
  contact_released boolean not null default false,
  contact_released_by uuid references public.profiles (id),
  contact_released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  note text,
  actor_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
  author_user_id uuid not null references public.profiles (id),
  body text not null,
  visibility public.note_visibility not null default 'dexee_only',
  created_at timestamptz not null default now()
);

create table public.saved_candidates (
  company_id uuid not null references public.companies (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (company_id, candidate_id)
);

create table public.placements (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications (id),
  company_id uuid not null references public.companies (id),
  candidate_id uuid not null references public.candidates (id),
  contract_type public.contract_type not null,
  start_date date not null,
  end_date date,
  monthly_salary_usd int not null check (monthly_salary_usd >= 0),
  monthly_bill_rate_usd int not null check (monthly_bill_rate_usd >= 0),
  status public.placement_status not null default 'active',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  type public.assessment_type not null unique,
  title text not null,
  description text,
  version int not null default 1,
  is_active boolean not null default false,
  time_limit_minutes int,
  cooldown_days int not null default 90,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  section text not null,
  band public.cefr_level,
  sort_order int not null default 0,
  prompt text not null,
  question_type public.question_type not null,
  options jsonb,
  answer_key jsonb,
  weight numeric not null default 1,
  factor text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  status public.attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  submitted_at timestamptz,
  question_ids uuid[] not null default '{}',
  ai_result jsonb,
  ai_level public.cefr_level,
  final_level public.cefr_level,
  final_score numeric,
  report jsonb,
  integrity jsonb not null default '{"tab_leaves": 0, "submitted_after_expiry": false}'::jsonb,
  processing_attempts int not null default 0,
  validated_by uuid references public.profiles (id),
  validated_at timestamptz,
  validation_comment text,
  visible_to_companies boolean not null default false,
  cooldown_waived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index assessment_attempts_one_open
  on public.assessment_attempts (assessment_id, candidate_id)
  where status = 'in_progress';

create table public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts (id) on delete cascade,
  question_id uuid not null references public.assessment_questions (id),
  answer_text text,
  selected_option text,
  likert_value int check (likert_value is null or likert_value between 1 and 5),
  audio_path text,
  audio_duration_seconds numeric,
  transcript text,
  ai_feedback jsonb,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  request_type text not null check (request_type in ('hire', 'talent', 'other')),
  message text not null,
  locale public.locale not null default 'en',
  ip_hash text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  kind text not null check (kind in ('access', 'correction', 'deletion')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  message text,
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  "to" text not null,
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  locale public.locale not null default 'en',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts int not null default 0,
  last_error text,
  dedupe_key text unique,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_estimate numeric(10,6) not null default 0,
  actor_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Indexes (SPEC 7.4)
create index jobs_status_published_idx on public.jobs (status, published_at desc);
create index jobs_company_idx on public.jobs (company_id);
create index jobs_skills_idx on public.jobs using gin (skills);
create index applications_job_status_idx on public.applications (job_id, status);
create index applications_candidate_idx on public.applications (candidate_id);
create index candidates_role_family_idx on public.candidates (role_family);
create index candidates_verified_level_idx on public.candidates (english_verified_level);
create index candidates_skills_idx on public.candidates using gin (skills);
create index attempts_candidate_idx on public.assessment_attempts (candidate_id, assessment_id, status);
create index notifications_user_idx on public.notifications (user_id, read_at);
create index admin_activity_created_idx on public.admin_activity (created_at desc);
create index company_members_user_idx on public.company_members (user_id);
create index email_outbox_status_idx on public.email_outbox (status, scheduled_for);
create index contact_requests_ip_idx on public.contact_requests (ip_hash, created_at desc);
