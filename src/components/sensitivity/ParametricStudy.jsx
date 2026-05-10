import React, { useMemo, useState } from 'react';
import Card from '../ui/Card.jsx';
import Select from '../ui/Select.jsx';
import NumberInput from '../ui/NumberInput.jsx';
import Button from '../ui/Button.jsx';
import Spinner from '../ui/Spinner.jsx';
import Heatmap from './Heatmap.jsx';
import { useReactor } from '../../hooks/useReactor.js';
import { useUnitSystem } from '../../hooks/useUnitSystem.js';
import { buildSolverConfig } from '../../hooks/useSolver.js';
import { useParametricWorker } from '../../hooks/useParametricWorker.js';
import { fmtCompact } from '../../utils/format.js';

// Each axis option is stored / swept in SI base; UI converts using `dim`.
const AXIS_OPTIONS = [
  { id: 'feed.T0',     label: 'T_inlet',    dim: 'temperature' },
  { id: 'thermal.Ta',  label: 'T_coolant',  dim: 'temperature' },
  { id: 'thermal.Ua',  label: 'U·a / ρ_b',  dim: null, unit: 'W/(K·kg)' },
  { id: 'feed.P0',     label: 'P0',         dim: 'pressure' },
];

const METRICS = [
  { id: 'X',            label: 'Conversion X',          higherBetter: true  },
  { id: 'S',            label: 'Selectivity (final)',   higherBetter: true  },
  { id: 'T_hotspot',    label: 'Hotspot T',             higherBetter: false },
  { id: 'W_for_target', label: 'Required W for X_target', higherBetter: false },
];

export default function ParametricStudy() {
  const { state } = useReactor();
  const { label: unitLabel, toDisplay, fromDisplay } = useUnitSystem();
  const { runSweep, progress } = useParametricWorker();

  // Defaults are stored in SI; the UI presents them in the active system.
  const [axisX, setAxisX] = useState({ id: 'feed.T0',    from: 600, to: 660, n: 12 });
  const [axisY, setAxisY] = useState({ id: 'thermal.Ta', from: 580, to: 620, n: 12 });
  const [metric, setMetric] = useState('X');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onRun = async () => {
    setError(null);
    setResult(null);
    try {
      const baseConfig = buildSolverConfig(state);
      const out = await runSweep({
        baseConfig,
        axes: [
          { path: axisX.id, from: axisX.from, to: axisX.to, n: axisX.n },
          { path: axisY.id, from: axisY.from, to: axisY.to, n: axisY.n },
        ],
        metric,
      });
      setResult(out);
    } catch (err) {
      setError(err.message ?? String(err));
    }
  };

  const optX = AXIS_OPTIONS.find((o) => o.id === axisX.id);
  const optY = AXIS_OPTIONS.find((o) => o.id === axisY.id);
  const metricOpt = METRICS.find((m) => m.id === metric) ?? METRICS[0];

  const xUnit = optX?.dim ? unitLabel(optX.dim) : optX?.unit ?? '';
  const yUnit = optY?.dim ? unitLabel(optY.dim) : optY?.unit ?? '';
  const xLabel = `${optX?.label ?? axisX.id}${xUnit ? ` [${xUnit}]` : ''}`;
  const yLabel = `${optY?.label ?? axisY.id}${yUnit ? ` [${yUnit}]` : ''}`;
  const metricLabel = metricOpt.label;

  // Heatmap displays in the active unit system; convert grid axes if needed.
  const dispXs = useMemo(
    () => result?.xs.map((v) => (optX?.dim ? toDisplay(v, optX.dim) : v)) ?? [],
    [result, optX, toDisplay]
  );
  const dispYs = useMemo(
    () => result?.ys.map((v) => (optY?.dim ? toDisplay(v, optY.dim) : v)) ?? [],
    [result, optY, toDisplay]
  );

  // Find best (and worst) cell for the active metric.
  const extrema = useMemo(() => {
    if (!result?.grid) return null;
    let bi = -1, bj = -1, wi = -1, wj = -1;
    let best = -Infinity, worst = Infinity;
    const sign = metricOpt.higherBetter ? 1 : -1;
    for (let j = 0; j < result.grid.length; j++) {
      for (let i = 0; i < result.grid[j].length; i++) {
        const v = result.grid[j][i];
        if (!Number.isFinite(v)) continue;
        const score = sign * v;
        if (score > best) { best = score; bi = i; bj = j; }
        if (score < worst) { worst = score; wi = i; wj = j; }
      }
    }
    if (bi < 0) return null;
    return {
      best: { i: bi, j: bj, v: result.grid[bj][bi] },
      worst: { i: wi, j: wj, v: result.grid[wj][wi] },
    };
  }, [result, metricOpt]);

  return (
    <Card
      title="Parametric study"
      subtitle="Sweep two variables and visualize the response surface."
      action={
        <Button size="sm" onClick={onRun} disabled={!!progress}>
          {progress ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size={14} />
              {progress.i}/{progress.total}
            </span>
          ) : (
            'Run sweep'
          )}
        </Button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <AxisRow
          label="X axis"
          axis={axisX}
          setAxis={setAxisX}
          unitLabel={unitLabel}
          toDisplay={toDisplay}
          fromDisplay={fromDisplay}
        />
        <AxisRow
          label="Y axis"
          axis={axisY}
          setAxis={setAxisY}
          unitLabel={unitLabel}
          toDisplay={toDisplay}
          fromDisplay={fromDisplay}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Select
          label="Metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          options={METRICS.map((m) => ({ value: m.id, label: m.label }))}
        />
        <div className="text-xs text-text-muted self-end pb-2 sm:col-span-2">
          Worker runs n×n RK4 solves off the main thread.
        </div>
      </div>

      {error && <p className="text-sm text-state-danger">{error}</p>}

      {result ? (
        <div className="mt-4 space-y-3">
          <Heatmap
            grid={result.grid}
            xs={dispXs}
            ys={dispYs}
            xLabel={xLabel}
            yLabel={yLabel}
            metricLabel={metricLabel}
            colorScheme={metric === 'T_hotspot' ? 'rdylgn' : 'viridis'}
            highlight={extrema?.best ?? null}
            lowlight={extrema?.worst ?? null}
          />
          {extrema && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <ExtremumCard
                label="Best"
                tone="best"
                v={extrema.best.v}
                x={dispXs[extrema.best.i]}
                y={dispYs[extrema.best.j]}
                xUnit={xUnit}
                yUnit={yUnit}
                xName={optX?.label}
                yName={optY?.label}
                metricLabel={metricLabel}
                higherBetter={metricOpt.higherBetter}
              />
              <ExtremumCard
                label="Worst"
                tone="worst"
                v={extrema.worst.v}
                x={dispXs[extrema.worst.i]}
                y={dispYs[extrema.worst.j]}
                xUnit={xUnit}
                yUnit={yUnit}
                xName={optX?.label}
                yName={optY?.label}
                metricLabel={metricLabel}
                higherBetter={metricOpt.higherBetter}
              />
            </div>
          )}
        </div>
      ) : (
        !progress && (
          <p className="text-sm text-text-muted">
            Configure axes and click <strong>Run sweep</strong> to compute the heatmap.
          </p>
        )
      )}
    </Card>
  );
}

