import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  Legend,
} from 'recharts';
import { PLOT_THEME, TOOLTIP_STYLE } from '../studio/tabs/PlotTheme.js';
import { useReactor } from '../../hooks/useReactor.js';
import { useUnitSystem } from '../../hooks/useUnitSystem.js';
import { buildSolverConfig } from '../../hooks/useSolver.js';
import { solveReactor } from '../../solver/index.js';
import { fmt, fmtCompact } from '../../utils/format.js';

/**
 * Live trajectory monitor inspired by memo5_interactive_slider:
 *   Plot 1 — T(W) with isothermal Tin reference, coolant reference,
 *            and a hotspot marker.
 *   Plot 2 — Selectivity (S) and conversion (X) profiles vs W,
 *            with a hotspot vertical reference.
 *   KPIs   — T_hotspot, X, S, and reactor "gain" (ΔT_hotspot / ΔTa).
 *   Stability pill flips red if gain ≥ 2 (runaway risk).
 *
 * Reads the auto-solve result from state and runs a *single* extra perturbed
 * solve (Ta + 1) to compute gain. Memoized on the inputs that matter.
 */
export default function SensitivityMonitor() {
  const { state } = useReactor();
  const { label, toDisplay } = useUnitSystem();
  const result = state.solver.result;
  const traj = result?.trajectory;
  const isothermal = state.reactor.isothermal;

  const basis = result?.basis ?? 'W';
  const xDim = basis === 'W' ? 'weight' : 'volume';
  const xUnit = label(xDim);
  const Tunit = label('temperature');

  // Trajectory data for both plots (memoized).
  const data = useMemo(() => {
    if (!traj) return [];
    return traj.ts.map((t, i) => ({
      x: toDisplay(t, xDim),
      X: traj.X[i],
      S: traj.S[i],
      Y: traj.Y[i],
      T: toDisplay(traj.T[i], 'temperature'),
    }));
  }, [traj, xDim, toDisplay]);

  const summary = traj?.summary;

  // Reactor gain: re-solve once with Ta + 1 and compute ΔT_hotspot.
  // Only runs when non-isothermal and we have a fresh result.
  const gain = useMemo(() => {
    if (isothermal || !summary || !Number.isFinite(summary.T_hotspot)) return null;
    try {
      const cfg = buildSolverConfig(state);
      if (!cfg.thermal) return null;
      cfg.thermal = { ...cfg.thermal, Ta: cfg.thermal.Ta + 1 };
      const r2 = solveReactor(cfg);
      const T2 = r2?.trajectory?.summary?.T_hotspot;
      if (!Number.isFinite(T2)) return null;
      return T2 - summary.T_hotspot;
    } catch {
      return null;
    }
  }, [isothermal, state, summary]);

  // Reference lines (in display units).
  const TinDisp = toDisplay(state.conditions.T_inlet, 'temperature');
  const TaDisp = toDisplay(state.reactor.nonIso.Ta, 'temperature');
  const ThotDisp = summary != null ? toDisplay(summary.T_hotspot, 'temperature') : null;
  const WhotDisp = summary != null ? toDisplay(summary.W_hotspot, xDim) : null;

  // Stability heuristic: gain < 2 → safe.
  let stability = null;
  if (gain != null) {
    stability = gain < 2
      ? { tone: 'good', text: `STABLE — gain ${gain.toFixed(2)} K/K` }
      : { tone: 'bad', text: `RUNAWAY RISK — gain ${gain.toFixed(2)} K/K` };
  }

  return (
    <div className="rounded-xl border border-border bg-bg-panel/40 p-4 h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 rounded-sm bg-accent-cyan" aria-hidden />
          <h4 className="font-display text-sm font-semibold text-text-primary tracking-wide">
            Live trajectory
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-text-muted num">
          <span>{result?.reactorType ?? '—'}</span>
          <span
            aria-hidden
            className={[
              'w-1.5 h-1.5 rounded-full',
              state.solver.status === 'running' ? 'animate-pulse bg-accent-cyan' : '',
              state.solver.status === 'success' ? 'bg-state-success' : '',
              state.solver.status === 'error'   ? 'bg-state-danger'  : '',
              state.solver.status === 'idle'    ? 'bg-text-subtle'   : '',
            ].join(' ')}
          />
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyMonitor message={result?.message} />
      ) : (
        <>
          {/* ── Plot 1 · Temperature trajectory ────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="field-label text-text-primary">Temperature profile</span>
              {ThotDisp != null && (
                <span className="text-[11px] num text-plot-hotspot">
                  T<sub>hot</sub> = {fmt(ThotDisp, 1)} {Tunit}
                </span>
              )}
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer>
                <ComposedChart
                  data={data}
                  margin={{ top: 10, right: 16, bottom: 28, left: 4 }}
                >
                  <CartesianGrid stroke={PLOT_THEME.grid} strokeDasharray="3 5" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={['auto', 'auto']}
                    tick={{ fill: PLOT_THEME.axis, fontSize: 10 }}
                    axisLine={{ stroke: PLOT_THEME.grid }}
                    tickLine={{ stroke: PLOT_THEME.grid }}
                    tickFormatter={fmtCompact}
                    label={{
                      value: `${basis} [${xUnit}]`,
                      position: 'insideBottom',
                      offset: -12,
                      fill: PLOT_THEME.axisLabel,
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    tick={{ fill: PLOT_THEME.axis, fontSize: 10 }}
                    axisLine={{ stroke: PLOT_THEME.grid }}
                    tickLine={{ stroke: PLOT_THEME.grid }}
                    tickFormatter={(v) => v.toFixed(0)}
                    domain={['auto', 'auto']}
                    width={40}
                    label={{
                      value: `T [${Tunit}]`,
                      angle: -90,
                      position: 'insideLeft',
                      fill: PLOT_THEME.axisLabel,
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    labelFormatter={(v) => `${basis} = ${fmt(v, 4)} ${xUnit}`}
                    formatter={(v) => [`${fmt(v, 1)} ${Tunit}`, 'T']}
                  />
                  {/* Coolant reference */}
                  {!isothermal && Number.isFinite(TaDisp) && (
                    <ReferenceLine
                      y={TaDisp}
                      stroke="#94A3B8"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      label={{
                        value: `T_coolant = ${TaDisp.toFixed(0)} ${Tunit}`,
                        position: 'right',
                        fill: '#94A3B8',
                        fontSize: 10,
                      }}
                    />
                  )}
                  {/* Isothermal Tin reference */}
                  {Number.isFinite(TinDisp) && (
                    <ReferenceLine
                      y={TinDisp}
                      stroke="#3B82F6"
                      strokeDasharray="6 4"
                      strokeWidth={1.2}
                      label={{
                        value: `T_in = ${TinDisp.toFixed(0)}`,
                        position: 'insideTopLeft',
                        fill: '#3B82F6',
                        fontSize: 10,
                      }}
                    />
                  )}
                  {/* Non-isothermal trajectory */}
                  <Line
                    type="monotone"
                    dataKey="T"
                    stroke="#EF4444"
                    strokeWidth={2.4}
                    dot={false}
                    isAnimationActive={false}
                  />
                  {/* Hotspot marker */}
                  {WhotDisp != null && ThotDisp != null && (
                    <ReferenceDot
                      x={WhotDisp}
                      y={ThotDisp}
                      r={6}
                      fill={PLOT_THEME.hotspot}
                      stroke="#0B1220"
                      strokeWidth={2}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <PlotLegend
              items={[
                { color: '#EF4444', label: 'Non-isothermal T(W)' },
                { color: '#3B82F6', dashed: true, label: 'Isothermal at T_in' },
                { color: '#94A3B8', dashed: true, label: 'T_coolant' },
                { color: PLOT_THEME.hotspot, dot: true, label: 'Hotspot' },
              ]}
            />
          </div>

          {/* ── Plot 2 · Selectivity & Conversion ─────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="field-label text-text-primary">
                Selectivity &amp; conversion
              </span>
              {summary?.X_final != null && (
                <span className="text-[11px] num text-accent-cyan">
                  X<sub>final</sub> = {fmt(summary.X_final, 4)}
                </span>
              )}
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer>
                <ComposedChart
                  data={data}
                  margin={{ top: 10, right: 16, bottom: 28, left: 4 }}
                >
                  <CartesianGrid stroke={PLOT_THEME.grid} strokeDasharray="3 5" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={['auto', 'auto']}
                    tick={{ fill: PLOT_THEME.axis, fontSize: 10 }}
                    axisLine={{ stroke: PLOT_THEME.grid }}
                    tickLine={{ stroke: PLOT_THEME.grid }}
                    tickFormatter={fmtCompact}
                    label={{
                      value: `${basis} [${xUnit}]`,
                      position: 'insideBottom',
                      offset: -12,
                      fill: PLOT_THEME.axisLabel,
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fill: PLOT_THEME.axis, fontSize: 10 }}
                    axisLine={{ stroke: PLOT_THEME.grid }}
                    tickLine={{ stroke: PLOT_THEME.grid }}
                    tickFormatter={(v) => v.toFixed(1)}
                    width={36}
                    label={{
                      value: 'S, X  [—]',
                      angle: -90,
                      position: 'insideLeft',
                      fill: PLOT_THEME.axisLabel,
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    labelFormatter={(v) => `${basis} = ${fmt(v, 4)} ${xUnit}`}
                    formatter={(v, n) => [fmt(v, 4), n]}
                  />
                  {/* Hotspot vertical guide */}
                  {WhotDisp != null && (
                    <ReferenceLine
                      x={WhotDisp}
                      stroke={PLOT_THEME.hotspot}
                      strokeDasharray="3 3"
                      strokeOpacity={0.7}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="X"
                    name="X"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="S"
                    name="S"
                    stroke="#10B981"
                    strokeWidth={2.4}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Y"
                    name="Y"
                    stroke="#A855F7"
                    strokeWidth={1.8}
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <PlotLegend
              items={[
                { color: '#10B981', label: 'S — selectivity' },
                { color: '#A855F7', label: 'Y — yield' },
                { color: '#3B82F6', dashed: true, label: 'X — conversion' },
              ]}
            />
          </div>

          {/* ── KPI grid ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Kpi
              label="T_hotspot"
              value={ThotDisp != null ? fmt(ThotDisp, 1) : '—'}
              unit={Tunit}
              accent="#FACC15"
            />
            <Kpi
              label="Conversion X"
              value={summary?.X_final != null ? fmt(summary.X_final, 4) : '—'}
              unit="—"
              accent="#22D3EE"
            />
            <Kpi
              label="Selectivity S"
              value={summary?.S_final != null ? fmt(summary.S_final, 4) : '—'}
              unit="—"
              accent="#10B981"
            />
            <Kpi
              label="Reactor gain"
              value={gain != null ? gain.toFixed(2) : isothermal ? 'iso' : '—'}
              unit={gain != null ? 'K/K' : ''}
              accent={gain != null && gain >= 2 ? '#EF4444' : '#A855F7'}
            />
          </div>

          {/* ── Stability indicator ───────────────────────────────────── */}
          {stability && (
            <div
              className={[
                'rounded-md px-3 py-2 text-center text-xs font-semibold tracking-wide',
                'border',
                stability.tone === 'good'
                  ? 'bg-state-success/15 border-state-success/40 text-state-success'
                  : 'bg-state-danger/15 border-state-danger/40 text-state-danger',
              ].join(' ')}
              role="status"
            >
              {stability.tone === 'good' ? '🟢' : '🔴'}  {stability.text}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyMonitor({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-text-muted text-sm h-64">
      <div className="w-10 h-10 rounded-full border border-border grid place-items-center mb-2">
        ∿
      </div>
      <p>Waiting for solver…</p>
      {message && <p className="text-xs mt-1 opacity-70">({message})</p>}
      <p className="text-xs mt-1">Move a slider to refresh.</p>
    </div>
  );
}

function PlotLegend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-text-muted">
      {items.map((it, i) => (
        <div key={i} className="inline-flex items-center gap-1.5">
          {it.dot ? (
            <span
              className="inline-block w-2.5 h-2.5 rounded-full border border-bg-base"
              style={{ background: it.color }}
            />
          ) : (
            <span
              className="inline-block w-4 h-[3px] rounded-sm"
              style={{
                background: it.color,
                borderTop: it.dashed ? `2px dashed ${it.color}` : 'none',
                height: it.dashed ? 0 : 3,
              }}
            />
          )}
          {it.label}
        </div>
      ))}
    </div>
  );
}

function Kpi({ label, value, unit, accent }) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated px-3 py-2 min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-text-muted truncate">
        {label}
      </div>
      <div className="mt-0.5 num text-base font-semibold truncate" style={{ color: accent }}>
        {value}
        {unit && <span className="text-[10px] text-text-muted font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
}
