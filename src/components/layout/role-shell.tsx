import { getTranslations } from "next-intl/server";

import { NotificationBell } from "@/components/domain/notifications/notification-bell";
import { AppShell, type NavIcon, type NavItem } from "@/components/layout/app-shell";
import type { Locale } from "@/i18n/routing";
import { requireRole, type UserRole } from "@/lib/auth/session";
import { signOut, updateLocale } from "@/server/actions/auth";
import { listRecentNotifications } from "@/server/services/notifications";

import type { ReactNode } from "react";

type NavSpec = { href: string; key: string; icon: NavIcon; exact?: boolean };

const NAV: Record<UserRole, NavSpec[]> = {
  company: [
    { href: "/company", key: "dashboard", icon: "dashboard", exact: true },
    { href: "/company/jobs", key: "jobs", icon: "jobs" },
    { href: "/company/candidates", key: "candidates", icon: "users" },
    { href: "/company/shortlist", key: "shortlist", icon: "bookmark" },
    { href: "/company/settings", key: "settings", icon: "settings" },
  ],
  candidate: [
    { href: "/candidate", key: "dashboard", icon: "dashboard", exact: true },
    { href: "/candidate/profile", key: "profile", icon: "user" },
    { href: "/candidate/jobs", key: "jobs", icon: "search" },
    { href: "/candidate/applications", key: "applications", icon: "file" },
    { href: "/candidate/assessments", key: "assessments", icon: "clipboard" },
    { href: "/candidate/interview", key: "interview", icon: "interview" },
    { href: "/candidate/settings", key: "settings", icon: "settings" },
  ],
  admin: [
    { href: "/admin", key: "dashboard", icon: "dashboard", exact: true },
    { href: "/admin/companies", key: "companies", icon: "building" },
    { href: "/admin/jobs", key: "jobs", icon: "jobs" },
    { href: "/admin/candidates", key: "candidates", icon: "users" },
    { href: "/admin/applications", key: "applications", icon: "file" },
    { href: "/admin/leads", key: "leads", icon: "inbox" },
    { href: "/admin/placements", key: "placements", icon: "handshake" },
    { href: "/admin/assessments", key: "assessments", icon: "clipboard" },
    { href: "/admin/team", key: "team", icon: "shield" },
    { href: "/admin/activity", key: "activity", icon: "activity" },
    { href: "/admin/settings", key: "settings", icon: "settings" },
  ],
};

export async function RoleShell({
  area,
  locale,
  children,
}: {
  area: UserRole;
  locale: Locale;
  children: ReactNode;
}) {
  const user = await requireRole(area, locale, `/${area}`);
  const t = await getTranslations("nav");
  const nav: NavItem[] = NAV[area].map((item) => ({
    href: item.href,
    icon: item.icon,
    exact: item.exact,
    label: t(`${area}.${item.key}` as "company.dashboard"),
  }));
  const notifications = await listRecentNotifications(user.id);

  async function handleLocale(next: Locale) {
    "use server";
    await updateLocale(next);
  }

  return (
    <AppShell
      areaLabel={t(`areaLabel.${area}`)}
      nav={nav}
      user={{ name: user.profile?.full_name ?? "", email: user.email }}
      settingsHref={`/${area}/settings`}
      onSignOut={signOut}
      onLocaleChange={handleLocale}
      notifications={<NotificationBell initial={notifications} />}
    >
      {children}
    </AppShell>
  );
}
