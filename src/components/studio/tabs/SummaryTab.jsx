import React from 'react';
import Button from '../../ui/Button.jsx';
import { fmt, fmtPct } from '../../../utils/format.js';
import { useUnitSystem } from '../../../hooks/useUnitSystem.js';
import { useReactor } from '../../../hooks/useReactor.js';
import { downloadCSV, trajectoryToCSV } from '../../../utils/csv.js';
import EmptyState from './EmptyState.jsx';

// L/D = 5 (course convention). V = π D²/4 · L = (5π/4) D³  ⇒  D = (4V/5π)^(1/3).
const LD_RATIO = 5;

function computeSizing(reactor) {
  if (!reactor) return null;
  const type = reactor.type;
  let V = 0;
  if (type === 'PFR') V = reactor.pfr?.V ?? 0;
  else if (type === 'CSTR') V = reactor.cstr?.V ?? 0;
  else if (type === 'PBR') {
    // Geometric (physical) bed volume — sum of all tube interiors.
    //   First find per-tube length from catalyst loading and bulk density:
    //     L_t = W_per_tube / (ρ_b · A_t)         with A_t = π·D_t²/4
    //   Then the total reactor volume is just the sum of the tube volumes:
    //     V = (π/4) · D_t² · L_t · N_tubes
    //   Equivalently V = W_total / ρ_b — this is the physical volume the
    //   gas flows through (catalyst + voids between particles), which is
    //   what the CHPE4512 EO report calls "Total bed volume" (15.02 m³).
    const p = reactor.pbr ?? {};
    const W_total = p.perTube ? (p.W ?? 0) * (p.tubes ?? 1) : (p.W ?? 0);
    const rho_b = p.rho_b ?? 0;
    V = rho_b > 0 ? W_total / rho_b : 0;
  }
  if (!Number.isFinite(V) || V <= 0) return null;

  const D = Math.cbrt((4 * V) / (LD_RATIO * Math.PI));
  const L = LD_RATIO * D;
  const out = { type, V, D, L };

  if (type === 'PBR') {
    const p = reactor.pbr ?? {};
    const tubes  = p.tubes ?? 1;
    const Dt     = p.Dt ?? 0;
    const rho_b  = p.rho_b ?? 0;
    const W_per_tube = p.perTube ? (p.W ?? 0) : (p.W ?? 0) / Math.max(tubes, 1);
    const A_t = Math.PI * Dt * Dt / 4;
    // L_per_tube from W = ρ_b · A_t · L_t  (bulk density absorbs the voidage).
    const L_per_tube = (rho_b > 0 && A_t > 0) ? W_per_tube / (rho_b * A_t) : 0;
    const V_per_tube = A_t * L_per_tube;
    Object.assign(out, { tubes, Dt, V_per_tube, L_per_tube });
  }
  return out;
}

export default function SummaryTab({ result }) {
  const { label, toDisplay } = useUnitSystem();
  const { state } = useReactor();
  const sizing = computeSizing(state.reactor);

  if (!result) return <EmptyState title="No solver result" />;

  if (result.reactorType === 'CSTR') {
    return (
      <div className="space-y-4">
        <CSTRSummary result={result} />
        {sizing && <SizingCard sizing={sizing} label={label} toDisplay={toDisplay} />}
      </div>
    );
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

      {sizing && <SizingCard sizing={sizing} label={label} toDisplay={toDisplay} />}

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

// Sizing summary: per-tube geometry first, then total reactor volume from
// V = (π/4)·D_t²·L_t·N_tubes (PBR), plus the L/D = 5 shell envelope.
function SizingCard({ sizing, label, toDisplay }) {
  const Lu = label('length');
  const Vu = label('volume');
  const dim = (v, d) => fmt(toDisplay(v, d), 4);
  const isPBR = sizing.type === 'PBR';

  return (
    <div className="rounded-md border border-accent-cyan/30 bg-accent-cyan/5 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-accent-cyan/20 bg-accent-cyan/10">
        <p className="field-label text-accent-cyan">
          Reactor sizing {isPBR && '— V from tube geometry, then shell envelope L/D = ' + LD_RATIO}
        </p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {isPBR && (
            <>
              {/* Tube geometry first — these are the inputs to V. */}
              <tr>
                <td colSpan={2} className="px-4 pt-3 pb-1 field-label text-accent-cyan">
                  Tube configuration
                </td>
              </tr>
              <tr className="bg-bg-elevated/40">
                <td className="px-4 py-2 text-text-muted w-1/2">Number of tubes N</td>
                <td className="px-4 py-2 num text-text-primary">{sizing.tubes}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-text-muted">Tube diameter D<sub>t</sub></td>
                <td className="px-4 py-2 num text-text-primary">
                  {dim(sizing.Dt, 'length')} {Lu}
                </td>
              </tr>
              <tr className="bg-bg-elevated/40">
                <td className="px-4 py-2 text-text-muted">
                  Length per tube L<sub>t</sub> = W<sub>t</sub> / (ρ<sub>b</sub> · A<sub>t</sub>)
                </td>
                <td className="px-4 py-2 num text-text-primary">
                  {dim(sizing.L_per_tube, 'length')} {Lu}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-text-muted">
                  Volume per tube V<sub>t</sub> = (π/4)·D<sub>t</sub>²·L<sub>t</sub>
                </td>
                <td className="px-4 py-2 num text-text-primary">
                  {dim(sizing.V_per_tube, 'volume')} {Vu}
                </td>
              </tr>

              {/* Total volume from the geometric sum-of-tubes formula. */}
              <tr>
                <td colSpan={2} className="px-4 pt-3 pb-1 field-label text-accent-cyan">
                  Total reactor volume
                </td>
              </tr>
              <tr className="bg-bg-elevated/40">
                <td className="px-4 py-2 text-text-muted">
                  V = (π/4) · D<sub>t</sub>² · L<sub>t</sub> · N
                </td>
                <td className="px-4 py-2 num text-text-primary font-semibold">
                  {dim(sizing.V, 'volume')} {Vu}
                </td>
              </tr>
            </>
          )}

          {!isPBR && (
            <tr>
              <td className="px-4 py-2 text-text-muted w-1/2">Total reactor volume V</td>
              <td className="px-4 py-2 num text-text-primary">
                {dim(sizing.V, 'volume')} {Vu}
              </td>
            </tr>
          )}

          {/* Shell envelope — same for every reactor type. */}
          <tr>
            <td colSpan={2} className="px-4 pt-3 pb-1 field-label text-accent-cyan">
              Shell envelope (L/D = {LD_RATIO})
            </td>
          </tr>
          <tr className="bg-bg-elevated/40">
            <td className="px-4 py-2 text-text-muted">
              Shell diameter D = (4V/{LD_RATIO}π)<sup>1/3</sup>
            </td>
            <td className="px-4 py-2 num text-text-primary">
              {dim(sizing.D, 'length')} {Lu}
            </td>
          </tr>
          <tr>
            <td className="px-4 py-2 text-text-muted">Shell length L = {LD_RATIO} D</td>
            <td className="px-4 py-2 num text-text-primary">
              {dim(sizing.L, 'length')} {Lu}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
