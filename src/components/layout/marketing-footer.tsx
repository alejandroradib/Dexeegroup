import { useTranslations } from "next-intl";

import { Logo } from "@/components/shared/logo";
import { Link } from "@/i18n/navigation";
import { SITE } from "@/lib/site";

export function MarketingFooter() {
  const t = useTranslations("common");
  const columns = [
    {
      title: t("footer.product"),
      links: [
        { href: "/for-companies", label: t("footer.companies") },
        { href: "/for-talent", label: t("footer.talent") },
        { href: "/jobs", label: t("footer.jobs") },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { href: "/about", label: t("footer.about") },
        { href: "/contact", label: t("footer.contact") },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { href: "/privacy", label: t("footer.privacy") },
        { href: "/terms", label: t("footer.terms") },
      ],
    },
  ] as const;

  return (
    <footer className="border-border bg-navy mt-auto border-t text-white">
      <div className="container-marketing grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo variant="white" height={28} />
          <p className="mt-4 max-w-xs text-sm text-white/75">{t("descriptor")}</p>
          <p className="font-heading text-green mt-6 text-lg font-bold">{t("tagline")}</p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold text-white">{column.title}</h3>
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/75 hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-marketing flex flex-col gap-2 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.rights")}</p>
          <p>
            <a href={`mailto:${SITE.email}`} className="hover:text-white">
              {SITE.email}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
