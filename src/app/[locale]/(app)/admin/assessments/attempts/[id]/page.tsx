import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { pageLocale } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";

/** Placeholder until Phase 6c adds the validation UI (audio player, transcripts, scores). */
export default async function AdminAttemptPage({ params }: PageProps<"/[locale]/admin/assessments/attempts/[id]">) {
  await pageLocale(params);
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: attempt }, te] = await Promise.all([
    supabase.from("assessment_attempts").select("*, assessments (type, title), candidates (first_name, last_name)").eq("id", id).maybeSingle(),
    getTranslations("enums"),
  ]);
  if (!attempt) notFound();
  return (
    <>
      <PageHeader title={`${attempt.candidates?.first_name ?? ""} ${attempt.candidates?.last_name ?? ""}`} eyebrow={attempt.assessments ? te(`assessment_type.${attempt.assessments.type}`) : undefined} actions={<StatusChip kind="attempt" status={attempt.status} />} />
      <pre className="overflow-x-auto rounded-[12px] border border-border bg-white p-4 text-xs">{JSON.stringify({ ai_level: attempt.ai_level, final_level: attempt.final_level, ai_result: attempt.ai_result, report: attempt.report, integrity: attempt.integrity }, null, 2)}</pre>
    </>
  );
}
