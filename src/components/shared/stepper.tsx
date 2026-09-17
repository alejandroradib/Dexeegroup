import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Step = { id: string; label: string };

export function Stepper({
  steps,
  current,
  onSelect,
  className,
}: {
  steps: Step[];
  current: number;
  onSelect?: (index: number) => void;
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-2 sm:gap-3", className)} aria-label="Steps">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const content = (
          <>
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                done && "border-green bg-green text-navy",
                active && "border-navy bg-navy text-white",
                !done && !active && "border-border text-slate bg-white",
              )}
              aria-hidden
            >
              {done ? <CheckIcon className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                active ? "text-navy font-semibold" : "text-slate",
                "hidden sm:inline",
              )}
            >
              {step.label}
            </span>
          </>
        );
        return (
          <li
            key={step.id}
            className="flex items-center gap-2"
            aria-current={active ? "step" : undefined}
          >
            {onSelect && done ? (
              <button
                type="button"
                onClick={() => onSelect(index)}
                className="flex items-center gap-2 rounded-[8px] hover:underline"
              >
                {content}
              </button>
            ) : (
              <span className="flex items-center gap-2">{content}</span>
            )}
            {index < steps.length - 1 ? (
              <span className="bg-border hidden h-px w-6 sm:block" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
