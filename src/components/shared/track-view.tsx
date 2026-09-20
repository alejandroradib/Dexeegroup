"use client";

import { useEffect, useRef } from "react";

import { track, type AnalyticsEvent, type AnalyticsProps } from "@/lib/analytics/events";

/**
 * Fires one page-level event on mount. Renders nothing.
 *
 * The ref guard matters: React strict mode runs effects twice in development, and
 * PHASES-GTM 9.7 requires each event to fire once per action.
 */
export function TrackView({ event, props }: { event: AnalyticsEvent; props?: AnalyticsProps }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event, props);
  }, [event, props]);
  return null;
}
