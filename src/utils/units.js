// Unit conversion layer.
//
// State and solver always operate in **canonical SI base** units:
//   F   mol/s
//   T   K
//   P   Pa
//   V   m³
//   W   kg
//   k0  units consistent with the rate law (depends on type)
//   Ea  J/mol
//   U   W/(m²·K)
//   ΔH  J/mol
//
// The UI displays values in either SI or "engineering" units. Each dimension
// has its own SI and engineering display unit, possibly with a multiplicative
// factor and/or additive offset (e.g. K ↔ °C).
//
//   display = stored * factor + offset
//   stored  = (display - offset) / factor
//
// Components NEVER hand-roll factors — they go through `toDisplay` /
// `fromDisplay` / `unitLabel`.

const I = { factor: 1, offset: 0 };

// Per-dimension display config. Keys with no entry stay numerically unchanged
// in both systems (treated as identity).
const DIMS = {
  flow: {
    si:  { unit: 'mol/s',   factor: 1,    offset: 0 },
    eng: { unit: 'kmol/h',  factor: 3.6,  offset: 0 },        // mol/s × 3.6 = kmol/h
  },
  temperature: {
    si:  { unit: 'K',       factor: 1,    offset: 0 },
    eng: { unit: '°C',      factor: 1,    offset: -273.15 },
  },
  pressure: {
    si:  { unit: 'bar',     factor: 1e-5, offset: 0 },        // Pa → bar
    eng: { unit: 'atm',     factor: 1 / 101325, offset: 0 },  // Pa → atm
  },
  volume: {
    si:  { unit: 'm³',      factor: 1,    offset: 0 },
    eng: { unit: 'L',       factor: 1000, offset: 0 },
  },
  weight: {
    si:  { unit: 'kg',      factor: 1,    offset: 0 },
    eng: { unit: 'g',       factor: 1000, offset: 0 },
  },
  energy: {
    si:  { unit: 'kJ/mol',   factor: 1e-3,        offset: 0 },
    eng: { unit: 'kcal/mol', factor: 1 / 4184,    offset: 0 }, // 1 kcal = 4184 J
  },
  htc: {
    si:  { unit: 'W/(m²·K)',         factor: 1,           offset: 0 },
    eng: { unit: 'kcal/(h·m²·°C)',   factor: 1 / 1.163,   offset: 0 },
  },
  length: {
    si:  { unit: 'm',  factor: 1,    offset: 0 },
    eng: { unit: 'mm', factor: 1000, offset: 0 },
  },
  density: {
    si:  { unit: 'kg/m³', factor: 1, offset: 0 },
    eng: { unit: 'kg/m³', factor: 1, offset: 0 },
  },
  viscosity: {
    si:  { unit: 'Pa·s', factor: 1,    offset: 0 },
    eng: { unit: 'cP',   factor: 1000, offset: 0 },
  },
  area: {
    si:  { unit: 'm²', factor: 1, offset: 0 },
    eng: { unit: 'm²', factor: 1, offset: 0 },
  },
  conc: {
    si:  { unit: 'mol/m³', factor: 1,    offset: 0 },
    eng: { unit: 'mol/L',  factor: 1e-3, offset: 0 },
  },
  fraction:      { si: { unit: '—', ...I }, eng: { unit: '—', ...I } },
  dimensionless: { si: { unit: '—', ...I }, eng: { unit: '—', ...I } },
};

// Back-compat shape for any consumer that imported the old DIMENSIONS map.
export const DIMENSIONS = Object.fromEntries(
  Object.entries(DIMS).map(([k, v]) => [k, { si: v.si.unit, eng: v.eng.unit }])
);

function pick(dim, system) {
  const d = DIMS[dim];
  if (!d) return { unit: '', factor: 1, offset: 0 };
  return system === 'si' ? d.si : d.eng;
}

export function unitLabel(dim, system) {
  return pick(dim, system).unit;
}

export function toDisplay(value, dim, system) {
  if (value == null || !Number.isFinite(value)) return value;
  const { factor, offset } = pick(dim, system);
  return value * factor + offset;
}

export function fromDisplay(value, dim, system) {
  if (value == null || !Number.isFinite(value)) return value;
  const { factor, offset } = pick(dim, system);
  return (value - offset) / factor;
}

/**
 * Bulk conversion of a state object. Pass a map of `{ key: dimension }`
 * and we return `{ key: convertedValue }`.
 */
export function convertObject(obj, dimMap, direction, system) {
  const out = {};
  for (const k in obj) {
    const dim = dimMap[k];
    if (!dim) {
      out[k] = obj[k];
      continue;
    }
    out[k] =
      direction === 'toDisplay'
        ? toDisplay(obj[k], dim, system)
        : fromDisplay(obj[k], dim, system);
  }
  return out;
}
