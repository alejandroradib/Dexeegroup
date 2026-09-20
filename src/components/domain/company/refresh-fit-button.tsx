"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { refreshJobFit } from "@/server/actions/company";

export function RefreshFitButton({ jobId }: { jobId: string }) {
  const t = useTranslations("company.pipeline.recommended");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await refreshJobFit(jobId);
          if (result.ok) {
            toast({ title: t("refreshed", { count: result.data.computed }), variant: "success" });
            router.refresh();
          } else toast({ title: t("refreshFailed"), variant: "danger" });
        })
      }
    >
      {pending ? t("refreshing") : t("refresh")}
    </Button>
  );
}
