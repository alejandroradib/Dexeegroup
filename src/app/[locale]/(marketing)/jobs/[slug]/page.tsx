import { ArrowLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { JobCard } from "@/components/domain/jobs/job-card";
import { JobDetail } from "@/components/domain/jobs/job-detail";
import { TrackView } from "@/components/shared/track-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { publicEnv } from "@/lib/env";
import { buildAlternates } from "@/lib/seo/alternates";
import { buildJobPostingJsonLd } from "@/lib/seo/job-posting";
import {
  getClosedPublicJobBySlug,
  getPublicJobBySlug,
  listOpenJobsInFamily,
  listSimilarPublicJobs,
} from "@/server/services/public-jobs";
import type { ClosedPublicJob, PublicJob } from "@/server/services/public-jobs";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/jobs/[slug]">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const { slug } = await params;
  const result = await getPublicJobBySlug(slug);
  if (!result.ok || !result.data) {
    // A closed vacancy keeps a page but leaves the index: the role no longer exists.
    const closed = await getClosedPublicJobBySlug(slug);
    if (!closed) return {};
    const t = await getTranslations({ locale, namespace: "marketing.jobs.closed" });
    return {
      title: t("metaTitle", { title: closed.title ?? "" }),
      robots: { index: false, follow: true },
      alternates: buildAlternates(locale, `/jobs/${slug}`),
    };
  }
  const job = result.data;
  const description = (job.description ?? "").slice(0, 160);
  return {
    title: job.title ?? undefined,
    description,
    alternates: buildAlternates(locale, `/jobs/${slug}`),
    openGraph: { title: job.title ?? undefined, description },
  };
}

export default async function JobPage({ params }: PageProps<"/[locale]/jobs/[slug]">) {
  const locale = await pageLocale(params);
  const { slug } = await params;
  const result = await getPublicJobBySlug(slug);
  const t = await getTranslations("marketing.jobs");
  if (!result.ok || !result.data) {
    const closed = await getClosedPublicJobBySlug(slug);
    if (!closed) notFound();
    const open = await listOpenJobsInFamily(closed.role_family, 3);
    return <ClosedJobNotice job={closed} open={open} />;
  }
  const job = result.data;
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
      <TrackView event="view_job" props={{ role_family: job.role_family ?? "unknown" }} />
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

/**
 * A vacancy that closed. No JobPosting markup, `noindex` in the metadata above, and the
 * open roles in the same family so the visit is not wasted (PHASES-GTM 9.5).
 */
async function ClosedJobNotice({ job, open }: { job: ClosedPublicJob; open: PublicJob[] }) {
  const t = await getTranslations("marketing.jobs");
  const tc = await getTranslations("marketing.jobs.closed");
  return (
    <div className="container-marketing py-12">
      <Button asChild variant="link" className="mb-6 px-0">
        <Link href="/jobs">
          <ArrowLeftIcon /> {t("backToJobs")}
        </Link>
      </Button>
      <div className="border-border rounded-[16px] border bg-white p-8 sm:p-12">
        <Badge variant="outline">{tc("badge")}</Badge>
        <h1 className="mt-4 text-3xl sm:text-4xl">{job.title}</h1>
        <p className="text-muted-foreground mt-3">
          {tc("body", { company: job.company_name ?? "" })}
        </p>
        <Button asChild variant="accent" className="mt-8">
          <Link href="/jobs">{tc("browseCta")}</Link>
        </Button>
      </div>
      {open.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-2xl">{tc("openInFamily")}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {open.map((item) => (
              <JobCard key={item.id} job={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
