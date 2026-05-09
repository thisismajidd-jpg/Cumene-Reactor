import React, { useEffect, useState } from 'react';
import Card from '../ui/Card.jsx';
import Select from '../ui/Select.jsx';
import NumberInput from '../ui/NumberInput.jsx';
import Button from '../ui/Button.jsx';
import Spinner from '../ui/Spinner.jsx';
import { useReactor } from '../../hooks/useReactor.js';
import { useUnitSystem } from '../../hooks/useUnitSystem.js';
import { buildSolverConfig } from '../../hooks/useSolver.js';
import { solveReactor } from '../../solver/index.js';
import { gridSearch1D, nelderMead } from '../../solver/optimizer.js';
import { fmt } from '../../utils/format.js';

// Each KNOB declares the SI-state path, a display label, a dimension for
// unit conversion (or null when no dimension applies), and SI bounds defaults.
const KNOBS = [
  { id: 'feed.T0',    label: 'T_inlet',    dim: 'temperature', defaults: { lo: 580, hi: 670 } },
  { id: 'thermal.Ta', label: 'T_coolant',  dim: 'temperature', defaults: { lo: 560, hi: 640 } },
  { id: 'thermal.Ua', label: 'U·a / ρ_b',  dim: null, unit: 'W/(K·kg)', defaults: { lo: 1, hi: 60 } },
];

// Each objective has a `scale` used to normalize before combining two of them.
// `higherBetter: true`  → score = +v / scale
// `higherBetter: false` → score = -v / scale
// Scales are loose; small differences are smoothed by the weight slider.
const OBJECTIVES = [
  { id: 'maxS', label: 'Selectivity (S)',     metric: 'S',            higherBetter: true,  scale: 1   },
  { id: 'maxY', label: 'Yield (Y)',           metric: 'Y',            higherBetter: true,  scale: 1   },
  { id: 'maxX', label: 'Conversion (X)',      metric: 'X',            higherBetter: true,  scale: 1   },
  { id: 'minW', label: 'Required W (low)',    metric: 'W_for_target', higherBetter: false, scale: 50  },
  { id: 'minT', label: 'Hotspot T (low)',     metric: 'T_hotspot',    higherBetter: false, scale: 100 },
];
const NONE = { id: 'none', label: '— None —' };

const SECONDARY_OPTIONS = [{ value: 'none', label: NONE.label }, ...OBJECTIVES.map((o) => ({ value: o.id, label: o.label }))];

