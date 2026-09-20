import { FileSearchIcon, FingerprintIcon, MicIcon, PenLineIcon, ShapesIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { LucideIcon } from "lucide-react";

/** The checks behind a Dexee Verified report and the fit analysis, in the order they run. */
const CHECKS = [
  { id: "identity", icon: FingerprintIcon },
  { id: "spokenEnglish", icon: MicIcon },
  { id: "writtenEnglish", icon: PenLineIcon },
  { id: "workProfile", icon: ShapesIcon },
  { id: "fit", icon: FileSearchIcon },
] as const satisfies readonly { id: string; icon: LucideIcon }[];

/**
 * Renders the five checks with what each one produces and who decides it. The "decided by"
 * line is the point of the section: on spoken English a person assigns the final level,
 * and the model only pre-scores.
 */
export async function VerificationSteps() {
  const t = await getTranslations("marketing.verify");

  return (
    <ol className="grid gap-6 md:grid-cols-2">
      {CHECKS.map((check, index) => {
        const Icon = check.icon;
        return (
          <li key={check.id} className="border-border rounded-[12px] border bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="bg-mint text-navy flex size-10 items-center justify-center rounded-[10px]">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-deep-green text-xs font-semibold tracking-wide uppercase">
                {t("stepLabel", { number: index + 1 })}
              </span>
            </div>
            <h3 className="mt-4 text-lg">
              {t(`checks.${check.id}.title` as "checks.identity.title")}
            </h3>
            <p className="mt-2 text-sm">{t(`checks.${check.id}.body` as "checks.identity.body")}</p>
            <dl className="border-border mt-4 space-y-1 border-t pt-4 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground shrink-0">{t("producesLabel")}</dt>
                <dd>{t(`checks.${check.id}.produces` as "checks.identity.produces")}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground shrink-0">{t("decidedByLabel")}</dt>
                <dd>{t(`checks.${check.id}.decidedBy` as "checks.identity.decidedBy")}</dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ol>
  );
}
