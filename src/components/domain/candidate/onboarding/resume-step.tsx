"use client";

import { FileTextIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { uploadViaSignedUrl } from "@/lib/upload";
import { confirmResumeUpload, getOwnResumeUrl, removeResume } from "@/server/actions/candidate";

const MAX_BYTES = 5 * 1024 * 1024;

export function ResumeStep({ candidateId, hasResume, onFinish, onBack, finishLabel }: { candidateId: string; hasResume: boolean; onFinish: () => void; onBack?: () => void; finishLabel: string }) {
  const t = useTranslations("candidate.onboarding.resume");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const router = useRouter();
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onFile(file: File) {
    setError(null);
    if (file.type !== "application/pdf") { setError(tv("fileType")); return; }
    if (file.size > MAX_BYTES) { setError(tv("fileSize")); return; }
    start(async () => {
      const upload = await uploadViaSignedUrl({ bucket: "resumes", file, path: `candidates/${candidateId}/resume.pdf`, contentType: "application/pdf" });
      if (!upload.ok) { setError(upload.error === "file_too_large" ? tv("fileSize") : upload.error === "unsupported_type" ? tv("fileType") : tc("errors.generic")); return; }
      const result = await confirmResumeUpload();
      if (result.ok) { toast({ title: t("uploaded"), variant: "success" }); router.refresh(); }
      else setError(result.error === "fileType" ? tv("fileType") : result.error === "fileSize" ? tv("fileSize") : tc("errors.generic"));
    });
  }

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <div className="flex flex-col gap-3 rounded-[12px] border border-dashed border-border p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-mist text-navy"><FileTextIcon className="size-5" aria-hidden /></span>
          <p className="text-sm font-medium text-navy">{hasResume ? t("current") : t("none")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept="application/pdf" className="sr-only" aria-label={t("upload")} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
          <Button type="button" variant="outline" disabled={pending} onClick={() => input.current?.click()}>{hasResume ? t("replace") : t("upload")}</Button>
          {hasResume ? (
            <>
              <Button type="button" variant="ghost" disabled={pending} onClick={() => start(async () => { const r = await getOwnResumeUrl(); if (r.ok) window.open(r.data.url, "_blank", "noopener"); })}>{t("view")}</Button>
              <ConfirmButton variant="ghost" title={t("remove")} onConfirm={async () => { await removeResume(); router.refresh(); }}>{t("remove")}</ConfirmButton>
            </>
          ) : null}
        </div>
      </div>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <div className="flex justify-between">
        {onBack ? <Button type="button" variant="ghost" onClick={onBack}>{tc("actions.back")}</Button> : <span />}
        <Button type="button" variant="accent" onClick={onFinish}>{finishLabel}</Button>
      </div>
    </div>
  );
}
