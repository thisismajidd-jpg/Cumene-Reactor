// CSTR algebraic solver.
//
// Mole balance per species at steady state:
//
//     F_{i,0} - F_i = -V · Σ_j ν_{i,j} · r_j(T, C)        ...(i)
//
// We parametrize by an *extent vector* ε = (ε_1, ε_2, ..., ε_R) — one extent per
// reaction. Then for every species:
//
//     F_i = F_{i,0} + Σ_j ν_{i,j} · ε_j                    ...(ii)
//
// and the residual we drive to zero is:
//
//     g_j(ε) = ε_j  -  V · r_j(T, C(ε))      for each reaction j
//
// For a single reaction (R = 1) this collapses to a scalar equation in ε,
// solved by `findAllRoots` so multiple steady states (autocatalytic) are
// detected automatically. For multi-reaction we use a damped multivariate
// Newton iteration with the Jacobian estimated by finite differences.

import { R, DEFAULT_NEWTON_TOL, DEFAULT_NEWTON_MAX_ITER } from './constants.js';
import { findAllRoots } from './bisection.js';

/**
 * Solve the steady-state CSTR mole balance.
 *
 * @param {Object} cfg
 * @param {string[]} cfg.species
 * @param {Array} cfg.reactions       [{ rate, stoich, dHrx? }]
 * @param {Object} cfg.feed           { F0: { sp: F }, T0, P0 }
 * @param {Object} cfg.reactor        { V }
 * @param {Object} [cfg.options]
 * @returns {{ ok, solutions: Array<{ epsilon, flows, T, X, ... }>, message }}
 *
 * Each solution element contains:
 *   epsilon: number[]               reaction extents
 *   flows:   { sp: number }         outlet molar flows
 *   T:       number                 (= feed.T0 for adiabatic-isothermal CSTR)
 *   X:       number                 conversion of the limiting reactant (if computable)
 */
