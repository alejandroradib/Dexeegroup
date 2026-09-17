"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SparklesIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";

import { JobDetail } from "@/components/domain/jobs/job-detail";
import { FormField } from "@/components/shared/form-field";
import { NativeSelect } from "@/components/shared/native-select";
import { Stepper } from "@/components/shared/stepper";
import { TagInput } from "@/components/shared/tag-input";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import {
  jobCompensationStepSchema,
  jobFullSchema,
  jobRoleStepSchema,
  type JobCompensationStepInput,
  type JobDraftPatch,
  type JobRoleStepInput,
} from "@/lib/validation/company";
import {
  CEFR_LEVELS,
  CONTRACT_TYPES,
  EMPLOYMENT_TYPES,
  ROLE_FAMILIES,
  SENIORITIES,
  TIMEZONE_OVERLAPS,
  WORK_MODES,
} from "@/lib/validation/enums";
import { draftJobWithAi, patchJobDraft, submitJob } from "@/server/actions/company";
import type { Company } from "@/server/services/companies";
import type { Job } from "@/server/services/jobs";
import type { PublicJob } from "@/server/services/public-jobs";

type Props = { job: Job; company: Company; skillSuggestions: string[] };

function useAutosave(jobId: string) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<JobDraftPatch>({});

  const flush = useCallback(async () => {
    const patch = pendingPatch.current;
    pendingPatch.current = {};
    if (Object.keys(patch).length === 0) return;
    setState("saving");
    const result = await patchJobDraft(jobId, patch);
    if (result.ok) {
      setState("saved");
      setSavedAt(new Date());
    } else setState("error");
  }, [jobId]);

  const queue = useCallback(
    (patch: JobDraftPatch) => {
      pendingPatch.current = { ...pendingPatch.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 800);
    },
    [flush],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return { queue, flush, state, savedAt };
}

