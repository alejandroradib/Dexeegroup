"use client";

import { GlobeIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";

export function LanguageSwitch({ onChange, compact = false }: { onChange?: (locale: Locale) => Promise<void> | void; compact?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("common.labels");
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const labels: Record<Locale, string> = { en: t("english"), es: t("spanish") };

  function switchTo(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await onChange?.(next);
      const query = typeof window === "undefined" ? "" : window.location.search.replace(/^\?/, "");
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { locale: next });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon-sm" : "sm"} aria-label={t("language")} disabled={pending}>
          <GlobeIcon />
          {!compact && <span className="uppercase">{locale}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((item) => (
          <DropdownMenuItem key={item} onSelect={() => switchTo(item)} aria-current={item === locale ? "true" : undefined} className={item === locale ? "font-semibold text-navy" : undefined}>
            {labels[item]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
