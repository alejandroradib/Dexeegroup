import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { JobCard } from "@/components/domain/jobs/job-card";
import { JobDetail } from "@/components/domain/jobs/job-detail";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { publicEnv } from "@/lib/env";
import { buildJobPostingJsonLd } from "@/lib/seo/job-posting";
import { getPublicJobBySlug, listSimilarPublicJobs } from "@/server/services/public-jobs";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/jobs/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = await getPublicJobBySlug(slug);
  if (!result.ok || !result.data) return {};
  const job = result.data;
  const description = (job.description ?? "").slice(0, 160);
  return {
    title: job.title ?? undefined,
    description,
    alternates: {
      canonical: `/${locale}/jobs/${slug}`,
      languages: { en: `/en/jobs/${slug}`, es: `/es/jobs/${slug}` },
    },
    openGraph: { title: job.title ?? undefined, description },
  };
}

export default async function JobPage({ params }: PageProps<"/[locale]/jobs/[slug]">) {
  const locale = await pageLocale(params);
  const { slug } = await params;
  const result = await getPublicJobBySlug(slug);
  if (!result.ok || !result.data) notFound();
  const job = result.data;
  const t = await getTranslations("marketing.jobs");
  const [similar, user] = await Promise.all([listSimilarPublicJobs(job), getSessionUser()]);
  const env = publicEnv();
  const logoUrl = job.company_logo_path
    ? `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${job.company_logo_path}`
    : null;
  const jsonLd = buildJobPostingJsonLd(job, {
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    locale,
    publicLogoUrl: logoUrl,
  });

  const applyHref =
    user?.role === "candidate"
      ? `/candidate/jobs/${slug}`
      : ({ pathname: "/sign-up/candidate", query: { next: `/candidate/jobs/${slug}` } } as const);

  return (
    <div className="container-marketing py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Button asChild variant="link" className="mb-6 px-0">
        <Link href="/jobs">
          <ArrowLeftIcon /> {t("backToJobs")}
        </Link>
      </Button>
      <JobDetail
        job={job}
        applyAction={
          <Button asChild variant="accent" className="w-full" size="lg">
            <Link href={applyHref}>
              {user?.role === "candidate" ? t("applyCta") : t("applySignUp")}
            </Link>
          </Button>
        }
      />
      {similar.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-2xl">{t("similar")}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {similar.map((s) => (
              <JobCard key={s.id} job={s} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
