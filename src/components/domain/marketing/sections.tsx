import { ChevronRightIcon } from "lucide-react";

import { Isotype } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function Section({
  children,
  className,
  tone = "white",
  id,
}: {
  children: ReactNode;
  className?: string;
  tone?: "white" | "mist" | "navy";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-16 sm:py-20",
        tone === "mist" && "bg-mist",
        tone === "navy" && "chevron-cut bg-navy text-white [&_h2]:text-white [&_h3]:text-white",
        className,
      )}
    >
      <div className="container-marketing">{children}</div>
    </section>
  );
}

export function SectionTitle({
  title,
  subtitle,
  align = "left",
}: {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("mb-10 max-w-2xl", align === "center" && "mx-auto text-center")}>
      <h2 className="text-2xl sm:text-3xl">{title}</h2>
      {subtitle ? <p className="text-muted-foreground mt-3 text-base">{subtitle}</p> : null}
    </div>
  );
}

export function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon?: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="border-border rounded-[12px] border bg-white p-6">
      {Icon ? (
        <span className="bg-mint text-navy mb-4 flex size-10 items-center justify-center rounded-[10px]">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <h3 className="text-lg">{title}</h3>
      <p className="text-foreground mt-2 text-sm">{body}</p>
    </div>
  );
}

export function ChevronList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <Isotype className="mt-1 h-4 w-auto shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Steps({ steps }: { steps: { label: string; title?: string; body: string }[] }) {
  return (
    <ol className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
      {steps.map((step, index) => (
        <li key={step.label} className="border-border relative rounded-[12px] border bg-white p-6">
          <span className="text-deep-green text-xs font-semibold tracking-wide uppercase">
            {step.label}
          </span>
          {step.title ? <h3 className="mt-2 text-lg">{step.title}</h3> : null}
          <p className="mt-2 text-sm">{step.body}</p>
          {index < steps.length - 1 ? (
            <ChevronRightIcon
              className="text-green absolute top-1/2 -right-4 hidden size-6 -translate-y-1/2 lg:block"
              aria-hidden
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[12px] bg-white/5 p-6 ring-1 ring-white/10">
      <p className="font-heading text-green text-4xl font-extrabold">{value}</p>
      <p className="mt-2 text-sm text-white/80">{label}</p>
    </div>
  );
}
