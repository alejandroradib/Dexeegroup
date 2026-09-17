
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { pageLocale } from "@/i18n/server";
import { getSessionUser, roleHome } from "@/lib/auth/session";

export default async function MarketingLayout({ children, params }: LayoutProps<"/[locale]">) {
  await pageLocale(params);
  const user = await getSessionUser();
  return (
    <>
      <MarketingHeader signedIn={Boolean(user)} dashboardHref={user?.role ? roleHome[user.role] : undefined} />
      <div className="flex flex-1 flex-col">{children}</div>
      <MarketingFooter />
    </>
  );
}
