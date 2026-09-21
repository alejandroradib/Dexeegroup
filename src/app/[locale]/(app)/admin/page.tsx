import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { APPLICATION_STATUSES, CEFR_LEVELS } from "@/lib/validation/enums";
import { getAdminDashboard, type AdoptionMetrics } from "@/server/services/admin";
import { getEmailHealth } from "@/server/services/outbox";

const ADOPTION_KEYS = [
  "registered",
  "withResume",
  "withAssessment",
  "allAssessments",
  "withInterview",
  "applied",
  "hired",
] as const satisfies readonly (keyof AdoptionMetrics)[];

export default async function AdminDashboardPage({ params }: PageProps<"/[locale]/admin">) {
  const locale = await pageLocale(params);
  // getEmailHealth reads with the service role; the admin role is verified here, on the page
  // that uses it (decision 63), not left to the proxy.
  await requireRole("admin", locale);
  const [t, te, stats, email] = await Promise.all([
    getTranslations("admin.dashboard"),
    getTranslations("enums"),
    getAdminDashboard(),
    getEmailHealth(),
  ]);
  const emailProblems = email.pendingOver15m + email.failed24h + email.skippedNoProvider;
  const emailAttention = !email.providerConfigured || emailProblems > 0;
  const link = (href: string) => (
    <Link href={href} className="text-link text-sm hover:underline">
      {t("review")}
    </Link>
  );
  const maxLevel = Math.max(1, ...Object.values(stats.candidatesByLevel));
  const maxFunnel = Math.max(1, ...Object.values(stats.funnel));
  return (
    <>
      <PageHeader title={t("title")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={t("companiesPending")}
          value={stats.companiesPending}
          action={link("/admin/companies?status=pending")}
        />
        <StatCard
          label={t("jobsPending")}
          value={stats.jobsPendingReview}
          action={link("/admin/jobs")}
        />
        <StatCard
          label={t("applications7d")}
          value={stats.applications7d}
          action={link("/admin/applications")}
        />
        <StatCard
          label={t("leadsThisWeek")}
          value={stats.leadsThisWeek}
          hint={
            stats.leadsAwaiting > 0 ? t("leadsAwaiting", { count: stats.leadsAwaiting }) : undefined
          }
          action={link("/admin/leads?status=new")}
        />
        <StatCard
          label={t("leadResponse")}
          value={
            stats.medianLeadResponseHours === null
              ? "—"
              : t("leadResponseValue", { hours: stats.medianLeadResponseHours })
          }
          hint={t("leadAnswerRate", { rate: stats.leadToAnswerRate })}
          action={link("/admin/leads?status=answered")}
        />
        <StatCard
          label={t("contactRequests")}
          value={stats.contactRequestsPending}
          action={link("/admin/applications?contact=requested")}
        />
        <StatCard
          label={t("attemptsPending")}
          value={stats.attemptsPendingValidation}
          action={link("/admin/assessments")}
        />
        <StatCard
          label={t("activePlacements")}
          value={stats.activePlacements}
          action={link("/admin/placements")}
        />
        <StatCard
          label={t("emailHealth")}
          value={email.providerConfigured ? emailProblems : "—"}
          hint={
            !email.providerConfigured
              ? t("emailHealthNoProvider")
              : emailProblems > 0
                ? t("emailHealthDetail", {
                    pending: email.pendingOver15m,
                    failed: email.failed24h,
                    skipped: email.skippedNoProvider,
                  })
                : t("emailHealthOk")
          }
          tone={emailAttention ? "attention" : "neutral"}
        />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="border-border rounded-[12px] border bg-white p-5">
          <h2 className="text-base">{t("byLevel")}</h2>
          <ul className="mt-4 grid gap-2">
            {[...CEFR_LEVELS, "none" as const].map((level) => (
              <li
                key={level}
                className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-sm"
              >
                <span className="text-muted-foreground">
                  {level === "none" ? t("notVerified") : level}
                </span>
                <div className="bg-mist h-2 rounded-full">
                  <div
                    className={`h-2 rounded-full ${level === "none" ? "bg-slate" : "bg-green"}`}
                    style={{ width: `${(stats.candidatesByLevel[level] / maxLevel) * 100}%` }}
                  />
                </div>
                <span className="text-right font-medium">{stats.candidatesByLevel[level]}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="border-border rounded-[12px] border bg-white p-5">
          <h2 className="text-base">{t("funnel")}</h2>
          <ul className="mt-4 grid gap-2">
            {APPLICATION_STATUSES.map((status) => (
              <li
                key={status}
                className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-sm"
              >
                <span className="text-muted-foreground">{te(`application_status.${status}`)}</span>
                <div className="bg-mist h-2 rounded-full">
                  <div
                    className="bg-navy h-2 rounded-full"
                    style={{ width: `${(stats.funnel[status] / maxFunnel) * 100}%` }}
                  />
                </div>
                <span className="text-right font-medium">{stats.funnel[status]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="border-border mt-6 rounded-[12px] border bg-white p-5">
        <h2 className="text-base">{t("adoptionTitle")}</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {ADOPTION_KEYS.map((key) => (
            <li
              key={key}
              className="grid grid-cols-[1fr_40px] items-center gap-3 text-sm sm:grid-cols-[200px_1fr_40px]"
            >
              <span className="text-muted-foreground">{t(key)}</span>
              <span
                className="bg-mist hidden h-2 overflow-hidden rounded-full sm:block"
                aria-hidden
              >
                <span
                  className="bg-green block h-2 rounded-full"
                  style={{
                    width: `${Math.round((stats.adoption[key] / Math.max(1, stats.adoption.registered)) * 100)}%`,
                  }}
                />
              </span>
              <span className="text-navy text-right font-medium">{stats.adoption[key]}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
