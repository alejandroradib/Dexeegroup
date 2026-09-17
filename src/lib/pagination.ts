export const PAGE_SIZE = 25;

export function pageRange(page: number, size = PAGE_SIZE): { from: number; to: number } {
  const safe = Math.max(1, Math.floor(page || 1));
  const from = (safe - 1) * size;
  return { from, to: from + size - 1 };
}

export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function totalPages(count: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / size));
}
