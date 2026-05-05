import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
} from 'recharts';
import { PLOT_THEME, TOOLTIP_STYLE } from './PlotTheme.js';
import { useUnitSystem } from '../../../hooks/useUnitSystem.js';
import { useReactor } from '../../../hooks/useReactor.js';
import { fmt, fmtCompact } from '../../../utils/format.js';
import EmptyState from './EmptyState.jsx';

export default function TemperatureTab({ result }) {
  const { state } = useReactor();
  const { label, toDisplay } = useUnitSystem();
  const traj = result?.trajectory;
  const basis = result?.basis ?? 'W';
  const isothermal = state.reactor.isothermal;
  const Tmax = state.constraints.Tmax;

  const data = useMemo(() => {
    if (!traj) return [];
    const dim = basis === 'W' ? 'weight' : 'volume';
    return traj.ts.map((t, i) => ({
      x: toDisplay(t, dim),
      T: toDisplay(traj.T[i], 'temperature'),
    }));
  }, [traj, basis, toDisplay]);

  if (isothermal) {
    return (
      <EmptyState
        title="Isothermal mode"
        description="Enable non-isothermal operation in step 3 to see the temperature profile."
      />
    );
  }
  if (!traj) {
    return <EmptyState title="No trajectory" />;
  }

  const xUnit = basis === 'W' ? label('weight') : label('volume');
  const Tunit = label('temperature');
  const T_hot = toDisplay(traj.summary.T_hotspot, 'temperature');
  const W_hot = toDisplay(traj.summary.W_hotspot, basis === 'W' ? 'weight' : 'volume');
  const TmaxDisp = Tmax != null ? toDisplay(Tmax, 'temperature') : null;

  // Color zones: derive from constraint (if present) or from a sensible band.
  const Tmin = Math.min(...data.map((d) => d.T));
  const Tmaxd = Math.max(...data.map((d) => d.T));
  const safeMin = Tmin - 5;
  const safeMax = TmaxDisp != null ? TmaxDisp - 10 : Tmaxd - 5;
  const warnMax = TmaxDisp != null ? TmaxDisp : Tmaxd + 10;

  return (
    <div className="space-y-4">
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 10, right: 24, bottom: 24, left: 8 }}>
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
              tickFormatter={(v) => v.toFixed(0)}
              label={{
                value: `T [${Tunit}]`,
                angle: -90,
                position: 'insideLeft',
                fill: PLOT_THEME.axisLabel,
                fontSize: 12,
              }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={(v) => `${basis} = ${fmt(v, 4)} ${xUnit}`}
              formatter={(v) => [`${fmt(v, 2)} ${Tunit}`, 'T']}
            />
            <ReferenceArea y1={safeMin} y2={safeMax} fill="#10B981" fillOpacity={0.08} stroke="none" />
            <ReferenceArea y1={safeMax} y2={warnMax} fill="#F59E0B" fillOpacity={0.08} stroke="none" />
            {TmaxDisp != null && (
              <>
                <ReferenceArea y1={TmaxDisp} y2={TmaxDisp + 200} fill="#EF4444" fillOpacity={0.10} stroke="none" />
                <ReferenceLine
                  y={TmaxDisp}
                  stroke="#EF4444"
                  strokeDasharray="3 3"
                  label={{
                    value: `Tmax = ${TmaxDisp.toFixed(0)} ${Tunit}`,
                    position: 'right',
                    fill: '#EF4444',
                    fontSize: 11,
                  }}
                />
              </>
            )}
            <Line
              type="monotone"
              dataKey="T"
              stroke="#F97316"
              strokeWidth={2.2}
              dot={false}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={W_hot}
              y={T_hot}
              r={6}
              fill={PLOT_THEME.hotspot}
              stroke="#0B1220"
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <Stat label="Hotspot T" value={`${fmt(T_hot, 2)} ${Tunit}`} />
        <Stat label={`Hotspot @ ${basis}`} value={`${fmt(W_hot, 4)} ${xUnit}`} />
        <Stat
          label="Hotspot location"
          value={`${traj.summary.W_hotspot_pct.toFixed(2)} %`}
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
