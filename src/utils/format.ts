/** Round to at most `dp` decimals and drop trailing zeros. */
export function num(value: number | null | undefined, dp = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value.toFixed(dp)).toString();
}

export function kg(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${num(value)} kg`;
}

export function cm(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${num(value)} cm`;
}

export function kcal(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)} kcal`;
}

export function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

export function initials(name: string | null | undefined, fallback = '?'): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('') || fallback;
}
