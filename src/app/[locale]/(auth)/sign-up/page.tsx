import { BriefcaseIcon, UserIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-up">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "auth.meta" });
  return { title: t("signUp"), robots: { index: false } };
}

export default async function SignUpChoosePage({
  params,
  searchParams,
}: PageProps<"/[locale]/sign-up">) {
  await pageLocale(params);
  const query = await searchParams;
  const next = typeof query.next === "string" ? { next: query.next } : undefined;
  const t = await getTranslations("auth.choose");
  const options = [
    {
      href: "/sign-up/company",
      icon: BriefcaseIcon,
      title: t("companyTitle"),
      body: t("companyBody"),
      cta: t("companyCta"),
    },
    {
      href: "/sign-up/candidate",
      icon: UserIcon,
      title: t("candidateTitle"),
      body: t("candidateBody"),
      cta: t("candidateCta"),
    },
  ] as const;
  return (
    <div className="border-border rounded-[16px] border bg-white p-6 sm:p-8">
      <h1 className="text-2xl">{t("title")}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{t("subtitle")}</p>
      <div className="mt-6 grid gap-4">
        {options.map((option) => (
          <div
            key={option.href}
            className="border-border flex flex-col gap-3 rounded-[12px] border p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span className="bg-mint text-navy flex size-10 shrink-0 items-center justify-center rounded-[10px]">
                <option.icon className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-base">{option.title}</h2>
                <p className="text-muted-foreground mt-1 text-sm">{option.body}</p>
              </div>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link href={{ pathname: option.href, query: next }}>{option.cta}</Link>
            </Button>
          </div>
        ))}
      </div>
      <p className="border-border text-muted-foreground mt-6 border-t pt-4 text-sm">
        {t("haveAccount")}{" "}
        <Link href="/sign-in" className="text-link font-semibold hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
