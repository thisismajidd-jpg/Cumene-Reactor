import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  Legend,
} from 'recharts';
import { PLOT_THEME, TOOLTIP_STYLE } from './PlotTheme.js';
import { useUnitSystem } from '../../../hooks/useUnitSystem.js';
import { useReactor } from '../../../hooks/useReactor.js';
import { fmt, fmtCompact } from '../../../utils/format.js';
import EmptyState from './EmptyState.jsx';

export default function ConversionTab({ result }) {
  const { state } = useReactor();
  const { label, toDisplay } = useUnitSystem();
  const traj = result?.trajectory;
  const basis = result?.basis ?? 'W';
  const target = state.conditions.XTarget;

  const data = useMemo(() => {
    if (!traj) return [];
    const dim = basis === 'W' ? 'weight' : 'volume';
    return traj.ts.map((t, i) => ({
      x: toDisplay(t, dim),
      X: traj.X[i],
    }));
  }, [traj, basis, toDisplay]);

  if (!traj) {
    return <EmptyState title="No trajectory" description="Run the solver to see conversion vs reactor size." />;
  }

  const xUnit = basis === 'W' ? label('weight') : label('volume');
  const Wreq = traj.summary.W_for_target;
  const WreqDisplay = Wreq != null ? toDisplay(Wreq, basis === 'W' ? 'weight' : 'volume') : null;

  return (
    <div className="space-y-4">
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 24, bottom: 24, left: 8 }}>
            <CartesianGrid stroke={PLOT_THEME.grid} strokeDasharray="3 5" />
            <XAxis
              dataKey="x"
              type="number"
              domain={['auto', 'auto']}
              tick={{ fill: PLOT_THEME.axis, fontSize: 11 }}
              axisLine={{ stroke: PLOT_THEME.grid }}
              tickLine={{ stroke: PLOT_THEME.grid }}
              tickFormatter={fmtCompact}
              label={{
                value: `${basis} [${xUnit}]`,
                position: 'insideBottom',
                offset: -10,
                fill: PLOT_THEME.axisLabel,
                fontSize: 12,
              }}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fill: PLOT_THEME.axis, fontSize: 11 }}
              axisLine={{ stroke: PLOT_THEME.grid }}
              tickLine={{ stroke: PLOT_THEME.grid }}
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
              labelFormatter={(v) => `${basis} = ${fmt(v, 4)} ${xUnit}`}
              formatter={(v) => [fmt(v, 4), 'X']}
            />
            <ReferenceLine
              y={target}
              stroke={PLOT_THEME.reference}
              strokeDasharray="4 3"
              label={{
                value: `target X = ${target}`,
                position: 'right',
                fill: PLOT_THEME.reference,
                fontSize: 11,
              }}
            />
            {WreqDisplay != null && (
              <ReferenceDot
                x={WreqDisplay}
                y={target}
                r={5}
                fill={PLOT_THEME.hotspot}
                stroke="#0B1220"
                strokeWidth={2}
              />
            )}
            <Line
              type="monotone"
              dataKey="X"
              stroke="#22D3EE"
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 4, fill: '#22D3EE', stroke: '#0B1220', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <Stat
          label={`Required ${basis} (X = ${target})`}
          value={WreqDisplay != null ? `${fmt(WreqDisplay, 4)} ${xUnit}` : '—'}
        />
        <Stat
          label="Final X"
          value={fmt(traj.summary.X_final, 4)}
        />
        <Stat
          label="Limiting species"
          value={traj.summary.limitingSpecies ?? '—'}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 num text-text-primary">{value}</div>
    </div>
  );
}
