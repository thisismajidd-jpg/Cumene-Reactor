// Lightweight optimization helpers used by the Sensitivity & Optimization panel.
//
// All optimizers operate on a scalar objective `f(params) -> { ok, value }`,
// where `params` is a 1D array. Constraints are enforced inside `f` (return
// `{ ok: false }` to signal infeasibility — those points are skipped).
//
// Provided:
//   - gridSearch1D / gridSearch2D
//   - goldenSection (1-D, requires bracket)
//   - nelderMead   (n-D, simple, no derivatives)

/** Coarse 1-D grid scan; returns { x, fx, history }. */
export function gridSearch1D(f, lo, hi, n = 40, opts = {}) {
  const minimize = opts.minimize !== false;
  const history = [];
  let best = null;
  for (let i = 0; i < n; i++) {
    const x = lo + ((hi - lo) * i) / (n - 1);
    const r = f([x]);
    if (!r?.ok) continue;
    history.push({ x, value: r.value });
    if (
      best == null ||
      (minimize ? r.value < best.value : r.value > best.value)
    ) {
      best = { x, value: r.value };
    }
  }
  return { ...best, history };
}

/** 2-D grid scan; returns { i, j, x, y, value, grid: number[][] }. */
export function gridSearch2D(f, [loX, hiX], [loY, hiY], [nx, ny], opts = {}) {
  const minimize = opts.minimize !== false;
  const grid = Array.from({ length: ny }, () => new Array(nx).fill(NaN));
  let best = null;
  for (let j = 0; j < ny; j++) {
    const y = loY + ((hiY - loY) * j) / (ny - 1);
    for (let i = 0; i < nx; i++) {
      const x = loX + ((hiX - loX) * i) / (nx - 1);
      const r = f([x, y]);
      if (!r?.ok) continue;
      grid[j][i] = r.value;
      if (best == null || (minimize ? r.value < best.value : r.value > best.value)) {
        best = { i, j, x, y, value: r.value };
      }
    }
  }
  return { ...best, grid, ranges: { x: [loX, hiX], y: [loY, hiY], n: [nx, ny] } };
}

/** Golden-section 1-D refinement on a known unimodal bracket. */
export function goldenSection(f, lo, hi, opts = {}) {
  const minimize = opts.minimize !== false;
  const tol = opts.tol ?? 1e-4;
  const phi = (1 + Math.sqrt(5)) / 2;
  let a = lo;
  let b = hi;
  let c = b - (b - a) / phi;
  let d = a + (b - a) / phi;
  let fc = f([c])?.value;
  let fd = f([d])?.value;
  while (Math.abs(b - a) > tol) {
    const cBetter = minimize ? fc < fd : fc > fd;
    if (cBetter) {
      b = d;
      d = c;
      fd = fc;
      c = b - (b - a) / phi;
      fc = f([c])?.value;
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + (b - a) / phi;
      fd = f([d])?.value;
    }
  }
  const x = (a + b) / 2;
  const r = f([x]);
  return { x, value: r?.value, iterations: null };
}

/** Vanilla Nelder-Mead — small, no dependencies. */
export function nelderMead(f, x0, opts = {}) {
  const minimize = opts.minimize !== false;
  const tol = opts.tol ?? 1e-4;
  const maxIter = opts.maxIter ?? 200;
  const sign = minimize ? 1 : -1;

  const evaluate = (x) => {
    const r = f(x);
    return r?.ok ? sign * r.value : Infinity;
  };

  const n = x0.length;
  const step = opts.step ?? x0.map((v) => Math.max(0.05 * Math.abs(v), 0.05));
  let simplex = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const p = x0.slice();
    p[i] += step[i];
    simplex.push(p);
  }
  let f_simplex = simplex.map(evaluate);

  for (let iter = 0; iter < maxIter; iter++) {
    const order = simplex
      .map((_, i) => i)
      .sort((a, b) => f_simplex[a] - f_simplex[b]);
    simplex = order.map((i) => simplex[i]);
    f_simplex = order.map((i) => f_simplex[i]);

    if (f_simplex[n] - f_simplex[0] < tol) break;

    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;
    }

    const reflected = centroid.map((c, j) => c + (c - simplex[n][j]));
    const fr = evaluate(reflected);
    if (fr < f_simplex[0]) {
      const expanded = centroid.map((c, j) => c + 2 * (c - simplex[n][j]));
      const fe = evaluate(expanded);
      if (fe < fr) {
        simplex[n] = expanded;
        f_simplex[n] = fe;
      } else {
        simplex[n] = reflected;
        f_simplex[n] = fr;
      }
    } else if (fr < f_simplex[n - 1]) {
      simplex[n] = reflected;
      f_simplex[n] = fr;
    } else {
      const contracted = centroid.map((c, j) => c + 0.5 * (simplex[n][j] - c));
      const fk = evaluate(contracted);
      if (fk < f_simplex[n]) {
        simplex[n] = contracted;
        f_simplex[n] = fk;
      } else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[0].map((c, j) => c + 0.5 * (simplex[i][j] - c));
          f_simplex[i] = evaluate(simplex[i]);
        }
      }
    }
  }
  return {
    x: simplex[0],
    value: sign * f_simplex[0],
    iterations: null,
  };
}
