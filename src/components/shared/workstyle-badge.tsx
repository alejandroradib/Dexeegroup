import { SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

export function WorkStyleBadge({ completedAt, className }: { completedAt?: string | null; className?: string }) {
  const t = useTranslations("enums.assessment_type");
  if (!completedAt) return null;
  return (
    <Badge variant="accent" className={className}>
      <SparklesIcon className="size-3" aria-hidden />
      {t("psychometric")}
    </Badge>
  );
}
