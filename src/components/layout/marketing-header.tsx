"use client";

import { MenuIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { LanguageSwitch } from "@/components/shared/language-switch";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/for-companies", key: "forCompanies" },
  { href: "/for-talent", key: "forTalent" },
  { href: "/pricing", key: "pricing" },
  { href: "/jobs", key: "jobs" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

export function MarketingHeader({
  signedIn,
  dashboardHref,
}: {
  signedIn: boolean;
  dashboardHref?: string;
}) {
  const t = useTranslations("nav.marketing");
  const tc = useTranslations("common.actions");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = NAV.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      className={cn(
        "text-navy hover:bg-mist rounded-[8px] px-3 py-2 text-sm font-medium",
        pathname === item.href && "bg-mist",
      )}
      onClick={() => setOpen(false)}
    >
      {t(item.key)}
    </Link>
  ));

  return (
    <header className="border-border sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <div className="container-marketing flex h-16 items-center justify-between gap-4">
        <Logo height={26} />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {links}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          {signedIn && dashboardHref ? (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href={dashboardHref}>{t("signIn")}</Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/sign-in">{t("signIn")}</Link>
            </Button>
          )}
          <Button asChild variant="accent" size="sm" className="hidden sm:inline-flex">
            <Link href="/sign-up/company">{t("postJob")}</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={tc("openMenu")}>
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" closeLabel={tc("closeMenu")}>
              <SheetTitle className="sr-only">{tc("openMenu")}</SheetTitle>
              <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
                {links}
                <Link
                  href="/sign-in"
                  className="text-navy hover:bg-mist rounded-[8px] px-3 py-2 text-sm font-medium"
                  onClick={() => setOpen(false)}
                >
                  {t("signIn")}
                </Link>
                <Button asChild variant="accent" className="mt-4">
                  <Link href="/sign-up/company" onClick={() => setOpen(false)}>
                    {t("postJob")}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/sign-up/candidate" onClick={() => setOpen(false)}>
                    {t("createProfile")}
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
