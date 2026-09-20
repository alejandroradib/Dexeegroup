import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** USD with no decimals, in the site's convention: "USD 3,500" in English, "USD 3.500" in Spanish. */
export function formatUsd(value: number, locale = "en"): string {
  const format = new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
    maximumFractionDigits: 0,
  });
  return `USD ${format.format(value)}`;
}

export function formatUsdMonth(value: number | null | undefined, locale = "en"): string | null {
  if (value === null || value === undefined) return null;
  return formatUsd(value, locale);
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function initials(first?: string | null, last?: string | null): string {
  return `${(first ?? "").charAt(0)}${(last ?? "").charAt(0)}`.toUpperCase() || "?";
}
