"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { APPLICATION_STATUSES } from "@/lib/validation/enums";
import { adminChangeApplicationStatus, releaseContact } from "@/server/actions/admin";
import type { Database } from "@/types/database";

type Status = Database["public"]["Enums"]["application_status"];

export function ReleaseContactButton({ applicationId, company }: { applicationId: string; company: string }) {
  const t = useTranslations("admin.applications");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  return (
    <ConfirmButton size="sm" variant="accent" title={t("release")} description={t("releaseConfirm", { company })} onConfirm={async () => {
      const r = await releaseContact(applicationId);
      toast({ title: r.ok ? t("released") : tc("errors.generic"), variant: r.ok ? "success" : "danger" });
      router.refresh();
    }}>
      {t("release")}
    </ConfirmButton>
  );
}

export function StatusSelect({ applicationId, status }: { applicationId: string; status: Status }) {
  const t = useTranslations("admin.applications");
  const tc = useTranslations("common");
  const te = useTranslations("enums.application_status");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={t("changeStatus")}
      value={status}
      disabled={pending}
      onChange={(e) => start(async () => {
        const r = await adminChangeApplicationStatus({ application_id: applicationId, status: e.target.value as Status });
        toast({ title: r.ok ? t("statusChanged") : tc("errors.generic"), variant: r.ok ? "success" : "danger" });
        router.refresh();
      })}
      className="h-8 rounded-[8px] border border-input bg-white px-2 text-xs"
    >
      {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{te(s)}</option>)}
    </select>
  );
}
