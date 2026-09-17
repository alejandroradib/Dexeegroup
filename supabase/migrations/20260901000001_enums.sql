-- Enumerated types (SPEC 7.1)
create type public.user_role as enum ('company', 'candidate', 'admin');
create type public.locale as enum ('en', 'es');
create type public.company_status as enum ('pending', 'verified', 'suspended');
create type public.company_size as enum ('s1_10', 's11_50', 's51_200', 's201_1000', 's1000_plus');
create type public.sector as enum (
  'technology', 'financial_services', 'healthcare', 'professional_services', 'marketing',
  'ecommerce_retail', 'real_estate', 'logistics', 'manufacturing', 'education', 'legal', 'other'
);
create type public.role_family as enum (
  'finance_accounting', 'software_engineering', 'data', 'customer_support', 'sales_sdr',
  'marketing', 'design', 'operations_va', 'hr', 'legal', 'project_management', 'other'
);
create type public.seniority as enum ('junior', 'mid', 'senior', 'lead');
create type public.cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
create type public.employment_type as enum ('full_time', 'part_time');
create type public.work_mode as enum ('remote', 'hybrid', 'onsite');
create type public.contract_type as enum ('independent_contractor', 'dexee_eor', 'direct_hire', 'project_based');
create type public.job_status as enum ('draft', 'pending_review', 'changes_requested', 'published', 'paused', 'closed');
create type public.availability as enum ('immediate', 'two_weeks', 'one_month', 'three_months');
create type public.candidate_visibility as enum ('visible_to_companies', 'dexee_only');
create type public.application_status as enum ('applied', 'screening', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn');
create type public.application_source as enum ('candidate', 'dexee_recommended');
create type public.note_visibility as enum ('company', 'dexee_only');
create type public.member_role as enum ('owner', 'member');
create type public.placement_status as enum ('active', 'ended');
create type public.assessment_type as enum ('english_written', 'english_oral', 'psychometric');
create type public.question_type as enum ('mcq', 'writing', 'audio', 'likert', 'situational');
create type public.attempt_status as enum ('in_progress', 'submitted', 'processing', 'ai_scored', 'pending_validation', 'validated', 'expired', 'failed');
