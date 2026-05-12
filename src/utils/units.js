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
// Engineering = US customary (lbmol/hr, °F, psi, lb, gal, ft, …).
// SI stays metric with the conventions used inside the solver
// (T in K, P in Pa internally but displayed in bar).
const DIMS = {
  flow: {
    si:  { unit: 'mol/s',     factor: 1,         offset: 0 },
    eng: { unit: 'lbmol/hr',  factor: 7.936641,  offset: 0 },  // mol/s → lbmol/hr
  },
  temperature: {
    si:  { unit: 'K',         factor: 1,         offset: 0 },
    eng: { unit: '°F',        factor: 1.8,       offset: -459.67 }, // K → °F
  },
  pressure: {
    si:  { unit: 'bar',       factor: 1e-5,      offset: 0 },           // Pa → bar
    eng: { unit: 'psi',       factor: 1.450377e-4, offset: 0 },         // Pa → psi
  },
  volume: {
    si:  { unit: 'm³',        factor: 1,         offset: 0 },
    eng: { unit: 'gal',       factor: 264.17205, offset: 0 },           // m³ → US gal
  },
  weight: {
    si:  { unit: 'kg',        factor: 1,         offset: 0 },
    eng: { unit: 'lb',        factor: 2.20462262, offset: 0 },          // kg → lb
  },
  energy: {
    si:  { unit: 'kJ/mol',    factor: 1e-3,      offset: 0 },
    eng: { unit: 'BTU/lbmol', factor: 0.4299226, offset: 0 },           // J/mol → BTU/lbmol
  },
  htc: {
    si:  { unit: 'W/(m²·K)',            factor: 1,         offset: 0 },
    eng: { unit: 'BTU/(h·ft²·°F)',      factor: 0.176110,  offset: 0 }, // W/(m²·K) → BTU/(h·ft²·°F)
  },
  length: {
    si:  { unit: 'm',         factor: 1,         offset: 0 },
    eng: { unit: 'ft',        factor: 3.2808399, offset: 0 },           // m → ft
  },
  density: {
    si:  { unit: 'kg/m³',     factor: 1,         offset: 0 },
    eng: { unit: 'lb/ft³',    factor: 0.0624280, offset: 0 },           // kg/m³ → lb/ft³
  },
  viscosity: {
    si:  { unit: 'Pa·s',      factor: 1,         offset: 0 },
    eng: { unit: 'cP',        factor: 1000,      offset: 0 },           // Pa·s → cP
  },
  area: {
    si:  { unit: 'm²',        factor: 1,         offset: 0 },
    eng: { unit: 'ft²',       factor: 10.7639104, offset: 0 },          // m² → ft²
  },
  conc: {
    si:  { unit: 'mol/m³',    factor: 1,         offset: 0 },
    eng: { unit: 'lbmol/ft³', factor: 6.242796e-5, offset: 0 },         // mol/m³ → lbmol/ft³
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
