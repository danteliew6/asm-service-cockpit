// Warehouse BIGINT/DOUBLE values arrive as strings over JSON even when typed as number,
// so every formatter coerces with Number() before doing math.
function toNum(n: number | string | null | undefined): number {
  if (n == null) return NaN;
  return typeof n === 'number' ? n : Number(n);
}

export function usd(v: number | string | null | undefined): string {
  const n = toNum(v);
  if (Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

export function signedUsd(v: number | string | null | undefined): string {
  const n = toNum(v);
  if (Number.isNaN(n)) return '—';
  const s = usd(Math.abs(n));
  return n >= 0 ? `+${s}` : `-${s}`;
}

export function pct(v: number | string | null | undefined, digits = 1): string {
  const n = toNum(v);
  if (Number.isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

export function num(v: number | string | null | undefined): string {
  const n = toNum(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US');
}
