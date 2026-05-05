// Input validation. Each function returns null (valid) or a string warning.

export function vPositive(v, label = 'Value') {
  if (v == null || !Number.isFinite(v)) return `${label} is required`;
  if (v <= 0) return `${label} must be positive`;
  return null;
}

export function vNonNegative(v, label = 'Value') {
  if (v == null || !Number.isFinite(v)) return `${label} is required`;
  if (v < 0) return `${label} cannot be negative`;
  return null;
}

export function vRange(v, lo, hi, label = 'Value') {
  if (v == null || !Number.isFinite(v)) return `${label} is required`;
  if (v < lo || v > hi) return `${label} must be between ${lo} and ${hi}`;
  return null;
}

export function vConversion(v) {
  if (v == null || !Number.isFinite(v)) return 'Target conversion is required';
  if (v <= 0 || v >= 1) return 'Conversion must be in (0, 1)';
  return null;
}

export function vMolFractions(fractions) {
  const total = Object.values(fractions).reduce((s, x) => s + (Number(x) || 0), 0);
  if (Math.abs(total - 1) > 0.01) {
    return `Mole fractions sum to ${total.toFixed(3)}, not 1.0`;
  }
  return null;
}

/**
 * Aggregate a set of warnings under a single namespace key. Use in components
 * like:
 *   const warnings = collect({
 *     k0: vPositive(k0, 'k₀'),
 *     Ea: vNonNegative(Ea, 'Eₐ'),
 *   });
 */
export function collect(spec) {
  const out = {};
  for (const k in spec) {
    if (spec[k]) out[k] = spec[k];
  }
  return out;
}
