// Kinetics primitives.
//
// `arrhenius(k0, Ea, T)` — the canonical k = k0 · exp(-Ea / R T).
//
// Three rate-law factories return a function `(species → rate)`:
//   elementary({ k, reactants })          r = k · ∏ C_i^|ν_i|  for every reactant
//   powerLaw({ k, orders })               r = k · ∏ C_i^α_i    (independent orders)
//   langmuirHinshelwood({ k, K, ... })    r = k · C_A · C_B / (1 + K_A C_A + K_B C_B)^2
//
// All concentrations are in kmol/m³ (matches the Python memos). Rate units come
// out of whatever the user puts into k₀ — the solver itself doesn't enforce
// dimensional consistency; it's the UI's job to label units correctly.

import { R } from './constants.js';

/**
 * Arrhenius rate constant.
 *
 * @param {number} k0   Pre-exponential factor (units depend on the rate law)
 * @param {number} Ea   Activation energy [J/mol]
 * @param {number} T    Temperature [K]
 */
export function arrhenius(k0, Ea, T) {
  if (T <= 0) return 0;
  return k0 * Math.exp(-Ea / (R * T));
}

/**
 * Elementary rate law: r = k · ∏ C_i^|ν_i| over reactants only.
 * `reactants` is an array of { species, nu } where nu < 0 for reactants.
 *
 * Example for A + B → C:
 *   elementary({
 *     k: 1.2,
 *     reactants: [{ species: 'A', nu: -1 }, { species: 'B', nu: -1 }],
 *   })
 *
 * Returns a function (concs: { A, B, ... }) => rate.
 */
export function elementary({ k, reactants }) {
  return (concs) => {
    let r = k;
    for (const { species, nu } of reactants) {
      if (nu >= 0) continue;
      const c = Math.max(concs[species] ?? 0, 0);
      const order = Math.abs(nu);
      r *= order === 1 ? c : Math.pow(c, order);
    }
    return r;
  };
}

/**
 * Power-law rate: r = k · ∏ C_i^α_i with independent orders.
 *
 * @param {Object} cfg
 * @param {number} cfg.k
 * @param {Array<{species: string, alpha: number}>} cfg.orders
 */
export function powerLaw({ k, orders }) {
  return (concs) => {
    let r = k;
    for (const { species, alpha } of orders) {
      if (alpha === 0) continue;
      const c = Math.max(concs[species] ?? 0, 0);
      r *= alpha === 1 ? c : Math.pow(c, alpha);
    }
    return r;
  };
}

/**
 * Langmuir-Hinshelwood (single-site, two adsorbed species, second-order):
 *   r = k · C_A · C_B / (1 + Σ K_i C_i)^2
 *
 * @param {Object} cfg
 * @param {number} cfg.k
 * @param {Array<{species: string, alpha: number}>} cfg.orders   Numerator orders
 * @param {Array<{species: string, K: number}>} cfg.adsorption   Denominator terms
 * @param {number} [cfg.exponent=2]                              Power on the denominator
 */
export function langmuirHinshelwood({ k, orders, adsorption, exponent = 2 }) {
  return (concs) => {
    let num = k;
    for (const { species, alpha } of orders) {
      const c = Math.max(concs[species] ?? 0, 0);
      num *= alpha === 1 ? c : Math.pow(c, alpha);
    }
    let denom = 1;
    for (const { species, K } of adsorption) {
      const c = Math.max(concs[species] ?? 0, 0);
      denom += K * c;
    }
    return num / Math.pow(denom, exponent);
  };
}

/**
 * Convenience: build a rate-law function from the descriptor object stored
 * in the global state.
 *
 *   {
 *     type: 'elementary' | 'powerLaw' | 'langmuirHinshelwood',
 *     k0, Ea,
 *     orders?: [{ species, alpha }],
 *     adsorption?: [{ species, K }],
 *     reactants?: [{ species, nu }],
 *   }
 *
 * Returns `(T, concs) => rate`.
 */
export function buildRateLaw(descriptor) {
  return (T, concs) => {
    const k = arrhenius(descriptor.k0, descriptor.Ea, T);
    if (descriptor.type === 'powerLaw') {
      return powerLaw({ k, orders: descriptor.orders })(concs);
    }
    if (descriptor.type === 'langmuirHinshelwood') {
      return langmuirHinshelwood({
        k,
        orders: descriptor.orders,
        adsorption: descriptor.adsorption,
        exponent: descriptor.exponent ?? 2,
      })(concs);
    }
    return elementary({ k, reactants: descriptor.reactants })(concs);
  };
}
