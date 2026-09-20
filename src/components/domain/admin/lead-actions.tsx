"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { convertLeadToCompany, setLeadStatus } from "@/server/actions/leads";
import type { LeadStatus } from "@/server/services/leads";

/**
 * Queue actions on one lead. `answered_at` and `answered_by` are set by the database
 * guard, not here, so the response-time report cannot be written around from the UI.
 */
export function LeadActions({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const t = useTranslations("admin.leads");
  const [pending, start] = useTransition();
  const [converting, setConverting] = useState(false);
  const [companyId, setCompanyId] = useState("");

  const move = (next: "new" | "answered" | "discarded") => {
    start(async () => {
      await setLeadStatus({ lead_id: leadId, status: next });
    });
  };

  if (converting) {
    return (
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          start(async () => {
            const result = await convertLeadToCompany({ lead_id: leadId, company_id: companyId });
            if (result.ok) setConverting(false);
          });
        }}
      >
        <Input
          value={companyId}
          onChange={(event) => setCompanyId(event.target.value)}
          placeholder={t("convertHint")}
          aria-label={t("convert")}
          className="h-8 w-64 text-xs"
          required
        />
        <Button type="submit" size="sm" variant="accent" disabled={pending}>
          {t("convertSubmit")}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "new" ? (
        <>
          <Button size="sm" variant="accent" disabled={pending} onClick={() => move("answered")}>
            {t("markAnswered")}
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => move("discarded")}>
            {t("markDiscarded")}
          </Button>
        </>
      ) : null}
      {status === "answered" ? (
        <Button size="sm" variant="outline" onClick={() => setConverting(true)}>
          {t("convert")}
        </Button>
      ) : null}
      {status === "discarded" ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => move("new")}>
          {t("reopen")}
        </Button>
      ) : null}
    </div>
  );
}
