import React, { useState } from 'react';
import Card from '../ui/Card.jsx';
import Select from '../ui/Select.jsx';
import NumberInput from '../ui/NumberInput.jsx';
import Button from '../ui/Button.jsx';
import Spinner from '../ui/Spinner.jsx';
import Heatmap from './Heatmap.jsx';
import { useReactor } from '../../hooks/useReactor.js';
import { buildSolverConfig } from '../../hooks/useSolver.js';
import { useParametricWorker } from '../../hooks/useParametricWorker.js';

const AXIS_OPTIONS = [
  { id: 'feed.T0',     label: 'T_inlet [K]' },
  { id: 'thermal.Ta',  label: 'T_coolant [K]' },
  { id: 'thermal.Ua',  label: 'U·a (per kg) [W/(K·kg)]' },
  { id: 'feed.P0',     label: 'P0 [Pa]' },
  { id: 'feed.F0.A',   label: 'F0(A) [mol/s]' },
];

const METRICS = [
  { id: 'X',            label: 'Conversion X' },
  { id: 'S',            label: 'Selectivity (final)' },
  { id: 'Y',            label: 'Yield (final)' },
  { id: 'T_hotspot',    label: 'Hotspot T [K]' },
  { id: 'W_for_target', label: 'Required W for X_target' },
];

export default function ParametricStudy() {
  const { state } = useReactor();
  const { runSweep, progress } = useParametricWorker();
  const [axisX, setAxisX] = useState({ id: 'feed.T0', from: 600, to: 660, n: 12 });
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

  const xLabel = AXIS_OPTIONS.find((o) => o.id === axisX.id)?.label ?? axisX.id;
  const yLabel = AXIS_OPTIONS.find((o) => o.id === axisY.id)?.label ?? axisY.id;
  const metricLabel = METRICS.find((m) => m.id === metric)?.label ?? metric;

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
        <AxisRow label="X axis" axis={axisX} setAxis={setAxisX} />
        <AxisRow label="Y axis" axis={axisY} setAxis={setAxisY} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Select
          label="Metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          options={METRICS.map((m) => ({ value: m.id, label: m.label }))}
        />
        <div className="text-xs text-text-muted self-end pb-2">
          Worker runs n×n RK4 solves off the main thread.
        </div>
      </div>

      {error && <p className="text-sm text-state-danger">{error}</p>}

      {result ? (
        <div className="mt-4">
          <Heatmap
            grid={result.grid}
            xs={result.xs}
            ys={result.ys}
            xLabel={xLabel}
            yLabel={yLabel}
            metricLabel={metricLabel}
            colorScheme={metric === 'T_hotspot' ? 'rdylgn' : 'viridis'}
          />
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

function AxisRow({ label, axis, setAxis }) {
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
          value={axis.from}
          onValue={(v) => setAxis({ ...axis, from: v })}
          precision={5}
        />
        <NumberInput
          label="To"
          value={axis.to}
          onValue={(v) => setAxis({ ...axis, to: v })}
          precision={5}
        />
        <NumberInput
          label="n"
          value={axis.n}
          onValue={(v) => setAxis({ ...axis, n: Math.max(2, Math.round(v)) })}
          precision={0}
          min={2}
          max={50}
        />
      </div>
    </div>
  );
}
