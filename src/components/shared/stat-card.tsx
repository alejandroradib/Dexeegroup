import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  action,
}: {
  label: string;
  value: string | number;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-border rounded-[12px] border bg-white p-5">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="font-heading text-navy mt-2 text-3xl font-bold">{value}</p>
      {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
