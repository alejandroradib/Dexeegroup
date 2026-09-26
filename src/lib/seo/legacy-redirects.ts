/**
 * URLs of the previous Squarespace site that search engines still hold (Fase J, 0.5). Each one
 * moves permanently to its Spanish counterpart, the language the old site was written in.
 * Kept free of imports so next.config.ts can load it.
 */
export const LEGACY_REDIRECTS: ReadonlyArray<{ source: string; destination: string }> = [
  { source: "/index.html", destination: "/es" },
  { source: "/quienessomos.html", destination: "/es/about" },
  { source: "/servicios-backoffice.html", destination: "/es/for-companies" },
  { source: "/outsourcing-talento.html", destination: "/es/for-companies" },
  { source: "/busqueda-directa-talento.html", destination: "/es/pricing" },
  { source: "/garantias.html", destination: "/es/guarantee" },
  { source: "/contacto.html", destination: "/es/contact" },
  { source: "/privacidad.html", destination: "/es/privacy" },
  { source: "/terminos.html", destination: "/es/terms" },
];

/** 301 rather than Next's default 308 for `permanent: true`, as the work order asks. */
export function legacyRedirects() {
  return LEGACY_REDIRECTS.map((entry) => ({ ...entry, statusCode: 301 as const }));
}
