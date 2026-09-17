import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { APPLICATION_STATUSES } from "@/lib/validation/enums";
import { getCompanyDashboard, getCurrentCompany } from "@/server/services/companies";

export default async function CompanyDashboardPage({ params }: PageProps<"/[locale]/company">) {
  const locale = await pageLocale(params);
  const company = await getCurrentCompany();
  if (!company) redirect({ href: "/company/onboarding", locale });
  const resolved = company!;
  const [t, te, user, stats] = await Promise.all([
    getTranslations("company.dashboard"),
    getTranslations("enums.application_status"),
    getSessionUser(),
    getCompanyDashboard(resolved.id),
  ]);
  const pending: string[] = [];
  if (stats.drafts) pending.push(t("drafts", { count: stats.drafts }));
  if (stats.changesRequested)
    pending.push(t("changesRequested", { count: stats.changesRequested }));
  if (stats.pendingReview) pending.push(t("pendingReview", { count: stats.pendingReview }));
  if (stats.contactRequestsPending)
    pending.push(t("contactRequests", { count: stats.contactRequestsPending }));
  const stages = APPLICATION_STATUSES.filter((s) => s !== "withdrawn");
  const maxStage = Math.max(1, ...stages.map((s) => stats.byStage[s]));

  return (
    <>
      <PageHeader
        title={t("welcome", { name: user?.profile?.full_name?.split(" ")[0] ?? resolved.name })}
        eyebrow={resolved.name}
        actions={
          <Button asChild variant="accent">
            <Link href="/company/jobs/new">{t("postJob")}</Link>
          </Button>
        }
      />
      {resolved.status === "pending" ? (
        <Alert variant="warning" className="mb-6">
          {t("pendingBanner")}
        </Alert>
      ) : null}
      {resolved.status === "suspended" ? (
        <Alert variant="danger" className="mb-6">
          {t("suspendedBanner")}
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("openJobs")}
          value={stats.openJobs}
          action={
            <Link href="/company/jobs" className="text-link text-sm hover:underline">
              {t("viewJobs")}
            </Link>
          }
        />
        <StatCard label={t("newApplicants")} value={stats.newApplicants7d} />
        <div className="border-border rounded-[12px] border bg-white p-5 sm:col-span-2">
          <p className="text-muted-foreground text-sm">{t("pendingActions")}</p>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm">{t("nothingPending")}</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {pending.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <span className="bg-green size-1.5 rounded-full" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <section className="border-border mt-6 rounded-[12px] border bg-white p-5">
        <h2 className="text-base">{t("byStage")}</h2>
        <ul className="mt-4 grid gap-3">
          {stages.map((stage) => (
            <li key={stage} className="grid grid-cols-[120px_1fr_40px] items-center gap-3 text-sm">
              <span className="text-muted-foreground">{te(stage)}</span>
              <div className="bg-mist h-2 rounded-full">
                <div
                  className="bg-navy h-2 rounded-full"
                  style={{ width: `${(stats.byStage[stage] / maxStage) * 100}%` }}
                />
              </div>
              <span className="text-right font-medium">{stats.byStage[stage]}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
