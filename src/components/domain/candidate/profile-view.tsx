"use client";

import { EyeIcon, LockIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { CefrBadge } from "@/components/shared/cefr-badge";
import { WorkStyleBadge } from "@/components/shared/workstyle-badge";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/i18n/navigation";
import type { CandidateProfile } from "@/server/services/candidates";

export function ProfileView({ profile, email }: { profile: CandidateProfile; email: string }) {
  const t = useTranslations("candidate.profile");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const format = useFormatter();
  const [preview, setPreview] = useState(false);
  const c = profile.candidate;
  const displayName = preview ? `${c.first_name} ${c.last_name.charAt(0)}.` : `${c.first_name} ${c.last_name}`;
  const hasBadges = Boolean(c.english_verified_level || c.english_written_level || c.psychometric_completed_at);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-border bg-white p-4">
          <div className="flex items-center gap-3">
            <Switch id="preview" checked={preview} onCheckedChange={setPreview} />
            <Label htmlFor="preview" className="flex items-center gap-2 font-normal"><EyeIcon className="size-4" aria-hidden /> {t("preview")}</Label>
          </div>
          <Button asChild variant="outline" size="sm"><Link href="/candidate/onboarding">{t("edit")}</Link></Button>
        </div>
        {preview ? <Alert variant="info">{t("previewNote")}</Alert> : null}
        <article className="rounded-[12px] border border-border bg-white p-6">
          <h2 className="text-2xl">{displayName}</h2>
          <p className="mt-1 text-muted-foreground">{c.headline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {c.city ? <span>{c.city}, {c.country}</span> : null}
            {c.years_experience !== null ? <span>{tc("labels.years", { count: Math.round(c.years_experience) })}</span> : null}
            {c.role_family ? <Badge variant="secondary">{te(`role_family.${c.role_family}`)}</Badge> : null}
            <CefrBadge verified={c.english_verified_level} written={c.english_written_level} self={c.english_self_level} />
            <WorkStyleBadge completedAt={c.psychometric_completed_at} />
          </div>
          {c.summary ? (
            <section className="mt-6">
              <h3 className="text-sm font-semibold text-navy">{t("summary")}</h3>
              <p className="mt-2 text-sm">{c.summary}</p>
            </section>
          ) : null}
          {c.skills.length > 0 ? (
            <section className="mt-6">
              <h3 className="text-sm font-semibold text-navy">{t("skills")}</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">{c.skills.map((s) => <li key={s}><Badge variant="outline">{s}</Badge></li>)}</ul>
            </section>
          ) : null}
          {profile.experience.length > 0 ? (
            <section className="mt-6">
              <h3 className="text-sm font-semibold text-navy">{t("experience")}</h3>
              <ul className="mt-2 space-y-3">
                {profile.experience.map((e) => (
                  <li key={e.id} className="text-sm">
                    <p className="font-medium text-navy">{e.title}</p>
                    <p className="text-muted-foreground">{e.company} · {e.start_date ? format.dateTime(new Date(e.start_date), { month: "short", year: "numeric" }) : ""} – {e.is_current ? t("present") : e.end_date ? format.dateTime(new Date(e.end_date), { month: "short", year: "numeric" }) : ""}</p>
                    {e.description ? <p className="mt-1">{e.description}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {profile.education.length > 0 ? (
            <section className="mt-6">
              <h3 className="text-sm font-semibold text-navy">{t("education")}</h3>
              <ul className="mt-2 space-y-2">
                {profile.education.map((e) => (
                  <li key={e.id} className="text-sm">
                    <p className="font-medium text-navy">{e.institution}</p>
                    <p className="text-muted-foreground">{[e.degree, e.field].filter(Boolean).join(", ")}{e.end_year ? ` · ${e.end_year}` : ""}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="mt-6">
            <h3 className="text-sm font-semibold text-navy">{t("preferences")}</h3>
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              {c.desired_roles.length > 0 ? <div><dt className="text-muted-foreground">{t("desiredRoles")}</dt><dd>{c.desired_roles.join(", ")}</dd></div> : null}
              {c.desired_salary_min_usd !== null ? <div><dt className="text-muted-foreground">{t("expectedSalary")}</dt><dd>{tc("labels.usdPerMonth", { amount: format.number(c.desired_salary_min_usd) })}</dd></div> : null}
              {c.availability ? <div><dt className="text-muted-foreground">{t("availability")}</dt><dd>{te(`availability.${c.availability}`)}</dd></div> : null}
              {c.preferred_contract_types.length > 0 ? <div><dt className="text-muted-foreground">{t("contractTypes")}</dt><dd>{c.preferred_contract_types.map((ct) => te(`contract_type.${ct}`)).join(", ")}</dd></div> : null}
              {c.english_self_level ? <div><dt className="text-muted-foreground">{t("englishSelf")}</dt><dd>{te(`cefr_level.${c.english_self_level}`)}</dd></div> : null}
            </dl>
          </section>
        </article>
      </div>
      <aside className="grid gap-4 lg:self-start">
        <section className="rounded-[12px] border border-border bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-navy">{preview ? <LockIcon className="size-4" aria-hidden /> : null}{t("contact")}</h3>
          {preview ? <p className="mt-2 text-sm text-muted-foreground">{t("contactPrivate")}</p> : (
            <dl className="mt-3 grid gap-2 text-sm">
              <div><dt className="text-muted-foreground">{tc("labels.email")}</dt><dd>{email}</dd></div>
              {profile.contact?.phone ? <div><dt className="text-muted-foreground">{tc("labels.phone")}</dt><dd>{profile.contact.phone}</dd></div> : null}
              {profile.contact?.linkedin_url ? <div><dt className="text-muted-foreground">LinkedIn</dt><dd className="truncate"><a href={profile.contact.linkedin_url} className="text-link underline" target="_blank" rel="noreferrer">{profile.contact.linkedin_url.replace(/^https?:\/\/(www\.)?/, "")}</a></dd></div> : null}
              {profile.contact?.portfolio_url ? <div><dt className="text-muted-foreground">Portfolio</dt><dd className="truncate"><a href={profile.contact.portfolio_url} className="text-link underline" target="_blank" rel="noreferrer">{profile.contact.portfolio_url.replace(/^https?:\/\/(www\.)?/, "")}</a></dd></div> : null}
            </dl>
          )}
        </section>
        <section className="rounded-[12px] border border-border bg-white p-5">
          <h3 className="text-sm font-semibold text-navy">{t("badges")}</h3>
          {hasBadges ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <CefrBadge verified={c.english_verified_level} written={c.english_written_level} />
              <WorkStyleBadge completedAt={c.psychometric_completed_at} />
            </div>
          ) : <p className="mt-2 text-sm text-muted-foreground">{t("noBadges")}</p>}
          <p className="mt-3 text-xs text-muted-foreground">{tc("consentNotice")}</p>
        </section>
      </aside>
    </div>
  );
}
