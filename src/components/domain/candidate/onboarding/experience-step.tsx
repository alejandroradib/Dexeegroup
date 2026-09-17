"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { ConfirmButton } from "@/components/shared/confirm-button";
import { FormField } from "@/components/shared/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { experienceSchema, type ExperienceInput } from "@/lib/validation/candidate";
import { deleteExperience, upsertExperience } from "@/server/actions/candidate";
import type { CandidateExperience } from "@/server/services/candidates";

function toMonth(value: string | null) {
  return value ? value.slice(0, 7) : "";
}

export function ExperienceStep({
  rows,
  onNext,
  onBack,
  requireOne = true,
}: {
  rows: CandidateExperience[];
  onNext: () => void;
  onBack: () => void;
  requireOne?: boolean;
}) {
  const t = useTranslations("candidate.onboarding.experience");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState<ExperienceInput | null>(null);
  const [pending, start] = useTransition();

  const form = useForm<ExperienceInput>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      company: "",
      title: "",
      start_date: "",
      end_date: "",
      is_current: false,
      description: "",
    },
  });
  const e = form.formState.errors;

  function startEdit(row?: CandidateExperience) {
    const values: ExperienceInput = row
      ? {
          id: row.id,
          company: row.company,
          title: row.title,
          start_date: toMonth(row.start_date),
          end_date: toMonth(row.end_date),
          is_current: row.is_current,
          description: row.description ?? "",
        }
      : {
          company: "",
          title: "",
          start_date: "",
          end_date: "",
          is_current: false,
          description: "",
        };
    form.reset(values);
    setEditing(values);
  }

  const save = form.handleSubmit((values) =>
    start(async () => {
      const result = await upsertExperience(values);
      if (result.ok) {
        setEditing(null);
        router.refresh();
      } else toast({ title: tc("errors.generic"), variant: "danger" });
    }),
  );

  return (
    <div className="grid gap-5">
      {rows.length === 0 && !editing ? <Alert>{t("empty")}</Alert> : null}
      <ul className="grid gap-3">
        {rows.map((row) => (
          <li
            key={row.id}
            className="border-border flex items-start justify-between gap-3 rounded-[12px] border p-4"
          >
            <div>
              <p className="text-navy font-medium">{row.title}</p>
              <p className="text-muted-foreground text-sm">
                {row.company} ·{" "}
                {row.start_date
                  ? format.dateTime(new Date(row.start_date), { month: "short", year: "numeric" })
                  : ""}{" "}
                –{" "}
                {row.is_current
                  ? tc("labels.today")
                  : row.end_date
                    ? format.dateTime(new Date(row.end_date), { month: "short", year: "numeric" })
                    : ""}
              </p>
              {row.description ? <p className="mt-1 text-sm">{row.description}</p> : null}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(row)}>
                {t("edit")}
              </Button>
              <ConfirmButton
                variant="ghost"
                size="icon-sm"
                title={t("removeConfirm")}
                onConfirm={async () => {
                  await deleteExperience(row.id);
                  router.refresh();
                }}
                aria-label={tc("actions.remove")}
              >
                <Trash2Icon />
              </ConfirmButton>
            </div>
          </li>
        ))}
      </ul>
      {editing ? (
        <form
          onSubmit={save}
          className="border-navy/30 bg-mist/50 grid gap-4 rounded-[12px] border p-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="exp_company" label={t("company")} error={e.company?.message}>
              <Input id="exp_company" {...form.register("company")} />
            </FormField>
            <FormField id="exp_title" label={t("role")} error={e.title?.message}>
              <Input id="exp_title" {...form.register("title")} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="exp_start" label={t("start")} error={e.start_date?.message}>
              <Input id="exp_start" type="month" {...form.register("start_date")} />
            </FormField>
            <FormField id="exp_end" label={t("end")} error={e.end_date?.message}>
              <Input
                id="exp_end"
                type="month"
                disabled={form.watch("is_current")}
                {...form.register("end_date")}
              />
            </FormField>
            <Controller
              control={form.control}
              name="is_current"
              render={({ field }) => (
                <div className="flex items-center gap-2 pt-7">
                  <Checkbox
                    id="exp_current"
                    checked={field.value}
                    onCheckedChange={(c) => field.onChange(c === true)}
                  />
                  <Label htmlFor="exp_current" className="font-normal">
                    {t("current")}
                  </Label>
                </div>
              )}
            />
          </div>
          <FormField
            id="exp_description"
            label={t("description")}
            optional={tc("labels.optional")}
            error={e.description?.message}
          >
            <Textarea id="exp_description" rows={3} {...form.register("description")} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {tc("actions.save")}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => startEdit()}
          className="justify-self-start"
        >
          <PlusIcon /> {t("add")}
        </Button>
      )}
      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          {tc("actions.back")}
        </Button>
        <Button type="button" onClick={onNext} disabled={requireOne && rows.length === 0}>
          {tc("actions.continue")}
        </Button>
      </div>
    </div>
  );
}
