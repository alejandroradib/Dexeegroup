import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("common.errors");
  return (
    <main className="container-marketing flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="text-deep-green text-sm font-semibold">404</p>
      <h1 className="mt-2 text-3xl">{t("notFoundTitle")}</h1>
      <p className="text-muted-foreground mt-3 max-w-md">{t("notFoundBody")}</p>
      <Button asChild className="mt-8">
        <Link href="/">{t("goHome")}</Link>
      </Button>
    </main>
  );
}
