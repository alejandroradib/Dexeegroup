import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { APPLICATION_STATUSES, CEFR_LEVELS } from "@/lib/validation/enums";
import { getAdminDashboard } from "@/server/services/admin";

export default async function AdminDashboardPage({ params }: PageProps<"/[locale]/admin">) {
  await pageLocale(params);
  const [t, te, stats] = await Promise.all([getTranslations("admin.dashboard"), getTranslations("enums"), getAdminDashboard()]);
  const link = (href: string) => <Link href={href} className="text-sm text-link hover:underline">{t("review")}</Link>;
  const maxLevel = Math.max(1, ...Object.values(stats.candidatesByLevel));
  const maxFunnel = Math.max(1, ...Object.values(stats.funnel));
  return (
    <>
      <PageHeader title={t("title")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("companiesPending")} value={stats.companiesPending} action={link("/admin/companies?status=pending")} />
        <StatCard label={t("jobsPending")} value={stats.jobsPendingReview} action={link("/admin/jobs")} />
        <StatCard label={t("applications7d")} value={stats.applications7d} action={link("/admin/applications")} />
        <StatCard label={t("contactRequests")} value={stats.contactRequestsPending} action={link("/admin/applications?contact=requested")} />
        <StatCard label={t("attemptsPending")} value={stats.attemptsPendingValidation} action={link("/admin/assessments")} />
        <StatCard label={t("activePlacements")} value={stats.activePlacements} action={link("/admin/placements")} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[12px] border border-border bg-white p-5">
          <h2 className="text-base">{t("byLevel")}</h2>
          <ul className="mt-4 grid gap-2">
            {[...CEFR_LEVELS, "none" as const].map((level) => (
              <li key={level} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-sm">
                <span className="text-muted-foreground">{level === "none" ? t("notVerified") : level}</span>
                <div className="h-2 rounded-full bg-mist"><div className={`h-2 rounded-full ${level === "none" ? "bg-slate" : "bg-green"}`} style={{ width: `${(stats.candidatesByLevel[level] / maxLevel) * 100}%` }} /></div>
                <span className="text-right font-medium">{stats.candidatesByLevel[level]}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-[12px] border border-border bg-white p-5">
          <h2 className="text-base">{t("funnel")}</h2>
          <ul className="mt-4 grid gap-2">
            {APPLICATION_STATUSES.map((status) => (
              <li key={status} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-sm">
                <span className="text-muted-foreground">{te(`application_status.${status}`)}</span>
                <div className="h-2 rounded-full bg-mist"><div className="h-2 rounded-full bg-navy" style={{ width: `${(stats.funnel[status] / maxFunnel) * 100}%` }} /></div>
                <span className="text-right font-medium">{stats.funnel[status]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
