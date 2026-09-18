import { UsersIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { ExportCandidatesButton } from "@/components/domain/admin/candidates-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { CefrBadge } from "@/components/shared/cefr-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterField, filterInputClass } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { pageLocale } from "@/i18n/server";
import { PAGE_SIZE, pageRange, parsePage, totalPages } from "@/lib/pagination";
import { AVAILABILITIES, CEFR_LEVELS, COUNTRIES, ROLE_FAMILIES } from "@/lib/validation/enums";
import { listAdminCandidates, type CandidateFilter } from "@/server/services/admin";

function pick<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
): T | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

export default async function AdminCandidatesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/candidates">) {
  await pageLocale(params);
  const query = await searchParams;
  const [t, te, tf, tco, format] = await Promise.all([
    getTranslations("admin.candidates"),
    getTranslations("enums"),
    getTranslations("marketing.jobs.filters"),
    getTranslations("enums.country"),
    getFormatter(),
  ]);
  const page = parsePage(query.page);
  const filter: CandidateFilter = {
    country: pick(query.country, COUNTRIES),
    q: typeof query.q === "string" ? query.q : undefined,
    role_family: pick(query.role_family, ROLE_FAMILIES),
    level: pick(query.level, CEFR_LEVELS),
    availability: pick(query.availability, AVAILABILITIES),
    visibility: pick(query.visibility, ["visible_to_companies", "dexee_only"] as const),
    min_completeness:
      typeof query.min_completeness === "string" && query.min_completeness
        ? Number(query.min_completeness)
        : undefined,
    tag: typeof query.tag === "string" && query.tag ? query.tag : undefined,
  };
  const { rows, total } = await listAdminCandidates(filter, pageRange(page));
  const hrefFor = (p: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(filter))
      if (v !== undefined && v !== "") s.set(k, String(v));
    if (p > 1) s.set("page", String(p));
    return `/admin/candidates${s.size ? `?${s}` : ""}`;
  };
  return (
    <>
      <PageHeader
        title={t("title")}
        actions={<ExportCandidatesButton ids={rows.map((r) => r.id)} />}
      />
      <FilterBar>
        <FilterField label={t("search")}>
          <input name="q" defaultValue={filter.q ?? ""} className={filterInputClass} />
        </FilterField>
        <FilterField label={t("country")}>
          <select name="country" defaultValue={filter.country ?? ""} className={filterInputClass}><option value="">{tf("any")}</option>{COUNTRIES.map((v) => <option key={v} value={v}>{tco(v)}</option>)}</select>
        </FilterField>
        <FilterField label={t("roleFamily")}>
          <select
            name="role_family"
            defaultValue={filter.role_family ?? ""}
            className={filterInputClass}
          >
            <option value="">{tf("any")}</option>
            {ROLE_FAMILIES.map((v) => (
              <option key={v} value={v}>
                {te(`role_family.${v}`)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t("level")}>
          <select name="level" defaultValue={filter.level ?? ""} className={filterInputClass}>
            <option value="">{tf("any")}</option>
            {CEFR_LEVELS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t("availability")}>
          <select
            name="availability"
            defaultValue={filter.availability ?? ""}
            className={filterInputClass}
          >
            <option value="">{tf("any")}</option>
            {AVAILABILITIES.map((v) => (
              <option key={v} value={v}>
                {te(`availability.${v}`)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t("visibility")}>
          <select
            name="visibility"
            defaultValue={filter.visibility ?? ""}
            className={filterInputClass}
          >
            <option value="">{tf("any")}</option>
            <option value="visible_to_companies">
              {te("candidate_visibility.visible_to_companies")}
            </option>
            <option value="dexee_only">{te("candidate_visibility.dexee_only")}</option>
          </select>
        </FilterField>
        <FilterField label={t("minCompleteness")}>
          <input
            name="min_completeness"
            type="number"
            min={0}
            max={100}
            step={10}
            defaultValue={filter.min_completeness ?? ""}
            className={filterInputClass}
          />
        </FilterField>
        <FilterField label={t("tag")}>
          <input name="tag" defaultValue={filter.tag ?? ""} className={filterInputClass} />
        </FilterField>
      </FilterBar>
      {rows.length === 0 ? (
        <EmptyState icon={UsersIcon} title={t("empty")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.roleFamily")}</TableHead>
              <TableHead>{t("columns.english")}</TableHead>
              <TableHead>{t("columns.completeness")}</TableHead>
              <TableHead>{t("columns.availability")}</TableHead>
              <TableHead>{t("columns.tags")}</TableHead>
              <TableHead>{t("columns.updated")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link
                    href={`/admin/candidates/${c.id}`}
                    className="text-navy font-medium hover:underline"
                  >
                    {c.first_name} {c.last_name}
                  </Link>
                  <p className="text-muted-foreground line-clamp-1 text-xs">
                    {c.headline} · {c.city}
                  </p>
                </TableCell>
                <TableCell>{c.role_family ? te(`role_family.${c.role_family}`) : "—"}</TableCell>
                <TableCell>
                  <CefrBadge
                    verified={c.english_verified_level}
                    written={c.english_written_level}
                    self={c.english_self_level}
                  />
                </TableCell>
                <TableCell>{c.profile_completeness}%</TableCell>
                <TableCell>{c.availability ? te(`availability.${c.availability}`) : "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {c.candidate_tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{format.dateTime(new Date(c.updated_at), "short")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination page={page} total={totalPages(total, PAGE_SIZE)} hrefFor={hrefFor} />
    </>
  );
}
