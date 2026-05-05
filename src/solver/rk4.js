// Classical 4th-order Runge-Kutta integrator for systems of ODEs.
//
//   dy/dt = f(t, y)        y(t0) = y0
//
// Two entry points:
//   rk4Integrate(...)        fixed-step
//   rk4IntegrateAdaptive(...) step-doubling controller for stiff cases
//
// The signature mirrors scipy.integrate.solve_ivp's `t_eval`-style return:
//   { ok, ts: number[], ys: number[][], message }
// where ys[i] is the full state vector at ts[i] (rows = time, cols = species).
//
// `f` must be a pure function `(t, y) => dy/dt` returning a fresh array.

import { DEFAULT_RK4_STEPS } from './constants.js';

function rk4Step(f, t, y, h) {
  const n = y.length;
  const k1 = f(t, y);
  const yk2 = new Array(n);
  for (let i = 0; i < n; i++) yk2[i] = y[i] + 0.5 * h * k1[i];
  const k2 = f(t + 0.5 * h, yk2);
  const yk3 = new Array(n);
  for (let i = 0; i < n; i++) yk3[i] = y[i] + 0.5 * h * k2[i];
  const k3 = f(t + 0.5 * h, yk3);
  const yk4 = new Array(n);
  for (let i = 0; i < n; i++) yk4[i] = y[i] + h * k3[i];
  const k4 = f(t + h, yk4);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = y[i] + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  return out;
}

/**
 * Fixed-step RK4 over a uniform grid of `steps + 1` points.
 *
 * @param {Function} f     RHS function (t, y) => dy/dt
 * @param {number} t0      Start of independent variable
 * @param {number} tEnd    End of independent variable
 * @param {number[]} y0    Initial state vector
 * @param {Object} [opts]
 * @param {number} [opts.steps=600]   Number of integration steps
 * @param {Function} [opts.onStep]    Optional callback (t, y) → void
 * @param {Function} [opts.event]     Optional event detector (t, y) → boolean
 *                                    Stops integration the first step it returns true.
 */
export function rk4Integrate(f, t0, tEnd, y0, opts = {}) {
  const steps = Math.max(2, opts.steps ?? DEFAULT_RK4_STEPS);
  const h = (tEnd - t0) / steps;
  const ts = new Array(steps + 1);
  const ys = new Array(steps + 1);
  ts[0] = t0;
  ys[0] = y0.slice();
  let y = y0.slice();
  let t = t0;
  for (let i = 1; i <= steps; i++) {
    y = rk4Step(f, t, y, h);
    t = t0 + i * h;
    ts[i] = t;
    ys[i] = y;
    if (opts.onStep) opts.onStep(t, y);
    if (opts.event && opts.event(t, y)) {
      ts.length = i + 1;
      ys.length = i + 1;
      return { ok: true, ts, ys, message: 'event triggered' };
    }
  }
  return { ok: true, ts, ys, message: 'completed' };
}

/**
 * RK4 with step-doubling error control.
 *
 * Uses Richardson extrapolation: a full step `h` is compared to two half-steps
 * `h/2`. If the per-component relative error exceeds `tol`, the step is halved
 * and retried. If well below tol, the next step is doubled (capped by `hMax`).
 *
 * Returned trajectory is resampled onto a uniform grid of `outPoints` points
 * via linear interpolation, so downstream plotting code stays simple.
 */
export function rk4IntegrateAdaptive(f, t0, tEnd, y0, opts = {}) {
  const tol = opts.tol ?? 1e-7;
  const outPoints = Math.max(2, opts.outPoints ?? DEFAULT_RK4_STEPS);
  const hMin = opts.hMin ?? (tEnd - t0) * 1e-9;
  const hMax = opts.hMax ?? (tEnd - t0) / 8;
  let h = opts.h0 ?? (tEnd - t0) / 200;

  const tStops = [t0];
  const yStops = [y0.slice()];
  let t = t0;
  let y = y0.slice();
  const n = y.length;

  let safety = 0;
  while (t < tEnd) {
    if (safety++ > 100_000) {
      return { ok: false, ts: tStops, ys: yStops, message: 'too many steps' };
    }
    if (t + h > tEnd) h = tEnd - t;
    const yFull = rk4Step(f, t, y, h);
    const yHalf1 = rk4Step(f, t, y, h / 2);
    const yHalf2 = rk4Step(f, t + h / 2, yHalf1, h / 2);
    let err = 0;
    for (let i = 0; i < n; i++) {
      const scale = 1 + Math.abs(y[i]) + Math.abs(yHalf2[i]);
      const e = Math.abs(yFull[i] - yHalf2[i]) / scale;
      if (e > err) err = e;
    }
    if (err > tol && h > hMin) {
      h = Math.max(hMin, h * 0.5);
      continue;
    }
    t = t + h;
    y = yHalf2;
    tStops.push(t);
    yStops.push(y.slice());
    if (err < tol * 0.05) h = Math.min(hMax, h * 2);
  }

  return resampleUniform(tStops, yStops, outPoints);
}

function resampleUniform(ts, ys, outPoints) {
  if (ts.length < 2) {
    return { ok: true, ts, ys, message: 'insufficient steps to resample' };
  }
  const t0 = ts[0];
  const tEnd = ts[ts.length - 1];
  const n = ys[0].length;
  const outTs = new Array(outPoints);
  const outYs = new Array(outPoints);
  let j = 0;
  for (let i = 0; i < outPoints; i++) {
    const t = t0 + ((tEnd - t0) * i) / (outPoints - 1);
    while (j < ts.length - 2 && ts[j + 1] < t) j++;
    const t1 = ts[j];
    const t2 = ts[j + 1];
    const frac = t2 === t1 ? 0 : (t - t1) / (t2 - t1);
    const row = new Array(n);
    for (let k = 0; k < n; k++) {
      row[k] = ys[j][k] + frac * (ys[j + 1][k] - ys[j][k]);
    }
    outTs[i] = t;
    outYs[i] = row;
  }
  return { ok: true, ts: outTs, ys: outYs, message: 'completed (adaptive)' };
}
