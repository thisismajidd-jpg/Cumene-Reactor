import React, { useState } from 'react';
import Card from '../ui/Card.jsx';
import Select from '../ui/Select.jsx';
import NumberInput from '../ui/NumberInput.jsx';
import Button from '../ui/Button.jsx';
import Spinner from '../ui/Spinner.jsx';
import { useReactor } from '../../hooks/useReactor.js';
import { buildSolverConfig } from '../../hooks/useSolver.js';
import { solveReactor } from '../../solver/index.js';
import { gridSearch1D, nelderMead } from '../../solver/optimizer.js';
import { fmt } from '../../utils/format.js';

const KNOBS = [
  { id: 'feed.T0', label: 'T_inlet [K]', defaults: { lo: 580, hi: 670 } },
  { id: 'thermal.Ta', label: 'T_coolant [K]', defaults: { lo: 560, hi: 640 } },
  { id: 'thermal.Ua', label: 'U·a/ρ_b', defaults: { lo: 1, hi: 60 } },
  { id: 'feed.F0.A', label: 'F0(A) [mol/s]', defaults: { lo: 0.005, hi: 0.06 } },
];

const OBJECTIVES = [
  { id: 'maxS', label: 'Maximize selectivity', metric: 'S', maximize: true },
  { id: 'maxY', label: 'Maximize yield', metric: 'Y', maximize: true },
  { id: 'minW', label: 'Minimize required W', metric: 'W_for_target', maximize: false },
  { id: 'maxX', label: 'Maximize conversion', metric: 'X', maximize: true },
];

export default function OptimizerPanel() {
  const { state, set } = useReactor();
  const [knobIds, setKnobIds] = useState(['feed.T0']);
  const [objective, setObjective] = useState('maxS');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const obj = OBJECTIVES.find((o) => o.id === objective);

  const run = () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setTimeout(() => {
      try {
        const baseConfig = buildSolverConfig(state);
        const f = (params) => {
          const cfg = JSON.parse(JSON.stringify(baseConfig));
          knobIds.forEach((id, i) => setPath(cfg, id, params[i]));
          const r = solveReactor(cfg);
          if (!r?.ok || !r.trajectory) return { ok: false };
          const v = extractMetric(r, obj.metric);
          if (!Number.isFinite(v)) return { ok: false };
          return { ok: true, value: v };
        };
        let bestParams = knobIds.map((id) => deepGet(baseConfig, id) ?? 1);
        if (knobIds.length === 1) {
          const knob = KNOBS.find((k) => k.id === knobIds[0]);
          const grid = gridSearch1D(f, knob.defaults.lo, knob.defaults.hi, 30, {
            minimize: !obj.maximize,
          });
          bestParams = [grid.x];
        } else {
          const start = bestParams.slice();
          const nm = nelderMead(f, start, { minimize: !obj.maximize, maxIter: 80 });
          bestParams = nm.x;
        }
        const optimal = f(bestParams);
        setResult({ params: bestParams, value: optimal.value });
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
      // Map known paths back into the global state.
      if (id === 'feed.T0') set.conditions({ T_inlet: value });
      else if (id === 'feed.P0') set.conditions({ P0: value });
      else if (id === 'thermal.Ta') set.nonIso({ Ta: value });
      else if (id === 'thermal.Ua') set.nonIso({ U: value });
      else if (id.startsWith('feed.F0.')) {
        const sp = id.split('.').pop();
        set.feed({ [sp]: value });
      }
    });
  };

  return (
    <Card
      title="Optimizer"
      subtitle="Search for the parameter set that meets your objective."
      action={
        <Button size="sm" onClick={run} disabled={running}>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Select
          label="Objective"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          options={OBJECTIVES.map((o) => ({ value: o.id, label: o.label }))}
        />
        <div>
          <p className="field-label mb-2">Knobs</p>
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
                    'px-2 h-7 rounded-full text-xs border transition-colors focus-ring',
                    on
                      ? 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan'
                      : 'bg-bg-elevated border-border text-text-muted',
                  ].join(' ')}
                >
                  {k.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-state-danger">{error}</p>}

      {result && (
        <div className="rounded-md border border-accent-cyan/40 bg-accent-cyan/5 px-4 py-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="field-label text-accent-cyan">Optimum</span>
            <span className="num text-accent-cyan">{fmt(result.value, 5)}</span>
          </div>
          <ul className="text-sm space-y-1">
            {knobIds.map((id, i) => {
              const k = KNOBS.find((kk) => kk.id === id);
              return (
                <li key={id} className="flex items-baseline justify-between">
                  <span className="text-text-muted">{k?.label ?? id}</span>
                  <span className="num text-text-primary">{fmt(result.params[i], 5)}</span>
                </li>
              );
            })}
          </ul>
          <Button variant="outline" size="sm" onClick={apply} className="w-full">
            Apply to studio
          </Button>
        </div>
      )}
    </Card>
  );
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

function deepGet(obj, path) {
  const keys = path.split('.');
  let cur = obj;
  for (const k of keys) {
    if (cur == null) return undefined;
    cur = cur[k];
  }
  return cur;
}

function extractMetric(result, metric) {
  if (!result?.trajectory) return NaN;
  switch (metric) {
    case 'X':
      return result.trajectory.summary.X_final;
    case 'S':
      return result.trajectory.summary.S_final;
    case 'Y':
      return result.trajectory.summary.Y_final;
    case 'W_for_target':
      return result.trajectory.summary.W_for_target ?? NaN;
    case 'T_hotspot':
      return result.trajectory.summary.T_hotspot;
    default:
      return NaN;
  }
}
