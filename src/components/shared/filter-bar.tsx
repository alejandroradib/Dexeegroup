import { useTranslations } from "next-intl";

import type { ReactNode } from "react";

/** Server-rendered GET filter form: fields submit as URL query params. */
export function FilterBar({ children, action }: { children: ReactNode; action?: string }) {
  const t = useTranslations("marketing.jobs.filters");
  return (
    <form
      method="get"
      action={action}
      className="border-border mb-4 flex flex-wrap items-end gap-3 rounded-[12px] border bg-white p-4"
    >
      {children}
      <button
        type="submit"
        className="bg-navy h-10 rounded-[10px] px-4 text-sm font-medium text-white"
      >
        {t("apply")}
      </button>
    </form>
  );
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-navy grid min-w-[160px] flex-1 gap-1 text-xs font-medium">
      {label}
      {children}
    </label>
  );
}

export const filterInputClass =
  "h-10 w-full rounded-[10px] border border-input bg-background px-3 text-sm font-normal";