function AxisRow({ label, axis, setAxis, unitLabel, toDisplay, fromDisplay }) {
  const opt = AXIS_OPTIONS.find((o) => o.id === axis.id);
  const unit = opt?.dim ? unitLabel(opt.dim) : opt?.unit ?? '';
  const dispBound = (v) => (opt?.dim ? toDisplay(v, opt.dim) : v);
  const fromDisp = (v) => (opt?.dim ? fromDisplay(v, opt.dim) : v);
  return (
    <div className="rounded-md border border-border bg-bg-elevated p-3 space-y-2">
      <div className="field-label">{label}</div>
      <Select
        value={axis.id}
        onChange={(e) => setAxis({ ...axis, id: e.target.value })}
        options={AXIS_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
      />
      <div className="grid grid-cols-3 gap-2">
        <NumberInput
          label="From"
          value={dispBound(axis.from)}
          onValue={(v) => setAxis({ ...axis, from: v == null ? 0 : fromDisp(v) })}
          precision={5}
          unit={unit}
        />
        <NumberInput
          label="To"
          value={dispBound(axis.to)}
          onValue={(v) => setAxis({ ...axis, to: v == null ? 0 : fromDisp(v) })}
          precision={5}
          unit={unit}
        />
        <NumberInput
          label="n"
          value={axis.n}
          onValue={(v) => setAxis({ ...axis, n: Math.max(2, Math.round(v)) })}
          precision={0}
          unit="—"
          min={2}
          max={50}
        />
      </div>
    </div>
  );
}

function ExtremumCard({
  label, tone, v, x, y, xUnit, yUnit, xName, yName, metricLabel, higherBetter,
}) {
  const accent = tone === 'best' ? '#FACC15' : '#EF4444';
  const tagBg  = tone === 'best' ? 'bg-state-warning/10 border-state-warning/40 text-state-warning'
                                 : 'bg-state-danger/10 border-state-danger/40 text-state-danger';
  return (
    <div className="rounded-md border border-border bg-bg-elevated/40 px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className={[
          'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
          tagBg,
        ].join(' ')}>
          {label} · {higherBetter ? (tone === 'best' ? 'max' : 'min') : (tone === 'best' ? 'min' : 'max')}
        </span>
        <span className="num text-sm font-semibold" style={{ color: accent }}>
          {fmtCompact(v)}
        </span>
      </div>
      <div className="text-[11px] text-text-muted num space-y-0.5">
        <div>{metricLabel}</div>
        <div>
          {xName} = <span className="text-text-primary">{fmtCompact(x)} {xUnit}</span>
          {' · '}
          {yName} = <span className="text-text-primary">{fmtCompact(y)} {yUnit}</span>
        </div>
      </div>
    </div>
  );
}
