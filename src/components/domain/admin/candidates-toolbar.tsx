"use client";

import { DownloadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { exportCandidatesCsv } from "@/server/actions/admin";

export function ExportCandidatesButton({ ids }: { ids: string[] }) {
  const t = useTranslations("admin.candidates");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending || ids.length === 0}
      onClick={() =>
        start(async () => {
          const result = await exportCandidatesCsv(ids);
          if (!result.ok) {
            toast({ title: tc("errors.generic"), variant: "danger" });
            return;
          }
          const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = result.data.filename;
          a.click();
          URL.revokeObjectURL(url);
          toast({ title: t("exported"), variant: "success" });
        })
      }
    >
      <DownloadIcon /> {t("export")}
    </Button>
  );
}
