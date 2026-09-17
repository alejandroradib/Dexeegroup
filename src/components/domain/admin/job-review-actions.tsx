"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import {
  commercialsSchema,
  requestChangesSchema,
  type CommercialsInput,
  type RequestChangesInput,
} from "@/lib/validation/admin";
import {
  adminSetJobStatus,
  approveJob,
  requestJobChanges,
  saveJobCommercials,
} from "@/server/actions/admin";
import type { Database } from "@/types/database";

type Job = Database["public"]["Tables"]["jobs"]["Row"];
type Commercials = Database["public"]["Tables"]["job_commercials"]["Row"] | null;

export function JobReviewActions({ job }: { job: Job }) {
  const t = useTranslations("admin.jobs.detail");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const form = useForm<RequestChangesInput>({
    resolver: zodResolver(requestChangesSchema),
    defaultValues: { job_id: job.id, message: job.review_message ?? "" },
  });
  const notify = (ok: boolean, msg: string) =>
    toast({ title: ok ? msg : tc("errors.generic"), variant: ok ? "success" : "danger" });
  const reviewable =
    job.status === "pending_review" || job.status === "changes_requested" || job.status === "draft";

  return (
    <div className="flex flex-wrap gap-2">
      {reviewable || job.status === "paused" || job.status === "closed" ? (
        <Button
          variant="accent"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await approveJob(job.id);
              notify(r.ok, t("approved"));
              router.refresh();
            })
          }
        >
          {reviewable ? t("approve") : t("reopen")}
        </Button>
      ) : null}
      {reviewable ? (
        <Button variant="outline" onClick={() => setOpen(true)}>
          {t("requestChanges")}
        </Button>
      ) : null}
      {job.status === "published" ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await adminSetJobStatus(job.id, "paused");
              notify(r.ok, tc("actions.save"));
              router.refresh();
            })
          }
        >
          {t("pause")}
        </Button>
      ) : null}
      {job.status !== "closed" ? (
        <ConfirmButton
          variant="ghost"
          title={t("close")}
          onConfirm={async () => {
            const r = await adminSetJobStatus(job.id, "closed");
            notify(r.ok, tc("actions.save"));
            router.refresh();
          }}
        >
          {t("close")}
        </ConfirmButton>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={tc("actions.close")}>
          <form
            onSubmit={form.handleSubmit((values) =>
              start(async () => {
                const r = await requestJobChanges(values);
                notify(r.ok, t("changesRequested"));
                setOpen(false);
                router.refresh();
              }),
            )}
            className="grid gap-4"
            noValidate
          >
            <DialogHeader>
              <DialogTitle>{t("requestChanges")}</DialogTitle>
              <DialogDescription>{t("requestChangesBody")}</DialogDescription>
            </DialogHeader>
            <FormField
              id="message"
              label={t("message")}
              error={form.formState.errors.message?.message}
            >
              <Textarea id="message" rows={5} {...form.register("message")} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {tc("actions.cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {t("requestChanges")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CommercialsForm({
  jobId,
  commercials,
}: {
  jobId: string;
  commercials: Commercials;
}) {
  const t = useTranslations("admin.jobs.detail");
  const tc = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const form = useForm<CommercialsInput>({
    resolver: zodResolver(commercialsSchema),
    defaultValues: {
      job_id: jobId,
      client_bill_rate_usd: commercials?.client_bill_rate_usd ?? undefined,
      placement_fee_usd: commercials?.placement_fee_usd ?? undefined,
      internal_notes: commercials?.internal_notes ?? "",
    },
  });
  const e = form.formState.errors;
  const num = { setValueAs: (v: string) => (v === "" ? undefined : Number(v)) };
  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        start(async () => {
          const r = await saveJobCommercials(values);
          toast({
            title: r.ok ? t("commercialsSaved") : tc("errors.generic"),
            variant: r.ok ? "success" : "danger",
          });
          router.refresh();
        }),
      )}
      className="grid gap-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="client_bill_rate_usd"
          label={t("billRate")}
          error={e.client_bill_rate_usd?.message}
        >
          <Input
            id="client_bill_rate_usd"
            type="number"
            min={0}
            {...form.register("client_bill_rate_usd", num)}
          />
        </FormField>
        <FormField
          id="placement_fee_usd"
          label={t("placementFee")}
          error={e.placement_fee_usd?.message}
        >
          <Input
            id="placement_fee_usd"
            type="number"
            min={0}
            {...form.register("placement_fee_usd", num)}
          />
        </FormField>
      </div>
      <FormField id="internal_notes" label={t("internalNotes")} error={e.internal_notes?.message}>
        <Textarea id="internal_notes" rows={3} {...form.register("internal_notes")} />
      </FormField>
      <Button type="submit" size="sm" disabled={pending} className="justify-self-start">
        {tc("actions.save")}
      </Button>
    </form>
  );
}
