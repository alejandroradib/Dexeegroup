import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function Pagination({
  page,
  total,
  hrefFor,
}: {
  page: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const t = useTranslations("common.labels");
  if (total <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-4 pt-4" aria-label="Pagination">
      <Button asChild variant="outline" size="sm" disabled={page <= 1} aria-disabled={page <= 1}>
        {page <= 1 ? (
          <span>{t("previous")}</span>
        ) : (
          <Link href={hrefFor(page - 1)}>{t("previous")}</Link>
        )}
      </Button>
      <span className="text-muted-foreground text-sm">{t("page", { page, total })}</span>
      <Button asChild variant="outline" size="sm" aria-disabled={page >= total}>
        {page >= total ? (
          <span>{t("nextPage")}</span>
        ) : (
          <Link href={hrefFor(page + 1)}>{t("nextPage")}</Link>
        )}
      </Button>
    </nav>
  );
}
