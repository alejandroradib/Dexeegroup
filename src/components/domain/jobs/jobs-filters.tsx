"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  CEFR_LEVELS,
  CONTRACT_TYPES,
  ROLE_FAMILIES,
  SENIORITIES,
  WORK_MODES,
} from "@/lib/validation/enums";
import type { JobsFilter } from "@/lib/validation/jobs-filter";

/** Native selects keep the board server-renderable and fully functional without JS. */
function NativeSelect({
  id,
  name,
  label,
  value,
  options,
  any,
}: {
  id: string;
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
  any: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        defaultValue={value ?? ""}
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 flex h-10 w-full rounded-[10px] border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
      >
        <option value="">{any}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function JobsFilters({ filter }: { filter: JobsFilter }) {
  const t = useTranslations("marketing.jobs.filters");
  const te = useTranslations("enums");
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    data.forEach((value, key) => {
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    });
    router.push(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      method="get"
      className="border-border grid gap-4 rounded-[12px] border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-label={t("apply")}
    >
      <div className="grid gap-1.5 sm:col-span-2 lg:col-span-4">
        <Label htmlFor="q">{t("keyword")}</Label>
        <Input
          id="q"
          name="q"
          defaultValue={filter.q ?? ""}
          placeholder={t("keywordPlaceholder")}
          maxLength={80}
        />
      </div>
      <NativeSelect
        id="role_family"
        name="role_family"
        label={t("roleFamily")}
        value={filter.role_family}
        any={t("any")}
        options={ROLE_FAMILIES.map((v) => ({ value: v, label: te(`role_family.${v}`) }))}
      />
      <NativeSelect
        id="seniority"
        name="seniority"
        label={t("seniority")}
        value={filter.seniority}
        any={t("any")}
        options={SENIORITIES.map((v) => ({ value: v, label: te(`seniority.${v}`) }))}
      />
      <NativeSelect
        id="contract_type"
        name="contract_type"
        label={t("contractType")}
        value={filter.contract_type}
        any={t("any")}
        options={CONTRACT_TYPES.map((v) => ({ value: v, label: te(`contract_type.${v}`) }))}
      />
      <NativeSelect
        id="work_mode"
        name="work_mode"
        label={t("workMode")}
        value={filter.work_mode}
        any={t("any")}
        options={WORK_MODES.map((v) => ({ value: v, label: te(`work_mode.${v}`) }))}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="min_salary">{t("minSalary")}</Label>
        <Input
          id="min_salary"
          name="min_salary"
          type="number"
          min={0}
          step={100}
          defaultValue={filter.min_salary ?? ""}
          inputMode="numeric"
        />
      </div>
      <NativeSelect
        id="english_level"
        name="english_level"
        label={t("englishLevel")}
        value={filter.english_level}
        any={t("any")}
        options={CEFR_LEVELS.map((v) => ({ value: v, label: te(`cefr_level.${v}`) }))}
      />
      <div className="flex items-end gap-2 sm:col-span-2">
        <Button type="submit">{t("apply")}</Button>
        <Button type="button" variant="ghost" onClick={() => router.push(pathname)}>
          {t("clear")}
        </Button>
      </div>
    </form>
  );
}
