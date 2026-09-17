"use client";

import { ChevronDownIcon, LogOutIcon, MenuIcon, SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { LanguageSwitch } from "@/components/shared/language-switch";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

type AppShellProps = {
  areaLabel: string;
  nav: NavItem[];
  user: { name: string; email: string };
  settingsHref: string;
  onSignOut: () => Promise<void>;
  onLocaleChange?: (locale: Locale) => Promise<void>;
  notifications?: ReactNode;
  children: ReactNode;
};

function SidebarNav({ nav, onNavigate }: { nav: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Sidebar">
      {nav.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white",
              active && "bg-white/10 text-white",
            )}
          >
            <item.icon
              className={cn("size-4", active ? "text-green" : "text-white/60")}
              aria-hidden
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  areaLabel,
  nav,
  user,
  settingsHref,
  onSignOut,
  onLocaleChange,
  notifications,
  children,
}: AppShellProps) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);

  const sidebar = (onNavigate?: () => void) => (
    <div className="bg-navy flex h-full flex-col py-5 text-white">
      <div className="flex items-center justify-between px-5 pb-6">
        <Logo variant="white" height={24} />
      </div>
      <p className="px-6 pb-2 text-[11px] font-semibold tracking-wide text-white/50 uppercase">
        {areaLabel}
      </p>
      <SidebarNav nav={nav} onNavigate={onNavigate} />
      <div className="px-6 pt-6 text-xs text-white/50">{t("tagline")}</div>
    </div>
  );

  return (
    <div className="bg-mist/60 flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-[var(--sidebar-width)] lg:block">
        {sidebar()}
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-[var(--sidebar-width)] border-0 p-0"
          closeLabel={t("actions.closeMenu")}
        >
          <SheetTitle className="sr-only">{areaLabel}</SheetTitle>
          {sidebar(() => setOpen(false))}
        </SheetContent>
      </Sheet>
      <div className="flex min-h-screen flex-1 flex-col lg:pl-[var(--sidebar-width)]">
        <header className="border-border sticky top-0 z-30 flex h-[var(--topbar-height)] items-center justify-between gap-3 border-b bg-white px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label={t("actions.openMenu")}
            >
              <MenuIcon />
            </Button>
            <span className="text-navy text-sm font-semibold lg:hidden">{areaLabel}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitch onChange={onLocaleChange} compact />
            {notifications}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  aria-label={t("labels.account")}
                >
                  <span
                    className="bg-navy flex size-7 items-center justify-center rounded-full text-xs font-semibold text-white"
                    aria-hidden
                  >
                    {user.name.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[140px] truncate text-sm sm:inline">
                    {user.name || user.email}
                  </span>
                  <ChevronDownIcon className="hidden size-4 sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-foreground truncate font-normal">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={settingsHref}>
                    <SettingsIcon /> {t("labels.account")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void onSignOut()}>
                  <LogOutIcon /> {t("actions.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
