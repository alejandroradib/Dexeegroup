import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  action,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  action?: ReactNode;
  /** "attention" outlines the card so a non-zero problem count is not missed among the metrics. */
  tone?: "neutral" | "attention";
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] border bg-white p-5",
        tone === "attention" ? "border-danger bg-danger-soft/30" : "border-border",
      )}
      role={tone === "attention" ? "status" : undefined}
    >
      <p className="text-muted-foreground text-sm">{label}</p>
      <p
        className={cn(
          "font-heading mt-2 text-3xl font-bold",
          tone === "attention" ? "text-danger" : "text-navy",
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
