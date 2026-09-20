import { ShapesIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

/** Marks a shared work profile (work-style or DISC) on a candidate card. Label only, never a score. */
export function WorkStyleBadge({
  completedAt,
  type = "psychometric",
  className,
}: {
  completedAt?: string | null;
  type?: "psychometric" | "disc";
  className?: string;
}) {
  const t = useTranslations("enums.assessment_type");
  if (!completedAt) return null;
  const Icon = type === "disc" ? ShapesIcon : SparklesIcon;
  return (
    <Badge variant="accent" className={className}>
      <Icon className="size-3" aria-hidden />
      {t(type)}
    </Badge>
  );
}
