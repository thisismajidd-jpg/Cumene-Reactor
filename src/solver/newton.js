// Damped Newton-Raphson for scalar root finding.
// Used by the CSTR algebraic solver and by inverse problems like "find W to hit X".

import { DEFAULT_NEWTON_MAX_ITER, DEFAULT_NEWTON_TOL } from './constants.js';

/**
 * Solve f(x) = 0 by Newton iteration with backtracking line search.
 *
 * @param {Function} f          Scalar function to zero
 * @param {Function} [fPrime]   Analytic derivative; if omitted a centered FD is used
 * @param {number} x0           Initial guess
 * @param {Object} [opts]
 * @param {number} [opts.tol]
 * @param {number} [opts.maxIter]
 * @param {number} [opts.fdEps] Step for finite-difference derivative
 * @returns {{ ok: boolean, x?: number, fx?: number, iterations: number, message: string }}
 */
export function newton(f, fPrime, x0, opts = {}) {
  const tol = opts.tol ?? DEFAULT_NEWTON_TOL;
  const maxIter = opts.maxIter ?? DEFAULT_NEWTON_MAX_ITER;
  const fdEps = opts.fdEps ?? 1e-7;

  const derivative = (x) => {
    if (fPrime) return fPrime(x);
    const h = Math.max(fdEps, fdEps * Math.abs(x));
    return (f(x + h) - f(x - h)) / (2 * h);
  };

  let x = x0;
  for (let i = 0; i < maxIter; i++) {
    const fx = f(x);
    if (!Number.isFinite(fx)) {
      return { ok: false, iterations: i, message: 'f(x) returned non-finite' };
    }
    if (Math.abs(fx) < tol) {
      return { ok: true, x, fx, iterations: i, message: 'converged' };
    }
    const dfx = derivative(x);
    if (!Number.isFinite(dfx) || Math.abs(dfx) < 1e-14) {
      return { ok: false, x, fx, iterations: i, message: 'derivative vanished' };
    }
    let step = fx / dfx;

    // Backtracking: accept the step only if |f(x - step)| < |f(x)|.
    let alpha = 1;
    let xNew = x - step;
    let fNew = f(xNew);
    let bt = 0;
    while ((!Number.isFinite(fNew) || Math.abs(fNew) > Math.abs(fx)) && bt < 20) {
      alpha *= 0.5;
      xNew = x - alpha * step;
      fNew = f(xNew);
      bt++;
    }
    if (bt === 20) {
      return { ok: false, x, fx, iterations: i, message: 'line search failed' };
    }
    x = xNew;
  }
  return { ok: false, x, iterations: maxIter, message: 'max iterations' };
}
