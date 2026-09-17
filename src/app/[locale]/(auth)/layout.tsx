import { LanguageSwitch } from "@/components/shared/language-switch";
import { Logo } from "@/components/shared/logo";
import { pageLocale } from "@/i18n/server";

export default async function AuthLayout({ children, params }: LayoutProps<"/[locale]">) {
  await pageLocale(params);
  return (
    <div className="flex min-h-screen flex-col bg-mist">
      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <Logo height={26} />
        <LanguageSwitch />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
