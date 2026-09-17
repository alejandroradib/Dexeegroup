import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { CandidateTagsEditor, DexeeNoteForm, RecommendDialog, ResolveDataRequestButton, ResumeDownloadButton } from "@/components/domain/admin/candidate-admin-panels";
import { PageHeader } from "@/components/layout/page-header";
import { CefrBadge } from "@/components/shared/cefr-badge";
import { StatusChip } from "@/components/shared/status-chip";
import { WorkStyleBadge } from "@/components/shared/workstyle-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getAdminCandidateDetail, listOpenJobsForRecommendation } from "@/server/services/admin";

export default async function AdminCandidateDetailPage({ params }: PageProps<"/[locale]/admin/candidates/[id]">) {
  await pageLocale(params);
  const { id } = await params;
  const [detail, jobs, t, tc, te, tn, format] = await Promise.all([getAdminCandidateDetail(id), listOpenJobsForRecommendation(), getTranslations("admin.candidates.detail"), getTranslations("common"), getTranslations("enums"), getTranslations("nav.admin"), getFormatter()]);
  if (!detail) notFound();
  const { candidate: c, profile, contact, experience, education, applications, notes, attempts, dataRequests } = detail;
  const appliedJobIds = new Set(applications.map((a) => a.job_id));
  const recommendable = jobs.filter((j) => !appliedJobIds.has(j.id)).map((j) => ({ id: j.id, title: j.title, company: j.companies?.name ?? "" }));
  return (
    <>
      <Button asChild variant="link" className="mb-2 px-0"><Link href="/admin/candidates"><ArrowLeftIcon /> {tn("candidates")}</Link></Button>
      <PageHeader
        title={`${c.first_name} ${c.last_name}`}
        description={c.headline ?? undefined}
        actions={<><CefrBadge verified={c.english_verified_level} written={c.english_written_level} self={c.english_self_level} /><WorkStyleBadge completedAt={c.psychometric_completed_at} /><RecommendDialog candidateId={c.id} jobs={recommendable} /></>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-6">
          <section className="rounded-[12px] border border-border bg-white p-5">
            <p className="text-sm">{c.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{c.skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <div><dt className="text-muted-foreground">{t("roleAndCity")}</dt><dd>{c.role_family ? te(`role_family.${c.role_family}`) : "—"} · {c.city}</dd></div>
              <div><dt className="text-muted-foreground">{t("expectedSalary")}</dt><dd>{c.desired_salary_min_usd ? tc("labels.usdPerMonth", { amount: format.number(c.desired_salary_min_usd) }) : "—"}</dd></div>
              <div><dt className="text-muted-foreground">{t("availability")}</dt><dd>{c.availability ? te(`availability.${c.availability}`) : "—"}</dd></div>
            </dl>
          </section>
          <section className="rounded-[12px] border border-border bg-white p-5">
            <h2 className="text-base">{t("applications")}</h2>
            <ul className="mt-3 divide-y divide-border text-sm">
              {applications.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                  <div><Link href={`/admin/jobs/${a.job_id}`} className="font-medium text-navy hover:underline">{a.jobs?.title}</Link><p className="text-xs text-muted-foreground">{a.jobs?.companies?.name} · {te(`application_source.${a.source}`)}</p></div>
                  <div className="flex items-center gap-2"><Link href={`/admin/applications?application=${a.id}`} className="text-xs text-link hover:underline">{tc("actions.view")}</Link><StatusChip kind="application" status={a.status} /></div>
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-[12px] border border-border bg-white p-5">
              <h2 className="text-base">{t("assessments")}</h2>
              <ul className="mt-3 divide-y divide-border text-sm">
                {attempts.length === 0 ? <li className="py-2 text-muted-foreground">—</li> : attempts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                    <div><p className="font-medium text-navy">{a.assessments ? te(`assessment_type.${a.assessments.type}`) : ""}</p><p className="text-xs text-muted-foreground">{format.dateTime(new Date(a.created_at), "short")}{a.final_level ? ` · ${a.final_level}` : ""}</p></div>
                    <div className="flex items-center gap-2"><StatusChip kind="attempt" status={a.status} /><Link href={`/admin/assessments/attempts/${a.id}`} className="text-xs text-link hover:underline">{tc("actions.view")}</Link></div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[12px] border border-border bg-white p-5">
              <h2 className="text-base">{t("dataRequests")}</h2>
              <ul className="mt-3 divide-y divide-border text-sm">
                {dataRequests.length === 0 ? <li className="py-2 text-muted-foreground">—</li> : dataRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                    <div><p className="font-medium text-navy">{te(`data_request_kind.${r.kind as "access"}`)}</p><p className="text-xs text-muted-foreground">{r.status} · {format.dateTime(new Date(r.created_at), "short")}</p>{r.message ? <p className="mt-1 text-xs">{r.message}</p> : null}</div>
                    {r.status === "open" ? <ResolveDataRequestButton id={r.id} /> : null}
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-[12px] border border-border bg-white p-5">
              <h2 className="text-base">{t("experience")}</h2>
              <ul className="mt-2 space-y-3 text-sm">
                {experience.map((e) => (<li key={e.id}><p className="font-medium text-navy">{e.title}</p><p className="text-muted-foreground">{e.company} · {e.start_date?.slice(0, 7)} – {e.is_current ? tc("labels.today") : e.end_date?.slice(0, 7)}</p></li>))}
              </ul>
            </div>
            <div className="rounded-[12px] border border-border bg-white p-5">
              <h2 className="text-base">{t("education")}</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {education.map((e) => (<li key={e.id}><p className="font-medium text-navy">{e.institution}</p><p className="text-muted-foreground">{[e.degree, e.field].filter(Boolean).join(", ")}{e.end_year ? ` · ${e.end_year}` : ""}</p></li>))}
              </ul>
            </div>
          </section>
        </div>
        <aside className="grid gap-6 lg:self-start">
          <section className="rounded-[12px] border border-navy/30 bg-mist/60 p-5">
            <h2 className="text-base">{t("contact")}</h2>
            <dl className="mt-3 grid gap-1.5 text-sm">
              <div><dt className="text-muted-foreground">{tc("labels.email")}</dt><dd>{contact?.email ?? profile?.email}</dd></div>
              <div><dt className="text-muted-foreground">{tc("labels.phone")}</dt><dd>{contact?.phone ?? "—"}</dd></div>
              <div><dt className="text-muted-foreground">LinkedIn</dt><dd className="truncate">{contact?.linkedin_url ? <a href={contact.linkedin_url} className="text-link underline" target="_blank" rel="noreferrer">{contact.linkedin_url.replace(/^https?:\/\/(www\.)?/, "")}</a> : "—"}</dd></div>
              <div><dt className="text-muted-foreground">Portfolio</dt><dd className="truncate">{contact?.portfolio_url ? <a href={contact.portfolio_url} className="text-link underline" target="_blank" rel="noreferrer">{contact.portfolio_url.replace(/^https?:\/\/(www\.)?/, "")}</a> : "—"}</dd></div>
            </dl>
            <div className="mt-3">{contact?.resume_path ? <ResumeDownloadButton candidateId={c.id} /> : <p className="text-xs text-muted-foreground">{t("noResume")}</p>}</div>
          </section>
          <section className="rounded-[12px] border border-border bg-white p-5">
            <h2 className="text-base">{t("account")}</h2>
            <p className="mt-2 text-xs text-muted-foreground">{profile ? t("joined", { date: format.dateTime(new Date(profile.created_at), "short") }) : ""} · {t("locale")}: {profile?.locale?.toUpperCase()}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("consent", { version: c.data_consent_version, date: format.dateTime(new Date(c.data_consent_at), "short") })}</p>
            <p className="mt-1 text-xs text-muted-foreground">{te(`candidate_visibility.${c.visibility}`)} · {c.profile_completeness}%</p>
          </section>
          <section className="rounded-[12px] border border-border bg-white p-5">
            <h2 className="text-base">{t("tags")}</h2>
            <div className="mt-3"><CandidateTagsEditor candidateId={c.id} tags={c.candidate_tags} /></div>
          </section>
          <section className="rounded-[12px] border border-border bg-white p-5">
            <h2 className="text-base">{t("notes")}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {notes.map((n) => (<li key={n.id} className="rounded-[8px] bg-mist p-3"><p>{n.body}</p><p className="mt-1 text-xs text-muted-foreground">{n.profiles?.full_name ?? ""} · {te(`note_visibility.${n.visibility}`)} · {format.dateTime(new Date(n.created_at), "short")}</p></li>))}
            </ul>
            <div className="mt-3"><DexeeNoteForm candidateId={c.id} /></div>
          </section>
        </aside>
      </div>
    </>
  );
}
