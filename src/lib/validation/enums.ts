import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export const ROLE_FAMILIES = [
  "finance_accounting",
  "software_engineering",
  "data",
  "customer_support",
  "sales_sdr",
  "marketing",
  "design",
  "operations_va",
  "hr",
  "legal",
  "project_management",
  "other",
] as const satisfies readonly Enums["role_family"][];
export const SENIORITIES = [
  "junior",
  "mid",
  "senior",
  "lead",
] as const satisfies readonly Enums["seniority"][];
export const CEFR_LEVELS = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const satisfies readonly Enums["cefr_level"][];
export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
] as const satisfies readonly Enums["employment_type"][];
export const WORK_MODES = [
  "remote",
  "hybrid",
  "onsite",
] as const satisfies readonly Enums["work_mode"][];
export const CONTRACT_TYPES = [
  "independent_contractor",
  "dexee_eor",
  "direct_hire",
  "project_based",
] as const satisfies readonly Enums["contract_type"][];
export const JOB_STATUSES = [
  "draft",
  "pending_review",
  "changes_requested",
  "published",
  "paused",
  "closed",
] as const satisfies readonly Enums["job_status"][];
export const APPLICATION_STATUSES = [
  "applied",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
] as const satisfies readonly Enums["application_status"][];
export const AVAILABILITIES = [
  "immediate",
  "two_weeks",
  "one_month",
  "three_months",
] as const satisfies readonly Enums["availability"][];
export const SECTORS = [
  "technology",
  "financial_services",
  "healthcare",
  "professional_services",
  "marketing",
  "ecommerce_retail",
  "real_estate",
  "logistics",
  "manufacturing",
  "education",
  "legal",
  "other",
] as const satisfies readonly Enums["sector"][];
export const COMPANY_SIZES = [
  "s1_10",
  "s11_50",
  "s51_200",
  "s201_1000",
  "s1000_plus",
] as const satisfies readonly Enums["company_size"][];
export const COMPANY_STATUSES = [
  "pending",
  "verified",
  "suspended",
] as const satisfies readonly Enums["company_status"][];
export const TIMEZONE_OVERLAPS = [
  "none",
  "2h",
  "4h",
  "full_et",
  "full_ct",
  "full_mt",
  "full_pt",
] as const;
export const ASSESSMENT_TYPES = [
  "english_written",
  "english_oral",
  "psychometric",
] as const satisfies readonly Enums["assessment_type"][];
export const LOCALES = ["en", "es"] as const satisfies readonly Enums["locale"][];

export const CEFR_RANK: Record<Enums["cefr_level"], number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};
export function cefrMin(
  a: Enums["cefr_level"] | null,
  b: Enums["cefr_level"] | null,
): Enums["cefr_level"] | null {
  if (!a) return b;
  if (!b) return a;
  return CEFR_RANK[a] <= CEFR_RANK[b] ? a : b;
}
