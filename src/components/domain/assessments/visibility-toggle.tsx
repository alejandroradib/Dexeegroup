"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { setWorkstyleVisibility } from "@/server/actions/candidate";

export function WorkstyleVisibilityToggle({ attemptId, initial }: { attemptId: string; initial: boolean }) {
  const t = useTranslations("assessments.result.workstyle");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const [checked, setChecked] = useState(initial);
  const [, start] = useTransition();
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor="ws-visible" className="font-normal">{t("visibility")}</Label>
      <Switch id="ws-visible" checked={checked} onCheckedChange={(v) => { setChecked(v); start(async () => { const r = await setWorkstyleVisibility(attemptId, v); if (!r.ok) { setChecked(!v); toast({ title: tc("errors.generic"), variant: "danger" }); } }); }} />
    </div>
  );
}