export function solveCSTR(cfg) {
  const { species, reactions, feed, reactor } = cfg;
  const T = feed.T0;
  const V = reactor.V;
  const FT0 = species.reduce((sum, sp) => sum + (feed.F0[sp] ?? 0), 0);

  // Concentration vector at a given extent vector.
  const concsAtEpsilon = (epsilon) => {
    const flows = {};
    let FT = 0;
    for (const sp of species) {
      let F = feed.F0[sp] ?? 0;
      for (let j = 0; j < reactions.length; j++) {
        F += (reactions[j].stoich[sp] ?? 0) * epsilon[j];
      }
      F = Math.max(F, 0);
      flows[sp] = F;
      FT += F;
    }
    const CT = feed.P0 / (R * T);
    const concs = {};
    for (const sp of species) concs[sp] = FT > 0 ? CT * (flows[sp] / FT) : 0;
    return { flows, FT, concs };
  };

  // Residual vector g(ε) = ε - V · r(T, C(ε)).
  const residual = (epsilon) => {
    const { concs } = concsAtEpsilon(epsilon);
    const g = new Array(reactions.length);
    for (let j = 0; j < reactions.length; j++) {
      const r = Math.max(reactions[j].rate(T, concs), 0);
      g[j] = epsilon[j] - V * r;
    }
    return g;
  };

  // ──────────────────────────────────────────────────────────────────────
  // Single-reaction case: scalar root finding with multi-root detection.
  // ──────────────────────────────────────────────────────────────────────
  if (reactions.length === 1) {
    const limiting = limitingSpecies(species, feed.F0, reactions[0].stoich);
    const F0_lim = feed.F0[limiting];
    const nu_lim = Math.abs(reactions[0].stoich[limiting] ?? 1);
    const eMax = F0_lim / nu_lim;          // physically permissible upper bound on extent
    const f = (eps) => residual([eps])[0];
    const roots = findAllRoots(f, 1e-12, eMax * 0.999, 400, {
      tol: 1e-10,
      maxIter: 200,
    });
    if (roots.length === 0) {
      return { ok: false, solutions: [], message: 'no steady state found' };
    }
    const solutions = roots.map((r) => buildSolution([r.x], cfg, concsAtEpsilon, FT0));
    return {
      ok: true,
      solutions,
      message: `${solutions.length} steady state${solutions.length > 1 ? 's' : ''}`,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Multi-reaction case: damped Newton on the residual vector.
  // ──────────────────────────────────────────────────────────────────────
  const tol = cfg.options?.tol ?? DEFAULT_NEWTON_TOL;
  const maxIter = cfg.options?.maxIter ?? DEFAULT_NEWTON_MAX_ITER;

  // Initial guess: low conversion (small extents).
  let eps = reactions.map((rx) => {
    const limiting = limitingSpecies(species, feed.F0, rx.stoich);
    return 0.01 * (feed.F0[limiting] ?? 0) / Math.abs(rx.stoich[limiting] ?? 1);
  });

  for (let iter = 0; iter < maxIter; iter++) {
    const g = residual(eps);
    const norm = Math.sqrt(g.reduce((s, x) => s + x * x, 0));
    if (norm < tol) break;
    const J = jacobianFD(residual, eps, g);
    const step = solveLinearSystem(J, g.map((x) => -x));
    if (!step) {
      return { ok: false, solutions: [], message: 'singular Jacobian' };
    }
    // Damped step
    let alpha = 1;
    let trial = eps.map((e, i) => e + alpha * step[i]);
    let gTrial = residual(trial);
    let normTrial = Math.sqrt(gTrial.reduce((s, x) => s + x * x, 0));
    let bt = 0;
    while (normTrial > norm && bt < 12) {
      alpha *= 0.5;
      trial = eps.map((e, i) => e + alpha * step[i]);
      gTrial = residual(trial);
      normTrial = Math.sqrt(gTrial.reduce((s, x) => s + x * x, 0));
      bt++;
    }
    eps = trial;
  }
  const finalRes = residual(eps);
  const finalNorm = Math.sqrt(finalRes.reduce((s, x) => s + x * x, 0));
  if (finalNorm > 1e-4) {
    return { ok: false, solutions: [], message: `Newton did not converge (||g|| = ${finalNorm.toExponential(2)})` };
  }
  return {
    ok: true,
    solutions: [buildSolution(eps, cfg, concsAtEpsilon, FT0)],
    message: 'converged',
  };
}

function limitingSpecies(species, F0, stoich) {
  let bestSp = null;
  let bestRatio = Infinity;
  for (const sp of species) {
    const nu = stoich[sp] ?? 0;
    if (nu >= 0) continue;            // reactant only
    const F = F0[sp] ?? 0;
    if (F <= 0) continue;
    const ratio = F / Math.abs(nu);
    if (ratio < bestRatio) {
      bestRatio = ratio;
      bestSp = sp;
    }
  }
  return bestSp;
}

function buildSolution(epsilon, cfg, concsAtEpsilon, FT0) {
  const { species, reactions, feed } = cfg;
  const { flows } = concsAtEpsilon(epsilon);
  // Conversion of the global limiting species (across all reactions: total ν_i,total)
  let limiting = null;
  let bestRatio = Infinity;
  for (const sp of species) {
    const totalNu = reactions.reduce((s, rx) => s + Math.min(rx.stoich[sp] ?? 0, 0), 0);
    if (totalNu >= 0) continue;
    const F = feed.F0[sp] ?? 0;
    if (F <= 0) continue;
    const ratio = F / Math.abs(totalNu);
    if (ratio < bestRatio) {
      bestRatio = ratio;
      limiting = sp;
    }
  }
  const X =
    limiting != null
      ? Math.max(0, 1 - flows[limiting] / (feed.F0[limiting] || 1))
      : null;
  return {
    epsilon,
    flows,
    T: feed.T0,
    P: feed.P0,
    X,
    limitingSpecies: limiting,
    FT0,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Tiny linear-algebra helpers (we don't pull in numeric.js).
// ──────────────────────────────────────────────────────────────────────────

function jacobianFD(F, x, F0) {
  const n = x.length;
  const J = Array.from({ length: n }, () => new Array(n));
  for (let j = 0; j < n; j++) {
    const h = Math.max(1e-7 * Math.abs(x[j]), 1e-9);
    const xp = x.slice();
    xp[j] += h;
    const Fp = F(xp);
    for (let i = 0; i < n; i++) {
      J[i][j] = (Fp[i] - F0[i]) / h;
    }
  }
  return J;
}

function solveLinearSystem(A, b) {
  const n = A.length;
  // Build augmented matrix.
  const M = A.map((row, i) => row.concat([b[i]]));
  // Gaussian elimination with partial pivoting.
  for (let i = 0; i < n; i++) {
    let pivot = i;
    let pivotVal = Math.abs(M[i][i]);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > pivotVal) {
        pivotVal = Math.abs(M[k][i]);
        pivot = k;
      }
    }
    if (pivotVal < 1e-14) return null;
    if (pivot !== i) [M[i], M[pivot]] = [M[pivot], M[i]];
    const div = M[i][i];
    for (let k = i; k <= n; k++) M[i][k] /= div;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const factor = M[r][i];
      if (factor === 0) continue;
      for (let k = i; k <= n; k++) M[r][k] -= factor * M[i][k];
    }
  }
  return M.map((row) => row[n]);
}
