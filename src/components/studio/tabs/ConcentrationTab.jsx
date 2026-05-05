import React, { useMemo, useState } from 'react';
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
import { PLOT_THEME, TOOLTIP_STYLE, speciesColor } from './PlotTheme.js';
import { useUnitSystem } from '../../../hooks/useUnitSystem.js';
import { fmt, fmtCompact } from '../../../utils/format.js';
import EmptyState from './EmptyState.jsx';

export default function ConcentrationTab({ result }) {
  const { label, toDisplay } = useUnitSystem();
  const traj = result?.trajectory;
  const basis = result?.basis ?? 'W';
  const speciesIds = traj ? Object.keys(traj.C) : [];
  const [active, setActive] = useState(() => Object.fromEntries(speciesIds.map((s) => [s, true])));

  const data = useMemo(() => {
    if (!traj) return [];
    const dim = basis === 'W' ? 'weight' : 'volume';
    return traj.ts.map((t, i) => {
      const row = { x: toDisplay(t, dim) };
      for (const sp of speciesIds) {
        row[sp] = toDisplay(traj.C[sp][i], 'conc');
      }
      return row;
    });
  }, [traj, basis, toDisplay, speciesIds]);

  if (!traj) return <EmptyState title="No trajectory" />;

  const xUnit = basis === 'W' ? label('weight') : label('volume');
  const Cunit = label('conc');

  const toggle = (sp) => setActive((a) => ({ ...a, [sp]: !a[sp] }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {speciesIds.map((sp) => {
          const on = !!active[sp];
          const color = speciesColor(sp);
          return (
            <button
              key={sp}
              onClick={() => toggle(sp)}
              type="button"
              className={[
                'inline-flex items-center gap-1.5 px-2 h-7 rounded-full text-xs border transition-colors focus-ring',
                on
                  ? 'bg-bg-elevated border-border text-text-primary'
                  : 'bg-transparent border-border/60 text-text-muted line-through',
              ].join(' ')}
              aria-pressed={on}
            >
              <span
                aria-hidden
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: on ? color : 'transparent', boxShadow: `inset 0 0 0 1.5px ${color}` }}
              />
              C<sub>{sp}</sub>
            </button>
          );
        })}
      </div>

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
              tick={{ fill: PLOT_THEME.axis, fontSize: 11 }}
              axisLine={{ stroke: PLOT_THEME.grid }}
              tickFormatter={fmtCompact}
              label={{
                value: `C [${Cunit}]`,
                angle: -90,
                position: 'insideLeft',
                fill: PLOT_THEME.axisLabel,
                fontSize: 12,
              }}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={(v) => `${basis} = ${fmt(v, 4)} ${xUnit}`}
              formatter={(v, name) => [`${fmt(v, 4)} ${Cunit}`, name]}
            />
            {speciesIds.map((sp) =>
              active[sp] ? (
                <Line
                  key={sp}
                  type="monotone"
                  dataKey={sp}
                  stroke={speciesColor(sp)}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null
            )}
            <Legend
              verticalAlign="top"
              align="right"
              iconType="line"
              wrapperStyle={{ fontSize: 11, color: PLOT_THEME.axisLabel }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
