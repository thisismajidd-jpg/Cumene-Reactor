// Bracketed root finders.
//
// `bisect(f, a, b)` is the workhorse — guaranteed convergence on a sign-change bracket.
// `findAllRoots(f, lo, hi, segments)` scans an interval and returns every bracketed root,
//    used by the CSTR multiple-steady-state detector and the bifurcation diagram.

import { DEFAULT_BISECTION_MAX_ITER, DEFAULT_BISECTION_TOL } from './constants.js';

/**
 * Classical bisection with optional Illinois acceleration.
 * Requires sign(f(a)) ≠ sign(f(b)).
 */
export function bisect(f, a, b, opts = {}) {
  const tol = opts.tol ?? DEFAULT_BISECTION_TOL;
  const maxIter = opts.maxIter ?? DEFAULT_BISECTION_MAX_ITER;
  let fa = f(a);
  let fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) {
    return { ok: false, message: 'f(a) or f(b) is non-finite' };
  }
  if (fa === 0) return { ok: true, x: a, fx: 0, iterations: 0, message: 'exact at a' };
  if (fb === 0) return { ok: true, x: b, fx: 0, iterations: 0, message: 'exact at b' };
  if (fa * fb > 0) {
    return { ok: false, message: 'no sign change in bracket' };
  }
  let side = 0;
  for (let i = 0; i < maxIter; i++) {
    // Illinois variant of false position falls back to bisection if it stalls.
    let c;
    if (Math.abs(fa) > 0 && Math.abs(fb) > 0 && i < 30) {
      c = (a * fb - b * fa) / (fb - fa);
    } else {
      c = 0.5 * (a + b);
    }
    if (!(c > Math.min(a, b) && c < Math.max(a, b))) c = 0.5 * (a + b);
    const fc = f(c);
    if (!Number.isFinite(fc)) {
      return { ok: false, message: 'f(c) non-finite' };
    }
    if (Math.abs(fc) < tol || Math.abs(b - a) < tol) {
      return { ok: true, x: c, fx: fc, iterations: i + 1, message: 'converged' };
    }
    if (fc * fa < 0) {
      b = c;
      fb = fc;
      if (side === -1) fa *= 0.5;
      side = -1;
    } else {
      a = c;
      fa = fc;
      if (side === 1) fb *= 0.5;
      side = 1;
    }
  }
  return { ok: false, message: 'max iterations' };
}

/**
 * Scan [lo, hi] in `segments` slices; return every sub-interval where
 * the function changes sign, refined to high precision by `bisect`.
 *
 * Used to detect multiple steady states in the autocatalytic CSTR case.
 */
export function findAllRoots(f, lo, hi, segments = 200, opts = {}) {
  const roots = [];
  let xPrev = lo;
  let fPrev = f(lo);
  for (let i = 1; i <= segments; i++) {
    const x = lo + ((hi - lo) * i) / segments;
    const fx = f(x);
    if (Number.isFinite(fPrev) && Number.isFinite(fx)) {
      if (fPrev === 0) roots.push({ x: xPrev, fx: 0 });
      if (fPrev * fx < 0) {
        const r = bisect(f, xPrev, x, opts);
        if (r.ok) roots.push({ x: r.x, fx: r.fx });
      }
    }
    xPrev = x;
    fPrev = fx;
  }
  // Deduplicate near-identical roots
  const dedup = [];
  const eps = (hi - lo) * 1e-7;
  for (const r of roots) {
    if (!dedup.some((d) => Math.abs(d.x - r.x) < eps)) dedup.push(r);
  }
  return dedup;
}
