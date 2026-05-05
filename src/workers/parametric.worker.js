// Web Worker that runs a 2-D parametric sweep without blocking the UI.
//
// Message protocol (postMessage from main):
//   { type: 'sweep',
//     baseConfig,                     // solveReactor config from buildSolverConfig
//     axes: [
//       { path: 'feed.T0', from: 600, to: 660, n: 12 },
//       { path: 'thermal.Ta', from: 580, to: 620, n: 12 },
//     ],
//     metric: 'X' | 'S' | 'Y' | 'T_hotspot' | 'W_for_target',
//   }
//
// Worker emits progress events:
//   { type: 'progress', i, total }
//   { type: 'done', grid: number[][], xs, ys, axisLabels, metric }
//   { type: 'error', message }

import { solveReactor } from '../solver/index.js';

self.addEventListener('message', (e) => {
  const msg = e.data;
  if (msg?.type !== 'sweep') return;
  try {
    const { baseConfig, axes, metric } = msg;
    const [ax0, ax1] = axes;
    const xs = linspace(ax0.from, ax0.to, ax0.n);
    const ys = linspace(ax1.from, ax1.to, ax1.n);
    const grid = Array.from({ length: ys.length }, () => new Array(xs.length).fill(NaN));
    const total = xs.length * ys.length;
    let i = 0;

    for (let jy = 0; jy < ys.length; jy++) {
      for (let ix = 0; ix < xs.length; ix++) {
        const cfg = JSON.parse(JSON.stringify(baseConfig));
        setPath(cfg, ax0.path, xs[ix]);
        setPath(cfg, ax1.path, ys[jy]);
        const result = solveReactor(cfg);
        grid[jy][ix] = extractMetric(result, metric);
        i++;
        if (i % 8 === 0 || i === total) {
          self.postMessage({ type: 'progress', i, total });
        }
      }
    }

    self.postMessage({
      type: 'done',
      grid,
      xs,
      ys,
      axisLabels: [ax0.path, ax1.path],
      metric,
    });
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err?.message ?? err) });
  }
});

function linspace(a, b, n) {
  if (n <= 1) return [a];
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = a + ((b - a) * i) / (n - 1);
  return out;
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function extractMetric(result, metric) {
  if (!result?.ok) return NaN;
  if (result.reactorType === 'CSTR') {
    const s = result.cstr?.solutions?.[0];
    if (!s) return NaN;
    if (metric === 'X') return s.X ?? NaN;
    return NaN;
  }
  const tr = result.trajectory;
  if (!tr) return NaN;
  switch (metric) {
    case 'X':
      return tr.summary.X_final;
    case 'S':
      return tr.summary.S_final;
    case 'Y':
      return tr.summary.Y_final;
    case 'T_hotspot':
      return tr.summary.T_hotspot;
    case 'W_for_target':
      return tr.summary.W_for_target ?? NaN;
    default:
      return tr.summary.X_final;
  }
}
