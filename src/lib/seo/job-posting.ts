import type { PublicJob } from "@/server/services/public-jobs";

export type JobPostingJsonLd = {
  "@context": "https://schema.org";
  "@type": "JobPosting";
  title: string;
  description: string;
  datePosted: string;
  validThrough?: string;
  employmentType: ("FULL_TIME" | "PART_TIME" | "CONTRACTOR")[];
  hiringOrganization: { "@type": "Organization"; name: string; logo?: string };
  jobLocationType: "TELECOMMUTE";
  applicantLocationRequirements: { "@type": "Country"; name: "Colombia" };
  identifier: { "@type": "PropertyValue"; name: "Dexee"; value: string };
  baseSalary?: {
    "@type": "MonetaryAmount";
    currency: "USD";
    value: {
      "@type": "QuantitativeValue";
      minValue?: number;
      maxValue?: number;
      unitText: "MONTH";
    };
  };
  directApply: boolean;
  url: string;
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paragraphs(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .split(/\n{2,}|\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line.startsWith("- ")
        ? `<li>${escapeHtml(line.slice(2))}</li>`
        : `<p>${escapeHtml(line)}</p>`,
    )
    .join("")
    .replace(/(<li>.*?<\/li>)+/g, (m) => `<ul>${m}</ul>`);
}

export function employmentTypeFor(
  job: Pick<PublicJob, "employment_type" | "contract_type">,
): JobPostingJsonLd["employmentType"] {
  const types: JobPostingJsonLd["employmentType"] = [];
  if (job.employment_type === "part_time") types.push("PART_TIME");
  else types.push("FULL_TIME");
  if (job.contract_type === "independent_contractor" || job.contract_type === "project_based")
    types.push("CONTRACTOR");
  return types;
}

export function buildJobPostingJsonLd(
  job: PublicJob,
  opts: { siteUrl: string; locale: string; publicLogoUrl?: string | null },
): JobPostingJsonLd {
  const description = [
    paragraphs(job.description),
    job.responsibilities ? `<h3>Responsibilities</h3>${paragraphs(job.responsibilities)}` : "",
    job.requirements ? `<h3>Requirements</h3>${paragraphs(job.requirements)}` : "",
  ].join("");

  const posted = job.published_at ?? new Date().toISOString();
  const validThrough =
    job.closes_at ?? new Date(new Date(posted).getTime() + 60 * 24 * 3600 * 1000).toISOString();
  const hiring: JobPostingJsonLd["hiringOrganization"] = job.confidential_company
    ? { "@type": "Organization", name: "Dexee" }
    : {
        "@type": "Organization",
        name: job.company_name ?? "Dexee",
        ...(opts.publicLogoUrl ? { logo: opts.publicLogoUrl } : {}),
      };

  const jsonLd: JobPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title ?? "",
    description: description || `<p>${escapeHtml(job.title ?? "")}</p>`,
    datePosted: posted,
    validThrough,
    employmentType: employmentTypeFor(job),
    hiringOrganization: hiring,
    jobLocationType: "TELECOMMUTE",
    applicantLocationRequirements: { "@type": "Country", name: "Colombia" },
    identifier: { "@type": "PropertyValue", name: "Dexee", value: job.id ?? "" },
    directApply: true,
    url: `${opts.siteUrl}/${opts.locale}/jobs/${job.slug}`,
  };

  if (job.show_salary && (job.salary_min_usd !== null || job.salary_max_usd !== null)) {
    jsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        ...(job.salary_min_usd !== null ? { minValue: job.salary_min_usd } : {}),
        ...(job.salary_max_usd !== null ? { maxValue: job.salary_max_usd } : {}),
        unitText: "MONTH",
      },
    };
  }
  return jsonLd;
}
