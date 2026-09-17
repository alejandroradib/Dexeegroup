"use client";

import { useTranslations } from "next-intl";

/** Renders a zod message key from `validation.*`, or the raw message when it is not a key. */
export function FieldError({ error, id }: { error?: string; id?: string }) {
  const t = useTranslations("validation");
  if (!error) return null;
  const known = t.has(error as "required") ? t(error as "required") : error;
  return (
    <p id={id} role="alert" className="text-destructive text-xs">
      {known}
    </p>
  );
}
