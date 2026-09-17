import * as React from "react";

import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

/** Native select styled like the Input primitive: works with react-hook-form register and without JS. */
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select"> & { options: Option[]; placeholder?: string }
>(function NativeSelect({ className, options, placeholder, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 aria-[invalid=true]:border-destructive flex h-10 w-full rounded-[10px] border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
});
