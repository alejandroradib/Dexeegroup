"use client";

import { ClockIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Shows the remaining time until `expiresAt` and calls `onExpire` once. */
export function CountdownTimer({
  expiresAt,
  label,
  onExpire,
}: {
  expiresAt: string;
  label: string;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - Date.now());
  useEffect(() => {
    const target = new Date(expiresAt).getTime();
    const tick = () => {
      const ms = target - Date.now();
      setRemaining(ms);
      if (ms <= 0) {
        onExpire?.();
        window.clearInterval(id);
      }
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, onExpire]);
  const warning = remaining < 5 * 60 * 1000;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[10px] border px-3 py-1.5 text-sm font-medium",
        warning
          ? "border-warning bg-warning-soft text-warning"
          : "border-border text-navy bg-white",
      )}
      role="timer"
      aria-live={warning ? "polite" : "off"}
    >
      <ClockIcon className="size-4" aria-hidden />
      <span className="sr-only">{label}</span>
      <span className="font-mono tabular-nums">{formatCountdown(remaining)}</span>
    </div>
  );
}
