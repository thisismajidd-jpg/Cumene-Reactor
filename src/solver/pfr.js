// PFR ODE-system builder.
//
// Independent variable:  V  (reactor volume, m³)
// State:                  [F_1, F_2, ..., F_n, T?]
//
// Mole balance per species:   dF_i / dV = Σ_j (ν_{i,j} · r_j)
//
// Energy balance (non-iso):   dT/dV = [ U·a · (Ta - T) + Σ r_j (-ΔH_j) ] / Σ F·Cp
//                             where `a` is the heat-transfer area per unit volume.
//
// PFR ignores Ergun (no packing); pressure is treated as constant at P0.

import { R, FLOW_FLOOR } from './constants.js';
import { dTd, sumFCp } from './energy.js';

export function buildPFRSystem(cfg) {
  const { species, reactions, feed, thermal } = cfg;
  const nonIso = !!thermal;
  const n = species.length;
  const idxT = nonIso ? n : -1;

  const y0 = new Array(n + (nonIso ? 1 : 0));
  for (let i = 0; i < n; i++) {
    y0[i] = feed.F0[species[i]] ?? 0;
  }
  if (nonIso) y0[idxT] = feed.T0;

  const rhs = (V, state) => {
    const flows = {};
    let FT = 0;
    for (let i = 0; i < n; i++) {
      const f = Math.max(state[i], FLOW_FLOOR);
      flows[species[i]] = f;
      FT += f;
    }
    const T = nonIso ? state[idxT] : feed.T0;

    const CT = feed.P0 / (R * T);
    const concs = {};
    for (const sp in flows) {
      concs[sp] = FT > 0 ? CT * (flows[sp] / FT) : 0;
    }

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

    if (nonIso) {
      const heatCapRate = sumFCp(flows, thermal.cpCoeffs, T);
      const dHrx = reactions.map((rx) => rx.dHrx ?? 0);
      dy[idxT] = dTd({
        rates,
        dHrx,
        Ua: thermal.Ua,            // U·a in [W/(K·m³)]
        Ta: thermal.Ta,
        T,
        heatCapRate: heatCapRate || 1e-12,
      });
    }
    return dy;
  };

  return {
    rhs,
    y0,
    indices: {
      flow: Object.fromEntries(species.map((sp, i) => [sp, i])),
      T: idxT,
    },
  };
}
