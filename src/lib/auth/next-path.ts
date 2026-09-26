/**
 * The `next` value for a sign-in redirect: the requested path without its locale prefix, plus
 * the query string. The sign-in action prefixes the user's locale itself, so a value that still
 * carried one produced /en/en/... (audit I18).
 */
export function nextPathWithoutLocale(
  pathname: string,
  search: string,
  isLocale: (segment: string) => boolean,
): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] && isLocale(segments[0])) segments.shift();
  return `/${segments.join("/")}${search}`;
}
