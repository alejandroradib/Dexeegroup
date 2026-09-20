/**
 * The nine events PHASES-GTM 9.7 measures, and nothing else.
 *
 * Two rules the type system enforces:
 *  - only a name from `ANALYTICS_EVENTS` can be sent, so a typo is a build error rather
 *    than a metric that silently never appears;
 *  - a property value can only be a small enum, a count or a boolean. No free text, no
 *    email, no name, no id. A page URL is enough to identify a visitor when combined with
 *    anything personal, so nothing personal goes in.
 *
 * `track` is safe to call anywhere on the client. With analytics disabled, or before the
 * provider script loads, it does nothing.
 */

export const ANALYTICS_EVENTS = [
  "view_pricing",
  "use_calculator",
  "view_sample_report",
  "start_lead_form",
  "submit_lead",
  "start_candidate_signup",
  "complete_assessment",
  "view_job",
  "apply_job",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Values allowed on an event. Deliberately narrow: nothing here can identify a person. */
export type AnalyticsValue = string | number | boolean;

export type AnalyticsProps = Record<string, AnalyticsValue>;

/** Keys that must never be sent, whatever a caller passes. */
const FORBIDDEN_KEYS = new Set([
  "email",
  "name",
  "first_name",
  "last_name",
  "phone",
  "company",
  "candidate_id",
  "user_id",
  "id",
  "ip",
  "resume",
  "message",
]);

/** Drops anything personal and anything too long to be a category. */
export function sanitizeProps(props: AnalyticsProps | undefined): AnalyticsProps {
  if (!props) return {};
  const clean: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === "string") {
      // A category, not a sentence. Anything longer is free text and could carry anything.
      if (value.length === 0 || value.length > 40) continue;
      if (value.includes("@")) continue;
      clean[key] = value;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) clean[key] = value;
    if (typeof value === "boolean") clean[key] = value;
  }
  return clean;
}

type PlausibleFn = (event: string, options?: { props: AnalyticsProps }) => void;
type GtagFn = (command: "event", event: string, props?: AnalyticsProps) => void;

type AnalyticsWindow = Window & {
  plausible?: PlausibleFn;
  gtag?: GtagFn;
};

/**
 * Sends one event. Returns true when a provider took it, which is what the e2e test
 * asserts against; in production nothing depends on the return value.
 */
export function track(event: AnalyticsEvent, props?: AnalyticsProps): boolean {
  if (typeof window === "undefined") return false;
  const clean = sanitizeProps(props);
  const scope = window as AnalyticsWindow;
  try {
    if (typeof scope.plausible === "function") {
      scope.plausible(event, Object.keys(clean).length > 0 ? { props: clean } : undefined);
      return true;
    }
    if (typeof scope.gtag === "function") {
      scope.gtag("event", event, clean);
      return true;
    }
  } catch {
    // Analytics must never break a page. A dropped event is the correct failure.
  }
  return false;
}
