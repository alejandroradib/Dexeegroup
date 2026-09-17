import { ShieldCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Database } from "@/types/database";

type Cefr = Database["public"]["Enums"]["cefr_level"];

type CefrBadgeProps = {
  verified?: Cefr | null;
  written?: Cefr | null;
  self?: Cefr | null;
  className?: string;
};

/** Shows the verified level when it exists, then the written level, then the self-reported one. */
export function CefrBadge({ verified, written, self, className }: CefrBadgeProps) {
  const t = useTranslations();
  const level = verified ?? written ?? self;
  if (!level) return null;
  const kind = verified ? "verified" : written ? "written" : "self";
  const label =
    kind === "verified"
      ? t("common.labels.verifiedByDexee")
      : kind === "written"
        ? t("enums.assessment_type.english_written")
        : t("common.labels.selfReported");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={kind === "verified" ? "success" : kind === "written" ? "info" : "outline"}
          className={className}
        >
          {kind === "verified" ? <ShieldCheckIcon className="size-3" aria-hidden /> : null}
          <span>{level}</span>
          <span className="sr-only">{label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{`${t(`enums.cefr_level.${level}`)}: ${label}`}</TooltipContent>
    </Tooltip>
  );
}
