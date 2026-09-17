import type { ReactNode } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="border-border rounded-[16px] border bg-white p-6 sm:p-8">
      <h1 className="text-2xl">{title}</h1>
      {subtitle ? <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
      {footer ? (
        <div className="border-border text-muted-foreground mt-6 border-t pt-4 text-sm">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
