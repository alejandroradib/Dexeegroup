import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { CompanyActions } from "@/components/domain/admin/company-actions";
import { PageHeader } from "@/components/layout/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getCompanyDetail } from "@/server/services/admin";

export default async function AdminCompanyDetailPage({ params }: PageProps<"/[locale]/admin/companies/[id]">) {
  await pageLocale(params);
  const { id } = await params;
  const [detail, t, te, tn, format] = await Promise.all([getCompanyDetail(id), getTranslations("admin.companies.detail"), getTranslations("enums"), getTranslations("nav.admin"), getFormatter()]);
  if (!detail) notFound();
  const { company, members, jobs, activity } = detail;
  const needs = (company.hiring_needs ?? {}) as { role_families?: string[]; expected_hires?: number; preferred_contract_types?: string[] };
  return (
    <>
      <Button asChild variant="link" className="mb-2 px-0"><Link href="/admin/companies"><ArrowLeftIcon /> {tn("companies")}</Link></Button>
      <PageHeader title={company.name} eyebrow={company.legal_name ?? undefined} actions={<><StatusChip kind="company" status={company.status} /><CompanyActions company={company} pendingJobs={jobs.filter((j) => j.status === "pending_review").map((j) => ({ id: j.id, title: j.title, status: j.status }))} /></>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-6">
          <section className="rounded-[12px] border border-border bg-white p-5">
            <h2 className="text-base">{t("profile")}</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">{t("website")}</dt><dd>{company.website ? <a href={company.website} className="text-link underline" target="_blank" rel="noreferrer">{company.website}</a> : "—"}</dd></div>
              <div><dt className="text-muted-foreground">{t("sector")}</dt><dd>{company.sector ? te(`sector.${company.sector}`) : "—"}</dd></div>
              <div><dt className="text-muted-foreground">{t("size")}</dt><dd>{company.size ? te(`company_size.${company.size}`) : "—"}</dd></div>
              <div><dt className="text-muted-foreground">{t("location")}</dt><dd>{[company.city, company.state, company.country].filter(Boolean).join(", ")}</dd></div>
            </dl>
            {company.description ? <p className="mt-4 text-sm">{company.description}</p> : null}
            <h3 className="mt-5 text-sm font-semibold text-navy">{t("hiringNeeds")}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(needs.role_families ?? []).map((rf) => <Badge key={rf} variant="secondary">{te(`role_family.${rf as "other"}`)}</Badge>)}
              {(needs.preferred_contract_types ?? []).map((ct) => <Badge key={ct} variant="outline">{te(`contract_type.${ct as "direct_hire"}`)}</Badge>)}
            </div>
            {needs.expected_hires !== undefined ? <p className="mt-2 text-xs text-muted-foreground">{t("expectedHires", { count: needs.expected_hires })}</p> : null}
          </section>
          <section className="rounded-[12px] border border-border bg-white">
            <h2 className="border-b border-border px-5 py-3 text-base">{t("jobs")}</h2>
            {jobs.length === 0 ? <p className="p-5 text-sm text-muted-foreground">{t("noJobs")}</p> : (
              <ul className="divide-y divide-border">
                {jobs.map((job) => (
                  <li key={job.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <Link href={`/admin/jobs/${job.id}`} className="font-medium text-navy hover:underline">{job.title}</Link>
                    <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">{format.dateTime(new Date(job.updated_at), "short")}</span><StatusChip kind="job" status={job.status} /></div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside className="grid gap-6 lg:self-start">
          <section className="rounded-[12px] border border-border bg-white p-5">
            <h2 className="text-base">{t("members")}</h2>
            <ul className="mt-3 divide-y divide-border text-sm">
              {members.map((m) => (
                <li key={m.id} className="py-2">
                  <p className="font-medium text-navy">{m.profiles?.full_name ?? m.invited_email}</p>
                  <p className="text-xs text-muted-foreground">{m.profiles?.email ?? m.invited_email} · {te(`member_role.${m.role}`)}{m.accepted_at ? "" : " · pending"}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-[12px] border border-border bg-white p-5">
            <h2 className="text-base">{t("activity")}</h2>
            <ul className="mt-3 divide-y divide-border text-xs">
              {activity.map((a) => (
                <li key={a.id} className="py-2"><span className="font-medium text-navy">{a.action}</span> · {a.profiles?.full_name ?? ""} · {format.dateTime(new Date(a.created_at), "short")}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
