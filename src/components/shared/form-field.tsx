import { FieldError } from "@/components/shared/field-error";
import { Label } from "@/components/ui/label";

import type { ReactNode } from "react";

export function FormField({
  id,
  label,
  hint,
  error,
  children,
  optional,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  optional?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="flex items-baseline justify-between gap-2">
        <span>{label}</span>
        {optional ? (
          <span className="text-muted-foreground text-xs font-normal">{optional}</span>
        ) : null}
      </Label>
      {children}
      {hint && !error ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      <FieldError error={error} />
    </div>
  );
}
