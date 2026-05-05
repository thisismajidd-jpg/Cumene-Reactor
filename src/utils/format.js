// Number-formatting helpers used in tables, summaries, axis ticks.

/**
 * Format with a given precision. Falls back to scientific for very small / large.
 */
export function fmt(n, precision = 4) {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) {
    return n.toExponential(precision - 1);
  }
  // Choose decimals so significant figures ~= precision
  let decimals = precision;
  if (abs >= 1) {
    const intDigits = Math.floor(Math.log10(abs)) + 1;
    decimals = Math.max(0, precision - intDigits);
  }
  return n.toLocaleString('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  });
}

/** Engineering-style integer with thousands separators. */
export function fmtInt(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
}

/** Percentage, e.g. 0.987 → "98.70 %" */
export function fmtPct(n, decimals = 2) {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(decimals)} %`;
}

/** Compact format for axis labels: 12345 → "12.3k" */
export function fmtCompact(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  if (abs < 1e-2 && abs > 0) return n.toExponential(1);
  return fmt(n, 3);
}

/**
 * Parse a user-typed number like "2.8e4" or "1,250.5". Returns null on failure.
 */
export function parseNumber(str) {
  if (typeof str === 'number') return Number.isFinite(str) ? str : null;
  if (typeof str !== 'string') return null;
  const cleaned = str.trim().replace(/,/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '+') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
