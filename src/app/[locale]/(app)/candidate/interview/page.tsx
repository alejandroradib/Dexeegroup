import { getFormatter, getTranslations } from "next-intl/server";

import { InterviewStartForm } from "@/components/domain/interview/start-form";
import { ChevronList } from "@/components/domain/marketing/sections";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { interviewBand } from "@/lib/interview/scoring";
import { getCurrentCandidateProfile } from "@/server/services/candidates";
import { getInterviewOverview } from "@/server/services/interviews";

export default async function InterviewPage({
  params,
}: PageProps<"/[locale]/candidate/interview">) {
  await pageLocale(params);
  const user = await getSessionUser();
  const [overview, profile, t, tr, te, format] = await Promise.all([
    getInterviewOverview(user!.id),
    getCurrentCandidateProfile(user!.id),
    getTranslations("interview"),
    getTranslations("interview.report"),
    getTranslations("enums"),
    getFormatter(),
  ]);
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <section className="border-border rounded-[12px] border bg-white p-6">
            <h2 className="text-base">{t("intro.rules")}</h2>
            <ChevronList
              className="mt-4 text-sm"
              items={[t("intro.rule1"), t("intro.rule2"), t("intro.rule3"), t("intro.rule4")]}
            />
          </section>
          <section className="border-border rounded-[12px] border bg-white p-6">
            <h2 className="text-base">{t("intro.history")}</h2>
            {overview.history.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-sm">{t("intro.noHistory")}</p>
            ) : (
              <ul className="divide-border mt-3 divide-y text-sm">
                {overview.history.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <p className="text-navy font-medium">
                        {te(`role_family.${i.role_family}`)} · {i.language.toUpperCase()}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {format.dateTime(new Date(i.created_at), "short")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {i.status === "completed" && i.overall_score !== null ? (
                        <Badge variant="accent">
                          {Math.round(i.overall_score)}/20 ·{" "}
                          {tr(`band.${interviewBand(i.overall_score)}`)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{i.status}</Badge>
                      )}
                      {i.status !== "expired" ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/candidate/interview/${i.id}/result`}>
                            {t("intro.viewReport")}
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside className="border-border self-start rounded-[12px] border bg-white p-6">
          {overview.open ? (
            <Button asChild variant="accent" size="lg" className="w-full">
              <Link href={`/candidate/interview/${overview.open.id}`}>{t("intro.continue")}</Link>
            </Button>
          ) : overview.nextAllowedAt ? (
            <Alert variant="warning">
              {t("intro.cooldown", {
                date: format.dateTime(new Date(overview.nextAllowedAt), "long"),
              })}
            </Alert>
          ) : (
            <InterviewStartForm defaultRoleFamily={profile?.candidate.role_family ?? null} />
          )}
        </aside>
      </div>
    </>
  );
}
