import { RoleShell } from "@/components/layout/role-shell";
import { pageLocale } from "@/i18n/server";

export default async function CompanyLayout({
  children,
  params,
}: LayoutProps<"/[locale]/company">) {
  const locale = await pageLocale(params);
  return (
    <RoleShell area="company" locale={locale}>
      {children}
    </RoleShell>
  );
}
