import React, { useMemo, useState } from 'react';
import Card from '../ui/Card.jsx';
import { Tabs } from '../ui/Tabs.jsx';
import ConversionTab from './tabs/ConversionTab.jsx';
import TemperatureTab from './tabs/TemperatureTab.jsx';
import ConcentrationTab from './tabs/ConcentrationTab.jsx';
import SelectivityTab from './tabs/SelectivityTab.jsx';
import SummaryTab from './tabs/SummaryTab.jsx';
import { useReactor } from '../../hooks/useReactor.js';
import { useUnitSystem } from '../../hooks/useUnitSystem.js';
import { fmt, fmtPct } from '../../utils/format.js';

const TABS = [
  { id: 'X',  label: 'Conversion',     component: ConversionTab },
  { id: 'T',  label: 'Temperature',    component: TemperatureTab },
  { id: 'C',  label: 'Concentrations', component: ConcentrationTab },
  { id: 'SY', label: 'Selectivity',    component: SelectivityTab },
  { id: 'S',  label: 'Summary',        component: SummaryTab },
];

export default function OutputPanel() {
  const { state } = useReactor();
  const { label, toDisplay } = useUnitSystem();
  const [tab, setTab] = useState('X');
  const result = state.solver.result;
  const status = state.solver.status;

  const tabs = useMemo(() => {
    return TABS.map((t) => {
      const disabled =
        (t.id === 'T' && state.reactor.isothermal) ||
        (t.id === 'SY' && !state.reaction.sideReactionEnabled) ||
        (result?.reactorType === 'CSTR' && t.id !== 'S');
      return { id: t.id, label: t.label, disabled };
    });
  }, [state.reactor.isothermal, state.reaction.sideReactionEnabled, result?.reactorType]);

  const Active = TABS.find((t) => t.id === tab)?.component ?? ConversionTab;

  return (
    <Card
      title="Live output"
      subtitle="Plots refresh as you adjust inputs."
      action={<StatusDot status={status} />}
    >
      <Tabs value={tab} onChange={setTab} tabs={tabs} className="mb-4" />
      <div role="tabpanel">
        <Active result={result} />
      </div>

      {/* Always-visible KPI footer — fills the column height gracefully and
          gives a glanceable summary independent of which tab is active. */}
      <KpiFooter result={result} label={label} toDisplay={toDisplay} />
    </Card>
  );
}

/**
 * Tiny pulsing status dot in the card header. Replaces the old "Solving…"
 * text label so the header isn't dominated by transient status text.
 */
function StatusDot({ status }) {
  const map = {
    running: { color: '#22D3EE', glow: 'rgba(34,211,238,0.6)',  label: 'Solving…' },
    success: { color: '#10B981', glow: 'rgba(16,185,129,0.55)', label: 'Up to date' },
    error:   { color: '#EF4444', glow: 'rgba(239,68,68,0.55)',  label: 'Solver error' },
    idle:    { color: '#64748B', glow: 'rgba(100,116,139,0.4)', label: 'Idle' },
  };
  const d = map[status] ?? map.idle;
  return (
    <span
      title={d.label}
      aria-label={d.label}
      className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-subtle"
    >
      <span
        className={[
          'w-1.5 h-1.5 rounded-full',
          status === 'running' ? 'animate-pulse' : '',
        ].join(' ')}
        style={{
          background: d.color,
          boxShadow: `0 0 8px ${d.glow}`,
        }}
      />
      {d.label}
    </span>
  );
}

/**
 * Compact metric strip pinned to the bottom of the output card. Shows the
 * trajectory's headline numbers regardless of which tab is active.
 */
function KpiFooter({ result, label, toDisplay }) {
  const traj = result?.trajectory;
  const reactorType = result?.reactorType;

  // CSTR doesn't produce a trajectory; show steady-state count instead.
  if (reactorType === 'CSTR') {
    const ss = result?.cstr?.solutions?.length ?? 0;
    return (
      <div className="mt-5 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Pill label="Reactor" value={reactorType} accent="#A855F7" />
        <Pill label="Basis" value="V" accent="#94A3B8" />
        <Pill label="Steady states" value={String(ss)} accent="#22D3EE" />
        <Pill label="Status" value={ss === 0 ? 'no solution' : 'solved'} accent={ss > 0 ? '#10B981' : '#EF4444'} />
      </div>
    );
  }

  if (!traj) {
    return (
      <div className="mt-5 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Pill label="Reactor" value={reactorType ?? '—'} accent="#A855F7" />
        <Pill label="Final X" value="—" accent="#22D3EE" />
        <Pill label="Hotspot T" value="—" accent="#FACC15" />
        <Pill label="Selectivity" value="—" accent="#10B981" />
      </div>
    );
  }

  const basis = result.basis;
  const xDim = basis === 'W' ? 'weight' : 'volume';
  const xUnit = label(xDim);
  const Tunit = label('temperature');
  const s = traj.summary;

  return (
    <div className="mt-5 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Pill label="Reactor" value={reactorType} accent="#A855F7" />
      <Pill
        label={`Required ${basis}`}
        value={
          s.W_for_target != null
            ? `${fmt(toDisplay(s.W_for_target, xDim), 3)} ${xUnit}`
            : '—'
        }
        accent="#22D3EE"
      />
      <Pill
        label="Final X"
        value={s.X_final != null ? fmtPct(s.X_final, 1) : '—'}
        accent="#22D3EE"
      />
      <Pill
        label="Hotspot T"
        value={
          s.T_hotspot != null
            ? `${fmt(toDisplay(s.T_hotspot, 'temperature'), 1)} ${Tunit}`
            : '—'
        }
        accent="#FACC15"
      />
      <Pill
        label="Selectivity"
        value={s.S_final != null ? fmt(s.S_final, 4) : '—'}
        accent="#10B981"
      />
      <Pill
        label="Limiting"
        value={s.limitingSpecies ?? '—'}
        accent="#EF4444"
      />
      <Pill
        label="Main product"
        value={s.mainProduct ?? '—'}
        accent="#3B82F6"
      />
    </div>
  );
}

function Pill({ label, value, accent }) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated px-3 py-2 min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-text-muted truncate">
        {label}
      </div>
      <div
        className="mt-0.5 num text-sm font-semibold truncate"
        style={{ color: accent }}
        title={typeof value === 'string' ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}
