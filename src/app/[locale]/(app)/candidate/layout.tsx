import { RoleShell } from "@/components/layout/role-shell";
import { pageLocale } from "@/i18n/server";

export default async function CandidateLayout({ children, params }: LayoutProps<"/[locale]/candidate">) {
  const locale = await pageLocale(params);
  return (
    <RoleShell area="candidate" locale={locale}>
      {children}
    </RoleShell>
  );
}
