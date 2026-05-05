import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Spinner from '../ui/Spinner.jsx';
import { PLOT_THEME, TOOLTIP_STYLE } from '../studio/tabs/PlotTheme.js';
import { solveReactor } from '../../solver/index.js';
import { fmt } from '../../utils/format.js';
import { buildSolverConfig } from '../../hooks/useSolver.js';
import { useReactor } from '../../hooks/useReactor.js';

/**
 * Bifurcation: sweep CSTR volume; for each V, every detected steady state
 * contributes a point at (V, X). With three roots the result traces an
 * S-curve.
 */
export default function BifurcationDiagram() {
  const { state } = useReactor();
  const [running, setRunning] = useState(false);
  const [data, setData] = useState(null);

  const onRun = () => {
    if (state.reactor.type !== 'CSTR') return;
    setRunning(true);
    setTimeout(() => {
      const baseConfig = buildSolverConfig(state);
      const Vs = linspace(0.05, 20, 50);
      const points = [];
      for (const V of Vs) {
        const cfg = JSON.parse(JSON.stringify(baseConfig));
        cfg.reactor.V = V;
        const r = solveReactor(cfg);
        if (!r?.ok || !r.cstr?.solutions) continue;
        for (let k = 0; k < r.cstr.solutions.length; k++) {
          points.push({
            V,
            X: r.cstr.solutions[k].X ?? 0,
            branch: r.cstr.solutions.length === 1 ? 'single' : k === 0 ? 'low' : k === 1 ? 'mid' : 'high',
          });
        }
      }
      setData(points);
      setRunning(false);
    }, 0);
  };

  const grouped = useMemo(() => {
    if (!data) return null;
    const by = (b) => data.filter((p) => p.branch === b);
    return { single: by('single'), low: by('low'), mid: by('mid'), high: by('high') };
  }, [data]);

  if (state.reactor.type !== 'CSTR') {
    return null;
  }

  return (
    <Card
      title="Bifurcation diagram"
      subtitle="Steady-state X vs reactor volume V — multiple intersections indicate multiplicity."
      action={
        <Button size="sm" onClick={onRun} disabled={running}>
          {running ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size={14} />
              Sweeping…
            </span>
          ) : (
            'Sweep V'
          )}
        </Button>
      }
    >
      {!grouped ? (
        <p className="text-sm text-text-muted">
          Click <strong>Sweep V</strong> to compute steady states across volumes 0.05 → 20 m³.
        </p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 10, right: 24, bottom: 24, left: 8 }}>
              <CartesianGrid stroke={PLOT_THEME.grid} strokeDasharray="3 5" />
              <XAxis
                type="number"
                dataKey="V"
                tick={{ fill: PLOT_THEME.axis, fontSize: 11 }}
                axisLine={{ stroke: PLOT_THEME.grid }}
                label={{
                  value: 'V [m³]',
                  position: 'insideBottom',
                  offset: -10,
                  fill: PLOT_THEME.axisLabel,
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="X"
                domain={[0, 1]}
                tick={{ fill: PLOT_THEME.axis, fontSize: 11 }}
                axisLine={{ stroke: PLOT_THEME.grid }}
                tickFormatter={(v) => v.toFixed(2)}
                label={{
                  value: 'Conversion X',
                  angle: -90,
                  position: 'insideLeft',
                  fill: PLOT_THEME.axisLabel,
                  fontSize: 12,
                }}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value, name) => [fmt(value, 4), name]}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ fontSize: 11, color: PLOT_THEME.axisLabel }}
              />
              <Scatter name="Single SS" data={grouped.single} fill="#22D3EE" />
              <Scatter name="Low branch" data={grouped.low} fill="#10B981" />
              <Scatter name="Unstable" data={grouped.mid} fill="#F59E0B" />
              <Scatter name="High branch" data={grouped.high} fill="#EF4444" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function linspace(a, b, n) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = a + ((b - a) * i) / (n - 1);
  return out;
}
