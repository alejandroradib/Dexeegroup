import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";

import { getSessionUser } from "@/lib/auth/session";
import { AssessmentReportPdf } from "@/lib/pdf/assessment-report";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Server-rendered PDF of a validated result, for the owner or an admin. */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/api/assessments/[attemptId]/pdf">,
) {
  const { attemptId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from("assessment_attempts")
    .select("*, assessments (type, title), candidates (first_name, last_name)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt || !attempt.assessments)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user.role !== "admin" && attempt.candidate_id !== user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (attempt.status !== "validated")
    return NextResponse.json({ error: "not_ready" }, { status: 409 });

  const locale = user.profile?.locale ?? "en";
  const t = await getTranslations({ locale, namespace: "assessments" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const type = attempt.assessments.type;
  const labels = {
    title: t(`intro.${type}.title`),
    candidate: t("admin.candidate"),
    date: tc("labels.updated"),
    level: t("result.level"),
    mcq: t("result.mcq"),
    writing: t("result.writing"),
    feedback: t("result.feedback"),
    factors: t("result.workstyle.factors"),
    sjt: t("result.workstyle.sjt"),
    strengths: t("result.workstyle.strengths"),
    disclaimer: tc("consentNotice"),
    verified: tc("labels.verifiedByDexee"),
  };
  const { assessments: _a, candidates, ...row } = attempt;
  const candidateName = candidates ? `${candidates.first_name} ${candidates.last_name}` : "";
  const buffer = await renderToBuffer(
    AssessmentReportPdf({ attempt: row, type, candidateName, locale, labels }),
  );
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="dexee-${type}-${attemptId.slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
