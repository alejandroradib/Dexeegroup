"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { updateAssessmentConfig } from "@/server/actions/admin";
import type { Database } from "@/types/database";

type Assessment = Database["public"]["Tables"]["assessments"]["Row"];

export function AssessmentConfigForm({ assessment }: { assessment: Assessment }) {
  const t = useTranslations("admin.settings");
  const tc = useTranslations("common");
  const te = useTranslations("enums.assessment_type");
  const router = useRouter();
  const { toast } = useToast();
  const [config, setConfig] = useState(JSON.stringify(assessment.config, null, 2));
  const [active, setActive] = useState(assessment.is_active);
  const [cooldown, setCooldown] = useState(assessment.cooldown_days);
  const [limit, setLimit] = useState<number | "">(assessment.time_limit_minutes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const id = assessment.id.slice(0, 8);

  return (
    <form className="grid gap-4 rounded-[12px] border border-border bg-white p-5" onSubmit={(e) => { e.preventDefault(); setError(null); start(async () => {
      const r = await updateAssessmentConfig({ assessment_id: assessment.id, config, is_active: active, cooldown_days: cooldown, time_limit_minutes: limit === "" ? null : limit });
      if (r.ok) { toast({ title: t("saved", { version: assessment.version + 1 }), variant: "success" }); router.refresh(); }
      else setError(r.details?.config ? t("invalidJson") : tc("errors.generic"));
    }); }}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base">{te(assessment.type)} <span className="text-xs font-normal text-muted-foreground">v{assessment.version}</span></h3>
        <div className="flex items-center gap-2"><Label htmlFor={`active-${id}`} className="font-normal">{t("active")}</Label><Switch id={`active-${id}`} checked={active} onCheckedChange={setActive} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={`cooldown-${id}`} label={t("cooldown")}><Input id={`cooldown-${id}`} type="number" min={1} max={365} value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))} /></FormField>
        <FormField id={`limit-${id}`} label={t("timeLimit")}><Input id={`limit-${id}`} type="number" min={1} max={1440} value={limit} onChange={(e) => setLimit(e.target.value === "" ? "" : Number(e.target.value))} /></FormField>
      </div>
      <FormField id={`config-${id}`} label={t("config")} error={error ?? undefined}><Textarea id={`config-${id}`} rows={12} value={config} onChange={(e) => setConfig(e.target.value)} className="font-mono text-xs" /></FormField>
      <Button type="submit" disabled={pending} className="justify-self-start">{tc("actions.save")}</Button>
    </form>
  );
}
