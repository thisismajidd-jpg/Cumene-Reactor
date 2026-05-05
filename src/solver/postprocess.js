// Trajectory post-processing: turn raw integrator output into chart-friendly data
// and engineering metrics.

/**
 * @param {Object} args
 * @param {number[]}   args.ts                 Independent variable values (W or V)
 * @param {number[][]} args.ys                 State rows
 * @param {string[]}   args.species
 * @param {Object}     args.indices            { flow: { sp: idx }, T: idx | -1, y: idx | -1 }
 * @param {Object}     args.feed               { F0, T0, P0 }
 * @param {Array}      args.reactions          (used to determine main product/limiting reactant)
 * @param {Object}     [args.constraints]
 * @param {string}     [args.basis]            'W' or 'V'
 * @returns {Object} processed result
 */
export function processTrajectory({
  ts,
  ys,
  species,
  indices,
  feed,
  reactions,
  constraints,
  basis,
}) {
  const n = ts.length;

  // ── Per-species flow series ──────────────────────────────────────────
  const F = {};
  for (const sp of species) {
    F[sp] = new Array(n);
  }
  for (let i = 0; i < n; i++) {
    for (const sp of species) {
      F[sp][i] = ys[i][indices.flow[sp]];
    }
  }

  // ── Temperature series (constant if isothermal) ──────────────────────
  const Tarr = new Array(n);
  if (indices.T >= 0) {
    for (let i = 0; i < n; i++) Tarr[i] = ys[i][indices.T];
  } else {
    Tarr.fill(feed.T0);
  }

  // ── Pressure series (constant if Ergun off) ──────────────────────────
  const Parr = new Array(n);
  if (indices.y >= 0) {
    for (let i = 0; i < n; i++) Parr[i] = feed.P0 * ys[i][indices.y];
  } else {
    Parr.fill(feed.P0);
  }

  // ── Concentrations from PV = nRT ─────────────────────────────────────
  const R_si = 8.314;
  const C = {};
  for (const sp of species) C[sp] = new Array(n);
  for (let i = 0; i < n; i++) {
    let FT = 0;
    for (const sp of species) FT += F[sp][i];
    const CT = (Parr[i]) / (R_si * Tarr[i]);
    for (const sp of species) {
      C[sp][i] = FT > 0 ? CT * (F[sp][i] / FT) : 0;
    }
  }

  // ── Identify the global limiting reactant ────────────────────────────
  const limitingSp = identifyLimiting(species, feed.F0, reactions);
  const F0_lim = limitingSp ? feed.F0[limitingSp] || 0 : 0;
  const Xarr = new Array(n);
  if (limitingSp && F0_lim > 0) {
    for (let i = 0; i < n; i++) Xarr[i] = Math.max(0, 1 - F[limitingSp][i] / F0_lim);
  } else {
    Xarr.fill(0);
  }

  // ── Identify the desired (main) product ──────────────────────────────
  const mainProduct = identifyMainProduct(species, reactions, F);
  const Sarr = new Array(n);
  const Yarr = new Array(n);
  if (mainProduct && limitingSp) {
    for (let i = 0; i < n; i++) {
      const consumed = F0_lim - F[limitingSp][i];
      const produced = (F[mainProduct][i] || 0) - (feed.F0[mainProduct] || 0);
      Sarr[i] = consumed > 1e-12 ? produced / consumed : 0;
      Yarr[i] = F0_lim > 0 ? produced / F0_lim : 0;
    }
  } else {
    Sarr.fill(0);
    Yarr.fill(0);
  }

  // ── Hotspot ──────────────────────────────────────────────────────────
  let iHot = 0;
  let Thot = Tarr[0];
  for (let i = 1; i < n; i++) {
    if (Tarr[i] > Thot) {
      Thot = Tarr[i];
      iHot = i;
    }
  }
  const W_hotspot = ts[iHot];
  const W_hotspot_pct = (100 * W_hotspot) / ts[ts.length - 1];

  // ── Required W (or V) to hit X_target ────────────────────────────────
  const xt = constraints?.Xtarget ?? null;
  let W_for_target = null;
  if (xt != null) {
    for (let i = 0; i < n; i++) {
      if (Xarr[i] >= xt) {
        // Linear interpolate between i-1 and i
        if (i === 0) W_for_target = ts[0];
        else {
          const frac = (xt - Xarr[i - 1]) / (Xarr[i] - Xarr[i - 1]);
          W_for_target = ts[i - 1] + frac * (ts[i] - ts[i - 1]);
        }
        break;
      }
    }
  }

  // ── Constraint-violation flags ───────────────────────────────────────
  const warnings = [];
  if (constraints?.Tmax != null && Thot > constraints.Tmax) {
    warnings.push({
      level: 'danger',
      code: 'TMAX_EXCEEDED',
      message: `Hotspot ${Thot.toFixed(1)} K exceeds the constraint of ${constraints.Tmax} K.`,
    });
  }
  if (constraints?.Wmax != null && (W_for_target ?? Infinity) > constraints.Wmax) {
    warnings.push({
      level: 'danger',
      code: 'WMAX_EXCEEDED',
      message: `Required ${basis} (${(W_for_target ?? 0).toFixed(0)}) exceeds the constraint.`,
    });
  }
  if (constraints?.Smin != null) {
    const S_final = Sarr[Sarr.length - 1];
    if (S_final < constraints.Smin) {
      warnings.push({
        level: 'warning',
        code: 'SELECTIVITY_LOW',
        message: `Final selectivity ${(100 * S_final).toFixed(1)}% < min ${(100 * constraints.Smin).toFixed(1)}%.`,
      });
    }
  }

  return {
    basis,
    ts,
    F,
    C,
    T: Tarr,
    P: Parr,
    X: Xarr,
    S: Sarr,
    Y: Yarr,
    summary: {
      limitingSpecies: limitingSp,
      mainProduct,
      X_final: Xarr[Xarr.length - 1],
      T_final: Tarr[Tarr.length - 1],
      P_final: Parr[Parr.length - 1],
      S_final: Sarr[Sarr.length - 1],
      Y_final: Yarr[Yarr.length - 1],
      T_hotspot: Thot,
      W_hotspot,
      W_hotspot_pct,
      W_for_target,
    },
    warnings,
  };
}

function identifyLimiting(species, F0, reactions) {
  // A "reactant" is any species with negative net stoichiometric coefficient
  // across all reactions. The limiting one minimizes F0/|νtot|.
  let bestSp = null;
  let bestRatio = Infinity;
  for (const sp of species) {
    let totalNu = 0;
    for (const rx of reactions) totalNu += Math.min(rx.stoich[sp] ?? 0, 0);
    if (totalNu >= 0) continue;
    const F = F0[sp] ?? 0;
    if (F <= 0) continue;
    const ratio = F / Math.abs(totalNu);
    if (ratio < bestRatio) {
      bestRatio = ratio;
      bestSp = sp;
    }
  }
  return bestSp;
}

function identifyMainProduct(species, reactions, F) {
  // Heuristic:
  //   1. If exactly one reaction is tagged `desired`, take its primary product.
  //   2. Otherwise pick the species with the largest exit-flow gain across all
  //      species that are net products of the FIRST reaction.
  const desired = reactions.find((rx) => rx.desired);
  const target = desired ?? reactions[0];
  if (!target) return null;
  let best = null;
  let bestNu = 0;
  for (const sp of species) {
    const nu = target.stoich[sp] ?? 0;
    if (nu > bestNu) {
      bestNu = nu;
      best = sp;
    }
  }
  return best;
}
