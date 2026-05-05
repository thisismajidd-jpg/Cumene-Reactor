// PBR (Packed Bed Reactor) ODE-system builder.
//
// Independent variable:  W  (catalyst weight, kg)
// State:                  [F_1, F_2, ..., F_n, T?, y?]
//                         T present iff non-isothermal
//                         y = P/P0 present iff Ergun pressure drop enabled
//
// Reactions are written in the form:
//
//     ν_{i,j}        species i in reaction j (negative for reactants, positive for products)
//     r_j(T, C)      rate of reaction j evaluated at the local T and concentration vector
//
// The mole balance for each species i is:
//
//     dF_i / dW = Σ_j (ν_{i,j} · r_j)
//
// Concentrations:
//
//     C_T = (P0 · y) / (R · T)            [mol/m³]   if Ergun on
//     C_T = P0 / (R · T)                              if Ergun off
//     C_i = C_T · (F_i / F_T)
//
// All units are SI: F [mol/s], T [K], P0 [Pa], W [kg]. Concentration units come
// out as mol/m³ which the rate-law factories expect for elementary kinetics.
// (The Python memos use kmol/m³; that's just a 1000x rescaling of k0, see Cumene case.)

import { R, FLOW_FLOOR, PRESSURE_FLOOR } from './constants.js';
import { dTd, sumFCp } from './energy.js';
import { dydW } from './ergun.js';

/**
 * Build the RHS function for a PBR's ODE system.
 *
 * @param {Object} cfg
 * @param {string[]} cfg.species             Species names, in state-vector order
 * @param {Array} cfg.reactions              [{ rate: (T, C) => r, stoich: { sp: nu }, dHrx? }]
 * @param {Object} cfg.feed                  { F0: { sp: number }, T0, P0 }   (SI)
 * @param {Object} [cfg.thermal]             { Ua, Ta, cpCoeffs }  - if absent → isothermal
 * @param {Object} [cfg.ergun]               { alpha }             - if absent → no pressure drop
 * @returns {{ rhs: Function, y0: number[], indices: Object, FT0: number }}
 */
export function buildPBRSystem(cfg) {
  const { species, reactions, feed, thermal, ergun } = cfg;
  const nonIso = !!thermal;
  const useErgun = !!ergun;
  const n = species.length;
  const idxT = nonIso ? n : -1;
  const idxY = useErgun ? n + (nonIso ? 1 : 0) : -1;

  // Initial state vector
  const y0 = new Array(n + (nonIso ? 1 : 0) + (useErgun ? 1 : 0));
  let FT0 = 0;
  for (let i = 0; i < n; i++) {
    y0[i] = feed.F0[species[i]] ?? 0;
    FT0 += y0[i];
  }
  if (nonIso) y0[idxT] = feed.T0;
  if (useErgun) y0[idxY] = 1.0;

  const rhs = (W, state) => {
    // Defensive floors mirror the Python `max(F, 0)` guards.
    const flows = {};
    let FT = 0;
    for (let i = 0; i < n; i++) {
      const f = Math.max(state[i], FLOW_FLOOR);
      flows[species[i]] = f;
      FT += f;
    }
    const T = nonIso ? state[idxT] : feed.T0;
    const y = useErgun ? Math.max(state[idxY], PRESSURE_FLOOR) : 1.0;

    const P = feed.P0 * y;
    const CT = P / (R * T);            // mol/m³ if everything in SI
    const concs = {};
    for (const sp in flows) {
      concs[sp] = FT > 0 ? CT * (flows[sp] / FT) : 0;
    }

    // Reaction rates and species-wise mole-balance contributions
    const rates = new Array(reactions.length);
    const dF = new Array(n).fill(0);
    for (let j = 0; j < reactions.length; j++) {
      const r = Math.max(reactions[j].rate(T, concs), 0);
      rates[j] = r;
      const stoich = reactions[j].stoich;
      for (let i = 0; i < n; i++) {
        const nu = stoich[species[i]] ?? 0;
        if (nu !== 0) dF[i] += nu * r;
      }
    }

    const dy = new Array(state.length);
    for (let i = 0; i < n; i++) dy[i] = dF[i];

    // Energy balance (per kg_cat basis):
    //   dT/dW = [ U·a/ρ_b · (Ta - T) + Σ r_j (-ΔH_j) ] / Σ F·Cp
    if (nonIso) {
      const heatCapRate = sumFCp(flows, thermal.cpCoeffs, T);
      const dHrx = reactions.map((rx) => rx.dHrx ?? 0);
      dy[idxT] = dTd({
        rates,
        dHrx,
        Ua: thermal.Ua,            // already on a per-kg_cat basis
        Ta: thermal.Ta,
        T,
        heatCapRate: heatCapRate || 1e-12,
      });
    }

    if (useErgun) {
      dy[idxY] = dydW(ergun.alpha, y, FT, FT0);
    }

    return dy;
  };

  return {
    rhs,
    y0,
    indices: {
      flow: Object.fromEntries(species.map((sp, i) => [sp, i])),
      T: idxT,
      y: idxY,
    },
    FT0,
  };
}
