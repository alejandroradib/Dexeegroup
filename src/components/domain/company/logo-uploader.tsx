"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { uploadViaSignedUrl } from "@/lib/upload";

export function LogoUploader({ companyId, currentUrl, onUploaded }: { companyId: string; currentUrl: string | null; onUploaded: (path: string) => Promise<void> }) {
  const tc = useTranslations("common");
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 items-center justify-center overflow-hidden rounded-[12px] border border-border bg-mist">
        {preview ? <Image src={preview} alt="" width={80} height={80} className="object-contain" unoptimized /> : <span className="text-xs text-muted-foreground">—</span>}
      </div>
      <div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="sr-only"
          aria-label={tc("actions.upload")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            start(async () => {
              const result = await uploadViaSignedUrl({ bucket: "logos", file, path: `companies/${companyId}/logo-${Date.now()}.${file.name.split(".").pop() ?? "png"}` });
              if (result.ok) {
                setPreview(URL.createObjectURL(file));
                await onUploaded(result.path);
              } else toast({ title: tc("errors.generic"), description: result.error, variant: "danger" });
            });
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => input.current?.click()}>
          {preview ? tc("actions.replace") : tc("actions.upload")}
        </Button>
      </div>
    </div>
  );
}
