/** Mirrors public.slugify + job slug generation in supabase/migrations. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function jobSlug(title: string, id: string): string {
  return `${slugify(title)}-${id.replace(/-/g, "").slice(0, 6)}`;
}
