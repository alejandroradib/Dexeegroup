"use client";

import { BellIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead, markNotificationRead } from "@/server/actions/notifications";
import type { Notification } from "@/server/services/notifications";

export function NotificationBell({ initial }: { initial: Notification[] }) {
  const t = useTranslations("common");
  const format = useFormatter();
  const [items, setItems] = useState(initial);
  const [, start] = useTransition();
  const unread = items.filter((n) => !n.read_at).length;

  function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)));
    start(async () => { await markNotificationRead(id); });
  }

  function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    start(async () => { await markAllNotificationsRead(); });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label={`${t("labels.notifications")}${unread ? ` (${unread})` : ""}`}>
          <BellIcon />
          {unread > 0 ? <span className="absolute top-1 right-1 size-2 rounded-full bg-green" aria-hidden /> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold text-navy">{t("labels.notifications")}</span>
          {unread > 0 ? <button type="button" className="text-xs text-link hover:underline" onClick={markAll}>{t("actions.markAllRead")}</button> : null}
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">{t("empty.title")}</li>
          ) : (
            items.map((n) => (
              <li key={n.id} className={cn("border-b border-border last:border-0", !n.read_at && "bg-mint/40")}>
                {n.link ? (
                  <Link href={n.link} onClick={() => markRead(n.id)} className="block px-3 py-2.5 hover:bg-mist">
                    <p className="text-sm font-medium text-navy">{n.title}</p>
                    {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">{format.relativeTime(new Date(n.created_at))}</p>
                  </Link>
                ) : (
                  <button type="button" onClick={() => markRead(n.id)} className="block w-full px-3 py-2.5 text-left hover:bg-mist">
                    <p className="text-sm font-medium text-navy">{n.title}</p>
                    {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">{format.relativeTime(new Date(n.created_at))}</p>
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
