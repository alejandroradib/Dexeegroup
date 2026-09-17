"use client";

import { BookmarkIcon, DownloadIcon, LockIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { CefrBadge } from "@/components/shared/cefr-badge";
import { StatusChip } from "@/components/shared/status-chip";
import { WorkStyleBadge } from "@/components/shared/workstyle-badge";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  addCompanyNote,
  getApplicantResumeUrl,
  requestContactDetails,
  toggleSavedCandidate,
} from "@/server/actions/company";
import { fetchApplicantDetail } from "@/server/actions/company/detail";
import type { ApplicantDetail } from "@/server/services/jobs";

type Props = { applicationId: string | null; onClose: () => void; onChanged?: () => void };

export function ApplicantDrawer({ applicationId, onClose, onChanged }: Props) {
  const tc = useTranslations("common");
  return (
    <Sheet open={Boolean(applicationId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent closeLabel={tc("actions.close")} className="w-[min(100%,560px)]">
        {applicationId ? (
          <DrawerBody key={applicationId} applicationId={applicationId} onChanged={onChanged} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({
  applicationId,
  onChanged,
}: {
  applicationId: string;
  onChanged?: () => void;
}) {
  const t = useTranslations("company.drawer");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const format = useFormatter();
  const { toast } = useToast();
  const [detail, setDetail] = useState<ApplicantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    let cancelled = false;
    fetchApplicantDetail(applicationId).then((result) => {
      if (cancelled) return;
      setDetail(result.ok ? result.data : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  function reload() {
    fetchApplicantDetail(applicationId).then((result) => {
      if (result.ok) setDetail(result.data);
    });
    onChanged?.();
  }

  const card = detail?.card;
  const name = card ? `${card.first_name} ${card.last_initial ?? ""}.` : "";

  return (
    <>
      {loading || !detail ? (
        <div className="grid gap-4" aria-busy="true">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="grid gap-6">
          <SheetHeader>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip kind="application" status={detail.application.status} />
              {detail.application.source === "dexee_recommended" ? (
                <Badge variant="accent">{tc("labels.dexeeRecommended")}</Badge>
              ) : null}
            </div>
            <SheetTitle className="text-2xl">{name}</SheetTitle>
            <SheetDescription>{card?.headline}</SheetDescription>
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              {card?.city ? (
                <span>
                  {card.city}, {card.country}
                </span>
              ) : null}
              {card?.years_experience !== null && card?.years_experience !== undefined ? (
                <span>{tc("labels.years", { count: Math.round(card.years_experience) })}</span>
              ) : null}
              <CefrBadge
                verified={card?.english_verified_level}
                written={card?.english_written_level}
                self={card?.english_self_level}
              />
              <WorkStyleBadge completedAt={card?.psychometric_completed_at} />
            </div>
          </SheetHeader>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={detail.saved ? "secondary" : "outline"}
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await toggleSavedCandidate(detail.application.candidate_id, !detail.saved);
                  reload();
                })
              }
            >
              <BookmarkIcon className={detail.saved ? "fill-current" : undefined} />{" "}
              {detail.saved ? t("unsave") : t("save")}
            </Button>
          </div>

          <section className="border-border rounded-[12px] border p-4">
            <h3 className="text-navy flex items-center gap-2 text-sm font-semibold">
              {!detail.application.contact_released ? (
                <LockIcon className="size-4" aria-hidden />
              ) : null}
              {t("contact")}
            </h3>
            {detail.application.contact_released && detail.contact ? (
              <dl className="mt-3 grid gap-2 text-sm">
                {detail.contact.email ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{tc("labels.email")}</dt>
                    <dd>
                      <a href={`mailto:${detail.contact.email}`} className="text-link underline">
                        {detail.contact.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {detail.contact.phone ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{tc("labels.phone")}</dt>
                    <dd>{detail.contact.phone}</dd>
                  </div>
                ) : null}
                {detail.contact.linkedin_url ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">LinkedIn</dt>
                    <dd>
                      <a
                        href={detail.contact.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-link underline"
                      >
                        {detail.contact.linkedin_url.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {detail.contact.portfolio_url ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Portfolio</dt>
                    <dd>
                      <a
                        href={detail.contact.portfolio_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-link underline"
                      >
                        {detail.contact.portfolio_url.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    </dd>
                  </div>
                ) : null}
                <div className="pt-2">
                  {detail.contact.resume_path ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const result = await getApplicantResumeUrl(detail.application.id);
                          if (result.ok) window.open(result.data.url, "_blank", "noopener");
                          else toast({ title: tc("errors.generic"), variant: "danger" });
                        })
                      }
                    >
                      <DownloadIcon /> {t("resume")}
                    </Button>
                  ) : (
                    <p className="text-muted-foreground text-xs">{t("resumeUnavailable")}</p>
                  )}
                </div>
              </dl>
            ) : (
              <div className="mt-2">
                <p className="text-sm font-medium">{t("contactGated")}</p>
                <p className="text-muted-foreground mt-1 text-xs">{t("contactGatedBody")}</p>
                {detail.application.contact_requested_at ? (
                  <p className="text-success mt-3 text-xs">
                    {t("contactRequested", {
                      date: format.dateTime(
                        new Date(detail.application.contact_requested_at),
                        "short",
                      ),
                    })}
                  </p>
                ) : (
                  <Button
                    size="sm"
                    className="mt-3"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const result = await requestContactDetails(detail.application.id);
                        if (!result.ok) toast({ title: tc("errors.generic"), variant: "danger" });
                        reload();
                      })
                    }
                  >
                    {t("requestContact")}
                  </Button>
                )}
              </div>
            )}
          </section>

          {detail.application.cover_note ? (
            <section>
              <h3 className="text-navy text-sm font-semibold">{t("coverNote")}</h3>
              <p className="bg-mist mt-2 rounded-[12px] p-3 text-sm">
                {detail.application.cover_note}
              </p>
            </section>
          ) : null}

          {card?.summary ? (
            <section>
              <h3 className="text-navy text-sm font-semibold">{t("profile")}</h3>
              <p className="mt-2 text-sm">{card.summary}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {card.desired_salary_min_usd ? (
                  <div>
                    <dt className="text-muted-foreground">{t("desiredSalary")}</dt>
                    <dd>
                      {tc("labels.usdPerMonth", {
                        amount: format.number(card.desired_salary_min_usd),
                      })}
                    </dd>
                  </div>
                ) : null}
                {card.availability ? (
                  <div>
                    <dt className="text-muted-foreground">{t("availability")}</dt>
                    <dd>{te(`availability.${card.availability}`)}</dd>
                  </div>
                ) : null}
                {card.english_self_level ? (
                  <div>
                    <dt className="text-muted-foreground">{t("englishSelf")}</dt>
                    <dd>{te(`cefr_level.${card.english_self_level}`)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted-foreground">{t("source")}</dt>
                  <dd>{te(`application_source.${detail.application.source}`)}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          {card?.skills && card.skills.length > 0 ? (
            <section>
              <h3 className="text-navy text-sm font-semibold">{t("skills")}</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {card.skills.map((s) => (
                  <li key={s}>
                    <Badge variant="outline">{s}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {detail.experience.length > 0 ? (
            <section>
              <h3 className="text-navy text-sm font-semibold">{t("experience")}</h3>
              <ul className="mt-2 space-y-3">
                {detail.experience.map((e) => (
                  <li key={e.id} className="text-sm">
                    <p className="text-navy font-medium">{e.title}</p>
                    <p className="text-muted-foreground">
                      {e.company} ·{" "}
                      {e.start_date
                        ? format.dateTime(new Date(e.start_date), {
                            month: "short",
                            year: "numeric",
                          })
                        : ""}{" "}
                      –{" "}
                      {e.is_current
                        ? t("present")
                        : e.end_date
                          ? format.dateTime(new Date(e.end_date), {
                              month: "short",
                              year: "numeric",
                            })
                          : ""}
                    </p>
                    {e.description ? <p className="mt-1">{e.description}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {detail.education.length > 0 ? (
            <section>
              <h3 className="text-navy text-sm font-semibold">{t("education")}</h3>
              <ul className="mt-2 space-y-2">
                {detail.education.map((e) => (
                  <li key={e.id} className="text-sm">
                    <p className="text-navy font-medium">{e.institution}</p>
                    <p className="text-muted-foreground">
                      {[e.degree, e.field].filter(Boolean).join(", ")}
                      {e.end_year ? ` · ${e.end_year}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h3 className="text-navy text-sm font-semibold">{t("workstyle")}</h3>
            {detail.workstyleBands ? (
              <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {Object.entries(detail.workstyleBands).map(([factor, band]) => (
                  <li
                    key={factor}
                    className="bg-mist flex justify-between gap-2 rounded-[8px] px-3 py-2"
                  >
                    <span>{te(`workstyle_factor.${factor as "intellect"}`)}</span>
                    <span className="font-medium">{te(`workstyle_band.${band as "mid"}`)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground mt-2 text-xs">{t("workstyleHidden")}</p>
            )}
          </section>

          <section>
            <h3 className="text-navy text-sm font-semibold">{t("notes")}</h3>
            {detail.notes.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-xs">{t("notesEmpty")}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {detail.notes.map((n) => (
                  <li key={n.id} className="bg-mist rounded-[8px] p-3 text-sm">
                    <p>{n.body}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {n.profiles?.full_name ?? ""} ·{" "}
                      {format.dateTime(new Date(n.created_at), "short")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="mt-3 grid gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!note.trim()) return;
                start(async () => {
                  const result = await addCompanyNote({
                    application_id: detail.application.id,
                    body: note,
                  });
                  if (result.ok) {
                    setNote("");
                    reload();
                  } else toast({ title: tc("errors.generic"), variant: "danger" });
                });
              }}
            >
              <label htmlFor="note" className="sr-only">
                {t("addNote")}
              </label>
              <Textarea
                id="note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("notePlaceholder")}
                maxLength={1000}
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="justify-self-end"
                disabled={pending || !note.trim()}
              >
                {t("addNote")}
              </Button>
            </form>
          </section>

          {detail.events.length > 0 ? (
            <section>
              <h3 className="text-navy text-sm font-semibold">{t("timeline")}</h3>
              <ol className="text-muted-foreground mt-2 space-y-1 text-xs">
                {detail.events.map((e) => (
                  <li key={e.id} className="flex justify-between gap-2">
                    <span>{te(`application_status.${e.to_status}`)}</span>
                    <span>{format.dateTime(new Date(e.created_at), "short")}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {!detail.application.contact_released ? (
            <Alert className="text-xs">{tc("consentNotice")}</Alert>
          ) : null}
        </div>
      )}
    </>
  );
}
