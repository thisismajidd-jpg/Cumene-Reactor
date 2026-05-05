import React from 'react';
import Button from '../../ui/Button.jsx';
import { fmt, fmtPct } from '../../../utils/format.js';
import { useUnitSystem } from '../../../hooks/useUnitSystem.js';
import { downloadCSV, trajectoryToCSV } from '../../../utils/csv.js';
import EmptyState from './EmptyState.jsx';

export default function SummaryTab({ result }) {
  const { label, toDisplay } = useUnitSystem();
  if (!result) return <EmptyState title="No solver result" />;

  if (result.reactorType === 'CSTR') {
    return <CSTRSummary result={result} />;
  }

  const traj = result.trajectory;
  if (!traj) return <EmptyState title="No trajectory" />;

  const basis = result.basis;
  const xUnit = basis === 'W' ? label('weight') : label('volume');
  const Tunit = label('temperature');
  const dim = basis === 'W' ? 'weight' : 'volume';

  const rows = [
    { k: 'Reactor type', v: result.reactorType },
    { k: 'Basis', v: basis },
    {
      k: `Required ${basis} (X = target)`,
      v:
        traj.summary.W_for_target != null
          ? `${fmt(toDisplay(traj.summary.W_for_target, dim), 4)} ${xUnit}`
          : '—',
    },
    { k: 'Final conversion X', v: fmtPct(traj.summary.X_final, 3) },
    {
      k: 'Final temperature',
      v: `${fmt(toDisplay(traj.summary.T_final, 'temperature'), 2)} ${Tunit}`,
    },
    {
      k: 'Hotspot temperature',
      v: `${fmt(toDisplay(traj.summary.T_hotspot, 'temperature'), 2)} ${Tunit}`,
    },
    {
      k: `Hotspot location (${basis})`,
      v: `${fmt(toDisplay(traj.summary.W_hotspot, dim), 4)} ${xUnit}  (${traj.summary.W_hotspot_pct.toFixed(2)} %)`,
    },
    {
      k: 'Selectivity (final)',
      v: traj.summary.S_final ? fmt(traj.summary.S_final, 4) : '—',
    },
    {
      k: 'Yield (final)',
      v: traj.summary.Y_final ? fmt(traj.summary.Y_final, 4) : '—',
    },
    { k: 'Limiting reactant', v: traj.summary.limitingSpecies ?? '—' },
    { k: 'Main product', v: traj.summary.mainProduct ?? '—' },
  ];

  const onExport = () => {
    const csv = trajectoryToCSV(traj, basis);
    downloadCSV(`reactoriq-${result.reactorType.toLowerCase()}-${Date.now()}.csv`, csv);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.k} className={i % 2 ? 'bg-bg-elevated/40' : ''}>
                <td className="px-4 py-2 text-text-muted w-1/2">{r.k}</td>
                <td className="px-4 py-2 num text-text-primary">{r.v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.warnings?.length > 0 && (
        <div className="rounded-md border border-state-warning/40 bg-state-warning/5 px-4 py-3">
          <p className="field-label text-state-warning mb-2">Constraint warnings</p>
          <ul className="text-sm space-y-1">
            {result.warnings.map((w, i) => (
              <li
                key={i}
                className={
                  w.level === 'danger' ? 'text-state-danger' : 'text-state-warning'
                }
              >
                · {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onExport}>
          Export trajectory CSV
        </Button>
      </div>
    </div>
  );
}

function CSTRSummary({ result }) {
  const sols = result.cstr?.solutions ?? [];
  if (sols.length === 0) {
    return <EmptyState title="No CSTR steady state" description={result.message} />;
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        {sols.length === 1
          ? 'Single steady state.'
          : `${sols.length} steady states detected — multiplicity!`}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sols.map((s, i) => (
          <div key={i} className="rounded-md border border-border bg-bg-elevated px-4 py-3">
            <div className="field-label mb-2">Steady state #{i + 1}</div>
            <div className="space-y-1 text-sm">
              <Row k="X" v={s.X != null ? fmt(s.X, 4) : '—'} />
              <Row k="Limiting" v={s.limitingSpecies ?? '—'} />
              <Row
                k="Extents"
                v={s.epsilon.map((e, j) => `ε${j + 1}=${fmt(e, 4)}`).join(', ')}
              />
              <Row
                k="Outlet flows"
                v={Object.entries(s.flows)
                  .map(([sp, F]) => `${sp}=${fmt(F, 4)}`)
                  .join(', ')}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-text-muted text-xs">{k}</span>
      <span className="num text-text-primary text-xs">{v}</span>
    </div>
  );
}