export default function OptimizerPanel() {
  const { state, set } = useReactor();
  const { label: unitLabel, toDisplay, fromDisplay } = useUnitSystem();
  const [knobIds, setKnobIds] = useState(['feed.T0']);
  const [primaryId, setPrimaryId] = useState('maxS');
  const [secondaryId, setSecondaryId] = useState('none');
  const [weight, setWeight] = useState(0.5);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [bounds, setBounds] = useState(() => {
    const out = {};
    for (const k of KNOBS) out[k.id] = { lo: k.defaults.lo, hi: k.defaults.hi };
    return out;
  });

  // Seed bounds for newly-selected knobs without clobbering existing edits.
  useEffect(() => {
    setBounds((cur) => {
      const next = { ...cur };
      for (const id of knobIds) {
        if (!next[id]) {
          const k = KNOBS.find((kk) => kk.id === id);
          next[id] = { lo: k?.defaults.lo ?? 0, hi: k?.defaults.hi ?? 1 };
        }
      }
      return next;
    });
  }, [knobIds]);

  const primary = OBJECTIVES.find((o) => o.id === primaryId);
  const secondary = secondaryId === 'none'
    ? null
    : OBJECTIVES.find((o) => o.id === secondaryId);
  const isMulti = !!secondary;

  const c = state.constraints;
  const hasActiveConstraints = Object.values(c).some((v) => v != null);

  const run = () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setTimeout(() => {
      try {
        const baseConfig = buildSolverConfig(state);

        // Combined objective the optimizer maximizes (always higher = better).
        const f = (params) => {
          const cfg = JSON.parse(JSON.stringify(baseConfig));
          knobIds.forEach((id, i) => setPath(cfg, id, params[i]));
          // Clamp params inside bounds so Nelder-Mead can't escape the box.
          for (let i = 0; i < params.length; i++) {
            const b = bounds[knobIds[i]];
            if (params[i] < b.lo - 1e-9 || params[i] > b.hi + 1e-9) {
              return { ok: false };
            }
          }
          const r = solveReactor(cfg);
          if (!r?.ok || !r.trajectory) return { ok: false };
          const v1 = extractMetric(r, primary.metric);
          const v2 = secondary ? extractMetric(r, secondary.metric) : null;
          if (!Number.isFinite(v1)) return { ok: false };
          if (secondary && !Number.isFinite(v2)) return { ok: false };

          const s1 = score(primary, v1);
          const s2 = secondary ? score(secondary, v2) : 0;
          // (1 − w) primary + w secondary  → equal at w = 0.5
          const combined = secondary
            ? (1 - weight) * s1 + weight * s2
            : s1;

          const penalty = constraintPenalty(r, c);
          return {
            ok: true,
            value: combined - penalty,
            raw: { v1, v2, combined, score1: s1, score2: s2 },
          };
        };

        let bestParams;
        if (knobIds.length === 1) {
          const id = knobIds[0];
          const b = bounds[id];
          const grid = gridSearch1D(f, b.lo, b.hi, 30, { minimize: false });
          if (grid?.x == null) throw new Error('No feasible point found.');
          bestParams = [grid.x];
        } else {
          const start = knobIds.map((id) => 0.5 * (bounds[id].lo + bounds[id].hi));
          const nm = nelderMead(f, start, { minimize: false, maxIter: 100 });
          bestParams = nm.x.map((x, i) => {
            const b = bounds[knobIds[i]];
            return Math.min(Math.max(x, b.lo), b.hi);
          });
        }

        const optimal = f(bestParams);
        if (!optimal?.ok) throw new Error('Optimizer landed on an infeasible point.');
        setResult({
          params: bestParams,
          v1: optimal.raw.v1,
          v2: optimal.raw.v2,
          combined: optimal.raw.combined,
        });
      } catch (err) {
        setError(err.message ?? String(err));
      } finally {
        setRunning(false);
      }
    }, 0);
  };

  const apply = () => {
    if (!result) return;
    knobIds.forEach((id, i) => {
      const value = result.params[i];
      if (id === 'feed.T0') set.conditions({ T_inlet: value });
      else if (id === 'feed.P0') set.conditions({ P0: value });
      else if (id === 'thermal.Ta') set.nonIso({ Ta: value });
      else if (id === 'thermal.Ua') set.nonIso({ U: value });
    });
  };

  const dispBound = (id, v) => {
    const k = KNOBS.find((kk) => kk.id === id);
    return k?.dim ? toDisplay(v, k.dim) : v;
  };
  const fromDispBound = (id, v) => {
    const k = KNOBS.find((kk) => kk.id === id);
    return k?.dim ? fromDisplay(v, k.dim) : v;
  };
  const knobUnit = (id) => {
    const k = KNOBS.find((kk) => kk.id === id);
    if (k?.dim) return unitLabel(k.dim);
    return k?.unit ?? '';
  };

  return (
    <Card
      title="Optimizer"
      subtitle={
        isMulti
          ? 'Search for the parameter set that balances two objectives.'
          : 'Search for the parameter set that meets your objective.'
      }
      action={
        <Button size="sm" onClick={run} disabled={running || knobIds.length === 0}>
          {running ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size={14} />
              Searching…
            </span>
          ) : (
            'Optimize'
          )}
        </Button>
      }
    >
      {/* ── Objectives ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Select
          label="Primary objective"
          value={primaryId}
          onChange={(e) => setPrimaryId(e.target.value)}
          options={OBJECTIVES.map((o) => ({
            value: o.id,
            label: `${o.higherBetter ? 'Max ' : 'Min '}${o.label}`,
          }))}
        />
        <Select
          label="Secondary objective (optional)"
          value={secondaryId}
          onChange={(e) => setSecondaryId(e.target.value)}
          options={SECONDARY_OPTIONS.map((o) =>
            o.value === 'none'
              ? o
              : (() => {
                  const oo = OBJECTIVES.find((x) => x.id === o.value);
                  return { value: o.value, label: `${oo.higherBetter ? 'Max ' : 'Min '}${oo.label}` };
                })(),
          )}
        />
      </div>

      {/* ── Weight slider ────────────────────────────────────────────── */}
      {isMulti && (
        <div className="rounded-md border border-border bg-bg-elevated/40 p-3 mb-3">
          <div className="flex items-baseline justify-between mb-2 text-xs">
            <span className="field-label">Trade-off weight</span>
            <span className="num text-accent-cyan">
              {((1 - weight) * 100).toFixed(0)}% primary · {(weight * 100).toFixed(0)}% secondary
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={weight}
            onChange={(e) => setWeight(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-bg-elevated rounded-full appearance-none cursor-pointer accent-cyan-400"
            style={{
              accentColor: '#22D3EE',
              background: `linear-gradient(to right, #22D3EE ${(1 - weight) * 100}%, #15203A ${(1 - weight) * 100}%)`,
            }}
          />
          <div className="flex justify-between text-[10px] text-text-muted mt-1.5">
            <span>{primary?.label}</span>
            <span>balanced</span>
            <span>{secondary?.label}</span>
          </div>
        </div>
      )}

      {/* ── Knobs ───────────────────────────────────────────────────── */}
      <div className="mb-3">
        <p className="field-label mb-2">Decision variables</p>
        <div className="flex flex-wrap gap-2">
          {KNOBS.map((k) => {
            const on = knobIds.includes(k.id);
            return (
              <button
                key={k.id}
                type="button"
                onClick={() =>
                  setKnobIds((cur) =>
                    cur.includes(k.id) ? cur.filter((x) => x !== k.id) : [...cur, k.id]
                  )
                }
                className={[
                  'px-2.5 h-7 rounded-full text-xs border transition-colors focus-ring',
                  on
                    ? 'bg-accent-cyan/15 border-accent-cyan/50 text-accent-cyan'
                    : 'bg-bg-elevated border-border text-text-muted hover:border-border-strong',
                ].join(' ')}
              >
                {on && <span className="mr-1">✓</span>}
                {k.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bounds editor ───────────────────────────────────────────── */}
      {knobIds.length > 0 && (
        <div className="rounded-md border border-border bg-bg-elevated/40 p-3 mb-3">
          <p className="field-label mb-3">Search bounds</p>
          <div className="space-y-3">
            {knobIds.map((id) => {
              const k = KNOBS.find((kk) => kk.id === id);
              if (!k) return null;
              const b = bounds[id] ?? { lo: 0, hi: 1 };
              const u = knobUnit(id);
              return (
                <div key={id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-4 text-sm text-text-primary self-center">
                    {k.label}
                  </div>
                  <NumberInput
                    className="col-span-6 sm:col-span-4"
                    label="From"
                    value={dispBound(id, b.lo)}
                    onValue={(v) =>
                      setBounds((cur) => ({
                        ...cur,
                        [id]: { ...cur[id], lo: v == null ? 0 : fromDispBound(id, v) },
                      }))
                    }
                    unit={u}
                    precision={5}
                  />
                  <NumberInput
                    className="col-span-6 sm:col-span-4"
                    label="To"
                    value={dispBound(id, b.hi)}
                    onValue={(v) =>
                      setBounds((cur) => ({
                        ...cur,
                        [id]: { ...cur[id], hi: v == null ? 0 : fromDispBound(id, v) },
                      }))
                    }
                    unit={u}
                    precision={5}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Constraints note ────────────────────────────────────────── */}
      <div className="rounded-md border border-border bg-bg-elevated/40 p-3 mb-3 text-xs text-text-muted">
        {hasActiveConstraints ? (
          <>
            <span className="text-accent-cyan font-medium">
              Design constraints respected:
            </span>{' '}
            {summarizeConstraints(c)}
          </>
        ) : (
          <>
            No active design constraints. Set them in step 4 of the Studio to
            penalize infeasible regions during the search.
          </>
        )}
      </div>

      {error && <p className="text-sm text-state-danger mb-2">{error}</p>}

      {/* ── Results ─────────────────────────────────────────────────── */}
      {result && (
        <div className="rounded-md border border-accent-cyan/40 bg-accent-cyan/5 px-4 py-3 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <div className="field-label text-text-muted">Primary</div>
              <div className="num text-text-primary">
                {primary?.label}: <span className="text-accent-cyan">{fmt(result.v1, 5)}</span>
              </div>
            </div>
            {secondary && (
              <div>
                <div className="field-label text-text-muted">Secondary</div>
                <div className="num text-text-primary">
                  {secondary.label}:{' '}
                  <span className="text-accent-teal">{fmt(result.v2, 5)}</span>
                </div>
              </div>
            )}
            <div>
              <div className="field-label text-text-muted">Combined score</div>
              <div className="num text-state-success">{fmt(result.combined, 5)}</div>
            </div>
          </div>
          <div className="border-t border-accent-cyan/20 pt-2">
            <p className="field-label text-accent-cyan mb-1.5">Best knobs</p>
            <ul className="text-sm space-y-1">
              {knobIds.map((id, i) => {
                const k = KNOBS.find((kk) => kk.id === id);
                const v = result.params[i];
                const display = k?.dim ? toDisplay(v, k.dim) : v;
                const u = knobUnit(id);
                return (
                  <li key={id} className="flex items-baseline justify-between gap-3">
                    <span className="text-text-muted">{k?.label ?? id}</span>
                    <span className="num text-text-primary whitespace-nowrap">
                      {fmt(display, 5)}
                      {u && <span className="ml-1 text-text-muted text-xs">{u}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <Button variant="outline" size="sm" onClick={apply} className="w-full">
            Apply to studio
          </Button>
        </div>
      )}
    </Card>
  );
}

// ── helpers ────────────────────────────────────────────────────────────
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
  if (!result?.trajectory) return NaN;
  switch (metric) {
    case 'X':            return result.trajectory.summary.X_final;
    case 'S':            return result.trajectory.summary.S_final;
    case 'Y':            return result.trajectory.summary.Y_final;
    case 'W_for_target': return result.trajectory.summary.W_for_target ?? NaN;
    case 'T_hotspot':    return result.trajectory.summary.T_hotspot;
    default:             return NaN;
  }
}

// Normalised "higher = better" score for an objective metric.
function score(obj, value) {
  if (!Number.isFinite(value)) return -Infinity;
  return (obj.higherBetter ? value : -value) / obj.scale;
}

function constraintPenalty(result, c) {
  if (!result?.trajectory?.summary) return 0;
  const s = result.trajectory.summary;
  let pen = 0;
  if (c.Tmax != null && s.T_hotspot > c.Tmax) pen += 100 * (s.T_hotspot - c.Tmax);
  if (c.Tmin != null && s.T_final  < c.Tmin) pen += 100 * (c.Tmin - s.T_final);
  if (c.Smin != null && s.S_final  < c.Smin) pen += 1000 * (c.Smin - s.S_final);
  if (c.Xmin != null && s.X_final  < c.Xmin) pen += 1000 * (c.Xmin - s.X_final);
  if (c.Ymin != null && s.Y_final  < c.Ymin) pen += 1000 * (c.Ymin - s.Y_final);
  return pen;
}

function summarizeConstraints(c) {
  const parts = [];
  if (c.Tmax != null)  parts.push('Tmax');
  if (c.Tmin != null)  parts.push('Tmin');
  if (c.dTmax != null) parts.push('ΔTmax');
  if (c.Wmax != null)  parts.push('Wmax');
  if (c.Vmax != null)  parts.push('Vmax');
  if (c.Pmin != null)  parts.push('Pmin');
  if (c.dPmax != null) parts.push('ΔPmax');
  if (c.Xmin != null)  parts.push('Xmin');
  if (c.Xmax != null)  parts.push('Xmax');
  if (c.Ymin != null)  parts.push('Ymin');
  if (c.Smin != null)  parts.push('Smin');
  return parts.join(' · ');
}
