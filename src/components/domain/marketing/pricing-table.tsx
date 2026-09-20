import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRICING } from "@/content/pricing";
import { Link } from "@/i18n/navigation";
import { formatUsd } from "@/lib/utils";

/**
 * The four published products. Figures come from `src/content/pricing.ts`; the copy comes
 * from `marketing.pricing`. Nothing here is hardcoded.
 *
 * The `as "products.placement.name"` casts keep next-intl's typed keys while the key is
 * built from the product id. Every id in PRICING has the same message shape, so the cast
 * is safe and a missing key still shows up at render.
 */
export async function PricingTable({ locale }: { locale: string }) {
  const t = await getTranslations("marketing.pricing");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {PRICING.map((product) => {
        const amount = formatUsd(product.amountUsd, locale);
        const unit = t(`units.${product.unit}` as "units.oneTime");
        return (
          <article
            key={product.id}
            className="border-border flex flex-col rounded-[12px] border bg-white p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl">
                {t(`products.${product.id}.name` as "products.placement.name")}
              </h3>
              {product.provisional ? (
                <Badge variant="outline">{t("provisionalBadge")}</Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              {t(`products.${product.id}.summary` as "products.placement.summary")}
            </p>

            <p className="font-heading text-navy mt-6 text-3xl font-extrabold">
              {product.isFloor ? t("fromAmount", { amount, unit }) : `${amount} ${unit}`}
            </p>
            {product.depositUsd ? (
              <p className="text-muted-foreground mt-2 text-sm">
                {t("depositSplit", {
                  deposit: formatUsd(product.depositUsd, locale),
                  balance: formatUsd(product.amountUsd - product.depositUsd, locale),
                })}
              </p>
            ) : null}

            <ul className="mt-6 grow space-y-2 text-sm">
              {product.includes.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-green font-bold" aria-hidden>
                    &middot;
                  </span>
                  <span>
                    {t(
                      `products.${product.id}.includes.${item}` as "products.placement.includes.sourcing",
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <Button asChild variant="accent" className="mt-8 self-start">
              <Link href="/sign-up/company">{t("ctaStart")}</Link>
            </Button>
          </article>
        );
      })}
    </div>
  );
}

/**
 * Compact price list for pages that are not `/pricing`: the headline figure per product
 * and nothing else. A visitor should be able to read a price without contacting sales.
 */
export async function PricingSummary({ locale }: { locale: string }) {
  const t = await getTranslations("marketing.pricing");

  return (
    <dl className="divide-border border-border divide-y rounded-[12px] border bg-white">
      {PRICING.map((product) => {
        const amount = formatUsd(product.amountUsd, locale);
        const unit = t(`units.${product.unit}` as "units.oneTime");
        return (
          <div key={product.id} className="flex items-baseline justify-between gap-4 px-5 py-4">
            <dt className="text-sm font-medium">
              {t(`products.${product.id}.name` as "products.placement.name")}
            </dt>
            <dd className="text-navy text-right text-sm font-semibold tabular-nums">
              {product.isFloor ? t("fromAmount", { amount, unit }) : `${amount} ${unit}`}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
