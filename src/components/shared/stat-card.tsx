import type { ReactNode } from "react";

export function StatCard({ label, value, hint, action }: { label: string; value: string | number; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-[12px] border border-border bg-white p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-3xl font-bold text-navy">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
