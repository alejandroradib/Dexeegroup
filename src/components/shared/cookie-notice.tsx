"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const KEY = "dexee-cookie-notice";

/** Shown only when GA4 is enabled (SPEC 13). Plausible is cookieless. */
export function CookieNotice({ enabled }: { enabled: boolean }) {
  const t = useTranslations("common.cookies");
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(() => {
      try {
        setDismissed(Boolean(window.localStorage.getItem(KEY)));
      } catch {
        setDismissed(false);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [enabled]);
  const visible = enabled && dismissed === false;
  if (!visible) return null;
  return (
    <div role="dialog" aria-live="polite" aria-label={t("title")} className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-[12px] border border-border bg-white p-4 shadow-xl">
      <p className="text-sm text-navy">{t("body")} <Link href="/privacy" className="text-link underline">{t("link")}</Link></p>
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={() => { try { window.localStorage.setItem(KEY, "1"); } catch { /* ignore */ } setDismissed(true); }}>{t("accept")}</Button>
      </div>
    </div>
  );
}