export function JobWizard({ job, company, skillSuggestions }: Props) {
  const t = useTranslations("company.wizard");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const autosave = useAutosave(job.id);

  const role = useForm<JobRoleStepInput>({
    resolver: zodResolver(jobRoleStepSchema),
    mode: "onBlur",
    defaultValues: {
      title: job.title === "Untitled role" ? "" : job.title,
      role_family: job.role_family ?? undefined,
      seniority: job.seniority ?? undefined,
      description: job.description ?? "",
      responsibilities: job.responsibilities ?? "",
      requirements: job.requirements ?? "",
      skills: job.skills ?? [],
      english_level_required: job.english_level_required ?? undefined,
    },
  });
  const comp = useForm<JobCompensationStepInput>({
    resolver: zodResolver(jobCompensationStepSchema),
    mode: "onBlur",
    defaultValues: {
      salary_min_usd: job.salary_min_usd ?? undefined,
      salary_max_usd: job.salary_max_usd ?? undefined,
      show_salary: job.show_salary,
      contract_type: job.contract_type ?? undefined,
      employment_type: job.employment_type ?? undefined,
      hours_per_week: job.hours_per_week ?? 40,
      timezone_overlap:
        (job.timezone_overlap as JobCompensationStepInput["timezone_overlap"]) ?? undefined,
      work_mode: job.work_mode,
      start_date: job.start_date ?? undefined,
      confidential_company: job.confidential_company,
    },
  });

  // Autosave every change of either form as a partial patch.
  useEffect(() => {
    const sub = role.watch((values, { name }) => {
      if (!name) return;
      const value = values[name as keyof JobRoleStepInput];
      if (name === "title" && (!value || String(value).trim() === "")) return;
      autosave.queue({ [name]: value } as JobDraftPatch);
    });
    return () => sub.unsubscribe();
  }, [role, autosave]);
  useEffect(() => {
    const sub = comp.watch((values, { name }) => {
      if (!name) return;
      const value = values[name as keyof JobCompensationStepInput];
      if (value === undefined || (typeof value === "number" && Number.isNaN(value))) return;
      autosave.queue({ [name]: value } as JobDraftPatch);
    });
    return () => sub.unsubscribe();
  }, [comp, autosave]);

  const steps = [
    { id: "role", label: t("steps.role") },
    { id: "compensation", label: t("steps.compensation") },
    { id: "review", label: t("steps.review") },
  ];

  const editable = ["draft", "changes_requested", "published", "paused", "pending_review"].includes(
    job.status,
  );
  const canSubmit = job.status === "draft" || job.status === "changes_requested";

  async function goTo(next: number) {
    await autosave.flush();
    setStep(next);
  }

  const preview: PublicJob = {
    id: job.id,
    title: role.getValues("title") || t("newTitle"),
    slug: job.slug,
    role_family: role.getValues("role_family") ?? null,
    seniority: role.getValues("seniority") ?? null,
    contract_type: comp.getValues("contract_type") ?? null,
    employment_type: comp.getValues("employment_type") ?? null,
    work_mode: comp.getValues("work_mode") ?? "remote",
    english_level_required: role.getValues("english_level_required") ?? null,
    skills: role.getValues("skills"),
    description: role.getValues("description") || null,
    responsibilities: role.getValues("responsibilities") || null,
    requirements: role.getValues("requirements") || null,
    hours_per_week: comp.getValues("hours_per_week") ?? null,
    timezone_overlap: comp.getValues("timezone_overlap") ?? null,
    start_date: comp.getValues("start_date") ?? null,
    salary_min_usd: comp.getValues("show_salary")
      ? (comp.getValues("salary_min_usd") ?? null)
      : null,
    salary_max_usd: comp.getValues("show_salary")
      ? (comp.getValues("salary_max_usd") ?? null)
      : null,
    show_salary: comp.getValues("show_salary"),
    confidential_company: comp.getValues("confidential_company"),
    company_name: comp.getValues("confidential_company") ? "Confidential" : company.name,
    company_logo_path: comp.getValues("confidential_company") ? null : company.logo_path,
    company_sector: company.sector,
    company_size: company.size,
    published_at: job.published_at ?? new Date().toISOString(),
    closes_at: job.closes_at,
  };
  const complete = jobFullSchema.safeParse({ ...role.getValues(), ...comp.getValues() }).success;

  function submit() {
    setSubmitError(null);
    start(async () => {
      await autosave.flush();
      const result = await submitJob(job.id);
      if (result.ok) {
        toast({
          title: result.data.status === "published" ? t("review.published") : t("review.queued"),
          variant: "success",
        });
        router.push("/company/jobs");
        router.refresh();
      } else setSubmitError(result.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div>
        {job.status === "changes_requested" && job.review_message ? (
          <Alert variant="warning" className="mb-6">
            <p className="font-semibold">{t("changesRequested")}</p>
            <p className="mt-1 whitespace-pre-line">{job.review_message}</p>
          </Alert>
        ) : null}
        <Stepper steps={steps} current={step} onSelect={(i) => void goTo(i)} className="mb-6" />
        {step === 0 ? (
          <RoleStep
            form={role}
            suggestions={skillSuggestions}
            onNext={() => role.handleSubmit(() => void goTo(1))()}
            disabled={!editable}
          />
        ) : null}
        {step === 1 ? (
          <CompensationStep
            form={comp}
            onBack={() => void goTo(0)}
            onNext={() => comp.handleSubmit(() => void goTo(2))()}
            disabled={!editable}
          />
        ) : null}
        {step === 2 ? (
          <div className="grid gap-6">
            <div className="border-border rounded-[12px] border bg-white p-6">
              <h2 className="text-lg">{t("review.title")}</h2>
              <p className="text-muted-foreground text-sm">{t("review.subtitle")}</p>
              {!complete ? (
                <Alert variant="warning" className="mt-4">
                  {t("review.incomplete")}
                </Alert>
              ) : null}
              <div className="border-border mt-6 rounded-[12px] border border-dashed p-4 sm:p-6">
                <JobDetail
                  job={preview}
                  applyAction={
                    <Button variant="accent" className="w-full" disabled>
                      {tc("actions.apply")}
                    </Button>
                  }
                />
              </div>
            </div>
            {submitError ? (
              <Alert variant="danger">
                {submitError === "companyNotVerified"
                  ? t("review.companyNotVerified")
                  : submitError === "validation"
                    ? t("review.incomplete")
                    : tc("errors.generic")}
              </Alert>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => void goTo(1)}>
                {tc("actions.back")}
              </Button>
              <div className="flex flex-wrap items-center gap-3">
                {company.status !== "verified" ? (
                  <p className="text-muted-foreground max-w-sm text-xs">
                    {t("review.submitPendingHint")}
                  </p>
                ) : null}
                <Button
                  variant="outline"
                  onClick={() =>
                    start(async () => {
                      await autosave.flush();
                      router.push("/company/jobs");
                    })
                  }
                >
                  {tc("actions.saveDraft")}
                </Button>
                {canSubmit ? (
                  <Button variant="accent" disabled={pending || !complete} onClick={submit}>
                    {company.status === "verified"
                      ? t("review.submitVerified")
                      : t("review.submitPending")}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <aside className="text-muted-foreground text-sm lg:sticky lg:top-24 lg:self-start">
        <p aria-live="polite">
          {autosave.state === "saving"
            ? t("saving")
            : autosave.savedAt
              ? t("autosaved", {
                  time: format.dateTime(autosave.savedAt, { hour: "2-digit", minute: "2-digit" }),
                })
              : null}
          {autosave.state === "error" ? (
            <span className="text-danger"> {tc("errors.generic")}</span>
          ) : null}
        </p>
      </aside>
    </div>
  );
}

function RoleStep({
  form,
  suggestions,
  onNext,
  disabled,
}: {
  form: UseFormReturn<JobRoleStepInput>;
  suggestions: string[];
  onNext: () => void;
  disabled: boolean;
}) {
  const t = useTranslations("company.wizard.role");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const { toast } = useToast();
  const [keywords, setKeywords] = useState<string[]>([]);
  const [drafting, startDraft] = useTransition();
  const errors = form.formState.errors;

  function draft() {
    const title = form.getValues("title");
    if (!title || title.trim().length < 3) {
      form.setError("title", { message: "tooShort" });
      return;
    }
    startDraft(async () => {
      const result = await draftJobWithAi({
        title,
        seniority: form.getValues("seniority"),
        role_family: form.getValues("role_family"),
        keywords,
      });
      if (result.ok) {
        form.setValue("description", result.data.description, {
          shouldDirty: true,
          shouldValidate: true,
        });
        form.setValue("responsibilities", result.data.responsibilities, {
          shouldDirty: true,
          shouldValidate: true,
        });
        form.setValue("requirements", result.data.requirements, {
          shouldDirty: true,
          shouldValidate: true,
        });
        toast({ title: t("aiDone"), variant: "success" });
      } else {
        toast({
          title: result.error === "aiUnavailable" ? t("aiUnavailable") : t("aiFailed"),
          variant: "danger",
        });
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
      className="border-border grid gap-5 rounded-[12px] border bg-white p-6"
      noValidate
    >
      <fieldset disabled={disabled} className="grid gap-5">
        <FormField id="title" label={t("title")} error={errors.title?.message}>
          <Input
            id="title"
            placeholder={t("titlePlaceholder")}
            aria-invalid={Boolean(errors.title)}
            {...form.register("title")}
          />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-3">
          <FormField id="role_family" label={t("roleFamily")} error={errors.role_family?.message}>
            <NativeSelect
              id="role_family"
              placeholder={tc("labels.none")}
              aria-invalid={Boolean(errors.role_family)}
              options={ROLE_FAMILIES.map((v) => ({ value: v, label: te(`role_family.${v}`) }))}
              {...form.register("role_family", { setValueAs: (v) => v || undefined })}
            />
          </FormField>
          <FormField id="seniority" label={t("seniority")} error={errors.seniority?.message}>
            <NativeSelect
              id="seniority"
              placeholder={tc("labels.none")}
              aria-invalid={Boolean(errors.seniority)}
              options={SENIORITIES.map((v) => ({ value: v, label: te(`seniority.${v}`) }))}
              {...form.register("seniority", { setValueAs: (v) => v || undefined })}
            />
          </FormField>
          <FormField
            id="english_level_required"
            label={t("englishLevel")}
            error={errors.english_level_required?.message}
          >
            <NativeSelect
              id="english_level_required"
              placeholder={tc("labels.none")}
              aria-invalid={Boolean(errors.english_level_required)}
              options={CEFR_LEVELS.map((v) => ({ value: v, label: te(`cefr_level.${v}`) }))}
              {...form.register("english_level_required", { setValueAs: (v) => v || undefined })}
            />
          </FormField>
        </div>
        <div className="bg-mist rounded-[12px] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="ai_keywords">{t("aiKeywords")}</Label>
              <div className="mt-1.5">
                <TagInput
                  id="ai_keywords"
                  value={keywords}
                  onChange={setKeywords}
                  max={5}
                  removeLabel={tc("actions.remove")}
                />
              </div>
            </div>
            <Button type="button" variant="default" onClick={draft} disabled={drafting}>
              <SparklesIcon /> {drafting ? t("drafting") : t("draftWithAi")}
            </Button>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">{t("aiHint")}</p>
        </div>
        <FormField id="description" label={t("description")} error={errors.description?.message}>
          <Textarea
            id="description"
            rows={5}
            aria-invalid={Boolean(errors.description)}
            {...form.register("description")}
          />
        </FormField>
        <FormField
          id="responsibilities"
          label={t("responsibilities")}
          hint={t("listHint")}
          error={errors.responsibilities?.message}
        >
          <Textarea
            id="responsibilities"
            rows={5}
            aria-invalid={Boolean(errors.responsibilities)}
            {...form.register("responsibilities")}
          />
        </FormField>
        <FormField
          id="requirements"
          label={t("requirements")}
          hint={t("listHint")}
          error={errors.requirements?.message}
        >
          <Textarea
            id="requirements"
            rows={5}
            aria-invalid={Boolean(errors.requirements)}
            {...form.register("requirements")}
          />
        </FormField>
        <Controller
          control={form.control}
          name="skills"
          render={({ field }) => (
            <FormField
              id="skills"
              label={t("skills")}
              hint={t("skillsHint")}
              error={errors.skills?.message}
            >
              <TagInput
                id="skills"
                value={field.value}
                onChange={field.onChange}
                suggestions={suggestions}
                removeLabel={tc("actions.remove")}
                aria-invalid={Boolean(errors.skills)}
              />
            </FormField>
          )}
        />
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit">{tc("actions.continue")}</Button>
      </div>
    </form>
  );
}

function CompensationStep({
  form,
  onBack,
  onNext,
  disabled,
}: {
  form: UseFormReturn<JobCompensationStepInput>;
  onBack: () => void;
  onNext: () => void;
  disabled: boolean;
}) {
  const t = useTranslations("company.wizard.compensation");
  const tc = useTranslations("common");
  const te = useTranslations("enums");
  const errors = form.formState.errors;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
      className="border-border grid gap-5 rounded-[12px] border bg-white p-6"
      noValidate
    >
      <fieldset disabled={disabled} className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="salary_min_usd"
            label={t("salaryMin")}
            error={errors.salary_min_usd?.message}
          >
            <Input
              id="salary_min_usd"
              type="number"
              min={0}
              step={50}
              inputMode="numeric"
              aria-invalid={Boolean(errors.salary_min_usd)}
              {...form.register("salary_min_usd", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            id="salary_max_usd"
            label={t("salaryMax")}
            error={errors.salary_max_usd?.message}
          >
            <Input
              id="salary_max_usd"
              type="number"
              min={0}
              step={50}
              inputMode="numeric"
              aria-invalid={Boolean(errors.salary_max_usd)}
              {...form.register("salary_max_usd", { valueAsNumber: true })}
            />
          </FormField>
        </div>
        <Controller
          control={form.control}
          name="show_salary"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch id="show_salary" checked={field.value} onCheckedChange={field.onChange} />
              <Label htmlFor="show_salary" className="font-normal">
                {t("showSalary")}
              </Label>
            </div>
          )}
        />
        <Controller
          control={form.control}
          name="contract_type"
          render={({ field }) => (
            <fieldset>
              <legend className="text-navy mb-2 text-sm font-medium">{t("contractType")}</legend>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="sm:grid-cols-2"
              >
                {CONTRACT_TYPES.map((ct) => (
                  <label
                    key={ct}
                    htmlFor={`ct-${ct}`}
                    className="border-border has-[[data-state=checked]]:border-navy has-[[data-state=checked]]:bg-mist flex cursor-pointer items-start gap-3 rounded-[12px] border p-4"
                  >
                    <RadioGroupItem value={ct} id={`ct-${ct}`} className="mt-0.5" />
                    <span>
                      <span className="text-navy block text-sm font-semibold">
                        {te(`contract_type.${ct}`)}
                      </span>
                      <span className="text-muted-foreground mt-1 block text-xs">
                        {te(`contract_type_description.${ct}`)}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
              {errors.contract_type ? (
                <p className="text-destructive mt-1 text-xs" role="alert">
                  {tc("labels.required")}
                </p>
              ) : null}
            </fieldset>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-3">
          <FormField
            id="employment_type"
            label={t("employmentType")}
            error={errors.employment_type?.message}
          >
            <NativeSelect
              id="employment_type"
              placeholder={tc("labels.none")}
              aria-invalid={Boolean(errors.employment_type)}
              options={EMPLOYMENT_TYPES.map((v) => ({
                value: v,
                label: te(`employment_type.${v}`),
              }))}
              {...form.register("employment_type", { setValueAs: (v) => v || undefined })}
            />
          </FormField>
          <FormField
            id="hours_per_week"
            label={t("hoursPerWeek")}
            error={errors.hours_per_week?.message}
          >
            <Input
              id="hours_per_week"
              type="number"
              min={1}
              max={60}
              inputMode="numeric"
              {...form.register("hours_per_week", { valueAsNumber: true })}
            />
          </FormField>
          <FormField id="work_mode" label={t("workMode")} error={errors.work_mode?.message}>
            <NativeSelect
              id="work_mode"
              options={WORK_MODES.map((v) => ({ value: v, label: te(`work_mode.${v}`) }))}
              {...form.register("work_mode")}
            />
          </FormField>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="timezone_overlap"
            label={t("overlap")}
            error={errors.timezone_overlap?.message}
          >
            <NativeSelect
              id="timezone_overlap"
              placeholder={tc("labels.none")}
              aria-invalid={Boolean(errors.timezone_overlap)}
              options={TIMEZONE_OVERLAPS.map((v) => ({
                value: v,
                label: te(`timezone_overlap.${v}`),
              }))}
              {...form.register("timezone_overlap", { setValueAs: (v) => v || undefined })}
            />
          </FormField>
          <FormField
            id="start_date"
            label={t("startDate")}
            optional={tc("labels.optional")}
            error={errors.start_date?.message}
          >
            <Input
              id="start_date"
              type="date"
              {...form.register("start_date", { setValueAs: (v) => v || undefined })}
            />
          </FormField>
        </div>
        <Controller
          control={form.control}
          name="confidential_company"
          render={({ field }) => (
            <div className="flex items-start gap-3">
              <Switch
                id="confidential_company"
                checked={field.value}
                onCheckedChange={field.onChange}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="confidential_company" className="font-normal">
                  {t("confidential")}
                </Label>
                <p className="text-muted-foreground text-xs">{t("confidentialHint")}</p>
              </div>
            </div>
          )}
        />
      </fieldset>
      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          {tc("actions.back")}
        </Button>
        <Button type="submit">{tc("actions.continue")}</Button>
      </div>
    </form>
  );
}
