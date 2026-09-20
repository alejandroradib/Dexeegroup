"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CALCULATOR_DEFAULTS, productById } from "@/content/pricing";
import { track } from "@/lib/analytics/events";
import { compareHireCost, type EngagementMode } from "@/lib/pricing/calculator";
import { cn, formatUsd } from "@/lib/utils";

const PLACEMENT_FEE = productById("placement")?.amountUsd ?? 0;
const EOR_FEE = productById("eor")?.amountUsd ?? 0;

type FieldId =
  | "usMonthlySalaryUsd"
  | "dexeeMonthlySalaryUsd"
  | "usEmployerLoadPct"
  | "usRecruitingFeePct"
  | "dexeeEmployerLoadPct"
  | "months";

const FIELDS: { id: FieldId; suffix: "usd" | "pct" | "months" }[] = [
  { id: "usMonthlySalaryUsd", suffix: "usd" },
  { id: "dexeeMonthlySalaryUsd", suffix: "usd" },
  { id: "usEmployerLoadPct", suffix: "pct" },
  { id: "dexeeEmployerLoadPct", suffix: "pct" },
  { id: "usRecruitingFeePct", suffix: "pct" },
  { id: "months", suffix: "months" },
];

/**
 * Cost comparison a visitor can change. Everything runs in the browser and nothing is
 * stored or sent anywhere: the inputs are the visitor's own assumptions, not Dexee
 * measurements, and the note under the result says so.
 */
export function CostCalculator() {
  const t = useTranslations("marketing.pricing.calculator");
  const locale = useLocale();
  const formId = useId();
  const [mode, setMode] = useState<EngagementMode>("placement");
  const used = useRef(false);
  const [values, setValues] = useState<Record<FieldId, string>>({
    usMonthlySalaryUsd: String(CALCULATOR_DEFAULTS.usMonthlySalaryUsd),
    dexeeMonthlySalaryUsd: String(CALCULATOR_DEFAULTS.dexeeMonthlySalaryUsd),
    usEmployerLoadPct: String(CALCULATOR_DEFAULTS.usEmployerLoadPct),
    usRecruitingFeePct: String(CALCULATOR_DEFAULTS.usRecruitingFeePct),
    dexeeEmployerLoadPct: String(CALCULATOR_DEFAULTS.dexeeEmployerLoadPct),
    months: String(CALCULATOR_DEFAULTS.months),
  });

  const result = useMemo(
    () =>
      compareHireCost({
        usMonthlySalaryUsd: Number(values.usMonthlySalaryUsd),
        dexeeMonthlySalaryUsd: Number(values.dexeeMonthlySalaryUsd),
        usEmployerLoadPct: Number(values.usEmployerLoadPct),
        usRecruitingFeePct: Number(values.usRecruitingFeePct),
        dexeeEmployerLoadPct: Number(values.dexeeEmployerLoadPct),
        months: Number(values.months),
        mode,
        placementFeeUsd: PLACEMENT_FEE,
        eorMonthlyFeeUsd: EOR_FEE,
      }),
    [values, mode],
  );

  const money = (amount: number) => formatUsd(amount, locale);

  // Once per visitor: what matters is that they engaged, not how many digits they typed.
  const onFirstChange = () => {
    if (used.current) return;
    used.current = true;
    track("use_calculator");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div>
        <fieldset className="mb-6">
          <legend className="text-navy mb-2 text-sm font-medium">{t("modeLabel")}</legend>
          <div className="flex gap-2">
            {(["placement", "eor"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                onClick={() => {
                  onFirstChange();
                  setMode(option);
                }}
                className={cn(
                  "focus-visible:ring-ring/40 rounded-[10px] border px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none",
                  mode === option
                    ? "border-navy bg-navy text-white"
                    : "border-border text-navy hover:bg-mist",
                )}
              >
                {t(`mode.${option}` as "mode.placement")}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.id}>
              <Label htmlFor={`${formId}-${field.id}`}>
                {t(`fields.${field.id}` as "fields.usMonthlySalaryUsd")}
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  id={`${formId}-${field.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={field.suffix === "pct" ? 1 : 100}
                  value={values[field.id]}
                  onChange={(event) => {
                    onFirstChange();
                    setValues((current) => ({ ...current, [field.id]: event.target.value }));
                  }}
                />
                <span className="text-muted-foreground w-16 shrink-0 text-xs">
                  {t(`suffix.${field.suffix}` as "suffix.usd")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-mist rounded-[12px] p-6">
        <h3 className="text-lg">{t("resultTitle", { months: result.months })}</h3>
        <dl className="mt-6 space-y-6">
          <div>
            <dt className="text-navy text-sm font-semibold">{t("usTitle")}</dt>
            <dd className="mt-2 space-y-1 text-sm">
              <Row label={t("lineSalary")} value={money(result.us.salary)} />
              <Row label={t("lineEmployerLoad")} value={money(result.us.employerLoad)} />
              <Row label={t("lineRecruiting")} value={money(result.us.oneTime)} />
              <Row label={t("lineTotal")} value={money(result.us.total)} strong />
            </dd>
          </div>
          <div>
            <dt className="text-navy text-sm font-semibold">{t("dexeeTitle")}</dt>
            <dd className="mt-2 space-y-1 text-sm">
              <Row label={t("lineSalary")} value={money(result.dexee.salary)} />
              <Row label={t("lineEmployerLoad")} value={money(result.dexee.employerLoad)} />
              {mode === "placement" ? (
                <Row label={t("linePlacement")} value={money(result.dexee.oneTime)} />
              ) : (
                <Row label={t("lineManagement")} value={money(result.dexee.management)} />
              )}
              <Row label={t("lineTotal")} value={money(result.dexee.total)} strong />
            </dd>
          </div>
        </dl>

        <p className="border-border mt-6 border-t pt-6" aria-live="polite">
          <span className="font-heading text-navy block text-3xl font-extrabold">
            {money(Math.abs(result.savings))}
          </span>
          <span className="text-muted-foreground mt-1 block text-sm">
            {result.savings >= 0
              ? t("savings", { percent: result.savingsPct, months: result.months })
              : t("extraCost", { percent: Math.abs(result.savingsPct), months: result.months })}
          </span>
        </p>
        <p className="text-muted-foreground mt-4 text-xs">{t("assumptionNote")}</p>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <span className={cn("flex justify-between gap-4", strong && "text-navy font-semibold")}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}
