import {
  ActivityIcon,
  BookmarkIcon,
  BriefcaseIcon,
  BuildingIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  HandshakeIcon,
  LayoutDashboardIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { NotificationBell } from "@/components/domain/notifications/notification-bell";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import type { Locale } from "@/i18n/routing";
import { requireRole, type UserRole } from "@/lib/auth/session";
import { signOut, updateLocale } from "@/server/actions/auth";
import { listRecentNotifications } from "@/server/services/notifications";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type NavSpec = { href: string; key: string; icon: LucideIcon; exact?: boolean };

const NAV: Record<UserRole, NavSpec[]> = {
  company: [
    { href: "/company", key: "dashboard", icon: LayoutDashboardIcon, exact: true },
    { href: "/company/jobs", key: "jobs", icon: BriefcaseIcon },
    { href: "/company/candidates", key: "candidates", icon: UsersIcon },
    { href: "/company/shortlist", key: "shortlist", icon: BookmarkIcon },
    { href: "/company/settings", key: "settings", icon: SettingsIcon },
  ],
  candidate: [
    { href: "/candidate", key: "dashboard", icon: LayoutDashboardIcon, exact: true },
    { href: "/candidate/profile", key: "profile", icon: UserIcon },
    { href: "/candidate/jobs", key: "jobs", icon: SearchIcon },
    { href: "/candidate/applications", key: "applications", icon: FileTextIcon },
    { href: "/candidate/assessments", key: "assessments", icon: ClipboardCheckIcon },
    { href: "/candidate/settings", key: "settings", icon: SettingsIcon },
  ],
  admin: [
    { href: "/admin", key: "dashboard", icon: LayoutDashboardIcon, exact: true },
    { href: "/admin/companies", key: "companies", icon: BuildingIcon },
    { href: "/admin/jobs", key: "jobs", icon: BriefcaseIcon },
    { href: "/admin/candidates", key: "candidates", icon: UsersIcon },
    { href: "/admin/applications", key: "applications", icon: FileTextIcon },
    { href: "/admin/placements", key: "placements", icon: HandshakeIcon },
    { href: "/admin/assessments", key: "assessments", icon: ClipboardCheckIcon },
    { href: "/admin/team", key: "team", icon: ShieldIcon },
    { href: "/admin/activity", key: "activity", icon: ActivityIcon },
    { href: "/admin/settings", key: "settings", icon: SettingsIcon },
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
