import { getFormatter, getTranslations } from "next-intl/server";

import { DeactivateAdminButton, InviteAdminForm } from "@/components/domain/admin/team-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { listAdmins } from "@/server/services/admin";

export default async function AdminTeamPage({ params }: PageProps<"/[locale]/admin/team">) {
  await pageLocale(params);
  const [t, format, admins, user] = await Promise.all([getTranslations("admin.team"), getFormatter(), listAdmins(), getSessionUser()]);
  return (
    <>
      <PageHeader title={t("title")} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.email")}</TableHead>
              <TableHead>{t("columns.since")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium text-navy">{a.full_name}</TableCell>
                <TableCell>{a.email}</TableCell>
                <TableCell>{format.dateTime(new Date(a.created_at), "short")}</TableCell>
                <TableCell>{a.id !== user?.id ? <DeactivateAdminButton userId={a.id} /> : null}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <InviteAdminForm />
      </div>
    </>
  );
}
