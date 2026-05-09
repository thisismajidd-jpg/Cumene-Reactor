// Unit conversion layer.
//
// The state and the solver both operate in **SI**:
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
// The UI displays values in either SI or "engineering" (industry-common) units.
// All conversions go through this module — components never hand-roll factors.
//
// `toDisplay(value, dim, system)`  → number in display units
// `fromDisplay(value, dim, system)` → number in SI

export const DIMENSIONS = {
  flow:        { si: 'mol/s',     eng: 'mol/s'  },
  temperature: { si: 'K',         eng: 'K'      },
  pressure:    { si: 'Pa',        eng: 'bar'    },
  volume:      { si: 'm³',        eng: 'L'      },
  weight:      { si: 'kg',        eng: 'kg'     },
  energy:      { si: 'J/mol',     eng: 'kJ/mol' },
  htc:         { si: 'W/(m²·K)',  eng: 'kcal/h·m²·°C' },
  length:      { si: 'm',         eng: 'mm'     },
  density:     { si: 'kg/m³',     eng: 'kg/m³'  },
  viscosity:   { si: 'Pa·s',      eng: 'cP'     },
  area:        { si: 'm²',        eng: 'm²'     },
  conc:        { si: 'mol/m³',    eng: 'mol/L'  },
  fraction:    { si: '—',         eng: '—'      },
  dimensionless: { si: '—', eng: '—' },
};

// Multiplicative SI → engineering factors. Dimensions absent here keep their
// SI numeric value in both systems (e.g. flow, temperature, weight).
const FACTORS = {
  pressure:    { eng: 1 / 1e5 },            // Pa → bar
  volume:      { eng: 1000 },               // m³ → L
  energy:      { eng: 1 / 1000 },           // J/mol → kJ/mol
  htc:         { eng: 1 / 1.163 },          // W/(m²·K) → kcal/(h·m²·°C)
  length:      { eng: 1000 },               // m → mm
  viscosity:   { eng: 1000 },               // Pa·s → cP
  conc:        { eng: 1 / 1000 },           // mol/m³ → mol/L
};

export function unitLabel(dim, system) {
  return DIMENSIONS[dim]?.[system === 'engineering' ? 'eng' : 'si'] ?? '';
}

export function toDisplay(value, dim, system) {
  if (value == null || !Number.isFinite(value)) return value;
  if (system === 'si') return value;
  const f = FACTORS[dim];
  if (!f) return value;
  return value * f.eng;
}

export function fromDisplay(value, dim, system) {
  if (value == null || !Number.isFinite(value)) return value;
  if (system === 'si') return value;
  const f = FACTORS[dim];
  if (!f) return value;
  return value / f.eng;
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
