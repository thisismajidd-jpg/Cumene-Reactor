import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { PLOT_THEME, TOOLTIP_STYLE } from './PlotTheme.js';
import { fmt } from '../../../utils/format.js';
import { useReactor } from '../../../hooks/useReactor.js';
import EmptyState from './EmptyState.jsx';

export default function SelectivityTab({ result }) {
  const { state } = useReactor();
  const traj = result?.trajectory;
  const sideOn = (state.reaction.sides ?? []).length > 0;

  const data = useMemo(() => {
    if (!traj) return [];
    return traj.ts.map((_, i) => ({
      X: traj.X[i],
      S: traj.S[i],
    }));
  }, [traj]);

  if (!sideOn) {
    return (
      <EmptyState
        title="Single reaction"
        description="Enable a side reaction in step 1 to analyze selectivity."
      />
    );
  }
  if (!traj) return <EmptyState title="No trajectory" />;

  const sumFinal = traj.summary.S_final;

  return (
    <div className="space-y-4">
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 24, bottom: 24, left: 8 }}>
            <CartesianGrid stroke={PLOT_THEME.grid} strokeDasharray="3 5" />
            <XAxis
              dataKey="X"
              type="number"
              domain={[0, 1]}
              tick={{ fill: PLOT_THEME.axis, fontSize: 11 }}
              axisLine={{ stroke: PLOT_THEME.grid }}
              tickFormatter={(v) => v.toFixed(2)}
              label={{
                value: 'Conversion X',
                position: 'insideBottom',
                offset: -10,
                fill: PLOT_THEME.axisLabel,
                fontSize: 12,
              }}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fill: PLOT_THEME.axis, fontSize: 11 }}
              tickFormatter={(v) => v.toFixed(2)}
              label={{
                value: 'Selectivity S',
                angle: -90,
                position: 'insideLeft',
                fill: PLOT_THEME.axisLabel,
                fontSize: 12,
              }}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={(v) => `X = ${fmt(v, 4)}`}
              formatter={(v) => [fmt(v, 4), 'Selectivity']}
            />
            <Line
              type="monotone"
              dataKey="S"
              stroke="#10B981"
              strokeWidth={2.4}
              dot={false}
              isAnimationActive={false}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="line"
              wrapperStyle={{ fontSize: 11, color: PLOT_THEME.axisLabel }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 gap-3 text-sm">
        <Stat label="Selectivity (final)" value={fmt(sumFinal, 4)} />
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
