import { ClipboardCheckIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { listValidationQueue } from "@/server/services/admin";

export default async function AdminAssessmentsPage({ params }: PageProps<"/[locale]/admin/assessments">) {
  await pageLocale(params);
  const [t, te, format, queue] = await Promise.all([getTranslations("admin.assessments"), getTranslations("enums"), getFormatter(), listValidationQueue()]);
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      {queue.length === 0 ? <EmptyState icon={ClipboardCheckIcon} title={t("empty")} description={t("emptyBody")} /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.candidate")}</TableHead>
              <TableHead>{t("columns.assessment")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.aiLevel")}</TableHead>
              <TableHead>{t("columns.submitted")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.map((a) => (
              <TableRow key={a.id}>
                <TableCell><Link href={`/admin/candidates/${a.candidate_id}`} className="font-medium text-navy hover:underline">{a.candidates?.first_name} {a.candidates?.last_name}</Link></TableCell>
                <TableCell>{a.assessments ? te(`assessment_type.${a.assessments.type}`) : ""}</TableCell>
                <TableCell><StatusChip kind="attempt" status={a.status} /></TableCell>
                <TableCell>{a.ai_level ?? "—"}</TableCell>
                <TableCell>{a.submitted_at ? format.dateTime(new Date(a.submitted_at), "short") : "—"}</TableCell>
                <TableCell><Button asChild size="sm" variant="outline"><Link href={`/admin/assessments/attempts/${a.id}`}>{t("open")}</Link></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
