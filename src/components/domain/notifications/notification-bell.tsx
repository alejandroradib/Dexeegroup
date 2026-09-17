"use client";

import { BellIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)),
    );
    start(async () => {
      await markNotificationRead(id);
    });
  }

  function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    start(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={`${t("labels.notifications")}${unread ? ` (${unread})` : ""}`}
        >
          <BellIcon />
          {unread > 0 ? (
            <span className="bg-green absolute top-1 right-1 size-2 rounded-full" aria-hidden />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-border flex items-center justify-between border-b px-3 py-2">
          <span className="text-navy text-sm font-semibold">{t("labels.notifications")}</span>
          {unread > 0 ? (
            <button type="button" className="text-link text-xs hover:underline" onClick={markAll}>
              {t("actions.markAllRead")}
            </button>
          ) : null}
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <li className="text-muted-foreground px-3 py-6 text-center text-sm">
              {t("empty.title")}
            </li>
          ) : (
            items.map((n) => (
              <li
                key={n.id}
                className={cn("border-border border-b last:border-0", !n.read_at && "bg-mint/40")}
              >
                {n.link ? (
                  <Link
                    href={n.link}
                    onClick={() => markRead(n.id)}
                    className="hover:bg-mist block px-3 py-2.5"
                  >
                    <p className="text-navy text-sm font-medium">{n.title}</p>
                    {n.body ? (
                      <p className="text-muted-foreground mt-0.5 text-xs">{n.body}</p>
                    ) : null}
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      {format.relativeTime(new Date(n.created_at))}
                    </p>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="hover:bg-mist block w-full px-3 py-2.5 text-left"
                  >
                    <p className="text-navy text-sm font-medium">{n.title}</p>
                    {n.body ? (
                      <p className="text-muted-foreground mt-0.5 text-xs">{n.body}</p>
                    ) : null}
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      {format.relativeTime(new Date(n.created_at))}
                    </p>
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
