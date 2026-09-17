"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("common.errors");
  return (
    <main className="container-marketing flex flex-1 flex-col items-center justify-center py-24 text-center">
      <h1 className="text-3xl">{t("generic")}</h1>
      <Button className="mt-8" onClick={reset}>
        {t("tryAgain")}
      </Button>
    </main>
  );
}
