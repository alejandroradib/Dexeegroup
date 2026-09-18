"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { retryInterview } from "@/server/actions/interview";

export function RetryInterviewButton({ interviewId }: { interviewId: string }) {
  const t = useTranslations("interview.runner");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await retryInterview(interviewId);
          if (!result.ok)
            toast({
              title: result.error === "aiUnavailable" ? t("aiUnavailable") : t("aiFailed"),
              variant: "danger",
            });
          router.refresh();
        })
      }
    >
      {pending ? t("submitting") : t("retry")}
    </Button>
  );
}
