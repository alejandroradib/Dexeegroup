import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsdMonth(value: number | null | undefined, locale = "en"): string | null {
  if (value === null || value === undefined) return null;
  return `USD ${new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", { maximumFractionDigits: 0 }).format(value)}`;
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function initials(first?: string | null, last?: string | null): string {
  return `${(first ?? "").charAt(0)}${(last ?? "").charAt(0)}`.toUpperCase() || "?";
}
