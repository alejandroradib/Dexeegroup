import { RoleShell } from "@/components/layout/role-shell";
import { pageLocale } from "@/i18n/server";

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const locale = await pageLocale(params);
  return (
    <RoleShell area="admin" locale={locale}>
      {children}
    </RoleShell>
  );
}
