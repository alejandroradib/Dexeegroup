/**
 * The job fields an applicant decided on (audit D4). When a company withdraws a live job to
 * edit it, these are snapshotted; on resubmission the snapshot is compared and every active
 * applicant is told what changed.
 */
export const MATERIAL_TERMS = [
  "salary_min_usd",
  "salary_max_usd",
  "contract_type",
  "employment_type",
  "seniority",
  "english_level_required",
  "work_mode",
  "hours_per_week",
] as const;

export type MaterialTerm = (typeof MATERIAL_TERMS)[number];
export type MaterialTerms = Record<MaterialTerm, string | number | null>;
export type TermChange = {
  field: MaterialTerm;
  before: string | number | null;
  after: string | number | null;
};

type JobLike = Partial<Record<MaterialTerm, string | number | null | undefined>>;

export function snapshotMaterialTerms(job: JobLike): MaterialTerms {
  const out = {} as MaterialTerms;
  for (const field of MATERIAL_TERMS) out[field] = job[field] ?? null;
  return out;
}

export function diffMaterialTerms(before: MaterialTerms, after: MaterialTerms): TermChange[] {
  const changes: TermChange[] = [];
  for (const field of MATERIAL_TERMS) {
    const a = before[field] ?? null;
    const b = after[field] ?? null;
    if (a !== b) changes.push({ field, before: a, after: b });
  }
  return changes;
}

/** Bilingual field labels for the notification body; values are shown as stored. */
export const TERM_LABELS: Record<MaterialTerm, { en: string; es: string }> = {
  salary_min_usd: { en: "minimum salary (USD/month)", es: "salario mínimo (USD/mes)" },
  salary_max_usd: { en: "maximum salary (USD/month)", es: "salario máximo (USD/mes)" },
  contract_type: { en: "contract type", es: "tipo de contrato" },
  employment_type: { en: "employment type", es: "tipo de empleo" },
  seniority: { en: "seniority", es: "seniority" },
  english_level_required: { en: "English level required", es: "nivel de inglés requerido" },
  work_mode: { en: "work mode", es: "modalidad" },
  hours_per_week: { en: "hours per week", es: "horas por semana" },
};

export function describeChanges(changes: TermChange[], locale: "en" | "es"): string {
  const none = locale === "es" ? "sin dato" : "not set";
  return changes
    .map((c) => `${TERM_LABELS[c.field][locale]}: ${c.before ?? none} → ${c.after ?? none}`)
    .join("; ");
}

/** Application statuses whose candidates are still in the running and must be told. */
export const ACTIVE_APPLICATION_STATUSES = [
  "applied",
  "screening",
  "shortlisted",
  "interview",
  "offer",
] as const;
