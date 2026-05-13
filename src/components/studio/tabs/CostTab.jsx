import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from 'recharts';
import { useReactor } from '../../../hooks/useReactor.js';
import {
  computeEconomics,
  sweepAssumption,
  DEFAULT_ASSUMPTIONS,
} from '../../../solver/economics.js';
import EmptyState from './EmptyState.jsx';
import NumberInput from '../../ui/NumberInput.jsx';
import { fmt } from '../../../utils/format.js';
import { PLOT_THEME, TOOLTIP_STYLE } from './PlotTheme.js';

// ── Formatting helpers ──────────────────────────────────────────────────
function fmtUSD(v, decimals = 0) {
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  });
}

function fmtUSDCompact(v) {
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)} B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)} M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)} k`;
  return `$${v.toFixed(0)}`;
}

// ── Main tab ────────────────────────────────────────────────────────────
export default function CostTab({ result }) {
  const { state } = useReactor();
  const [overrides, setOverrides] = useState({});
  const [showAssumptions, setShowAssumptions] = useState(false);

  const assumptions = useMemo(
    () => ({ ...DEFAULT_ASSUMPTIONS, ...overrides }),
    [overrides],
  );
  const econ = useMemo(
    () => computeEconomics(state, result, assumptions),
    [state, result, assumptions],
  );

  if (!result?.trajectory) {
    return <EmptyState title="No trajectory" description="Run the solver to see the cost breakdown." />;
  }
  if (state.reactor.type !== 'PBR') {
    return (
      <EmptyState
        title="Cost model is PBR-only"
        description="The Turton module-cost model in this app is set up for the multi-tube packed-bed reactor. Switch reactor type to PBR to see the analysis."
      />
    );
  }
  if (!econ) {
    return <EmptyState title="Cost calculation unavailable" description="Could not derive a cost from the current state." />;
  }

  const set = (key) => (val) => setOverrides((o) => ({ ...o, [key]: val }));

  return (
    <div className="space-y-6">
      <KpiStrip econ={econ} />
      <CapexSection econ={econ} />
      <OpexSection econ={econ} />
      <RevenueSection econ={econ} />
      <SensitivitySection
        state={state}
        result={result}
        assumptions={assumptions}
      />
      <AssumptionsPanel
        open={showAssumptions}
        onToggle={() => setShowAssumptions((s) => !s)}
        assumptions={assumptions}
        set={set}
        reset={() => setOverrides({})}
        dirty={Object.keys(overrides).length > 0}
      />
      <References />
    </div>
  );
}

// ── Headline KPIs ───────────────────────────────────────────────────────
function KpiStrip({ econ }) {
  const m = econ.metrics;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Kpi
        label="Total Capital Investment"
        value={fmtUSDCompact(econ.capex.totalCapital)}
        accent="#22D3EE"
        hint={`Bare module × ${econ.capex.contingencyFactor.toFixed(2)} (contingency + fees)`}
      />
      <Kpi
        label="Annual operating cost"
        value={fmtUSDCompact(econ.opex.total)}
        accent="#F97316"
        hint="Feedstocks + utilities + catalyst + maintenance + labor"
      />
      <Kpi
        label="$ per tonne cumene"
        value={fmtUSDCompact(m.dollarPerTonne)}
        accent="#10B981"
        hint={`Production ≈ ${m.productionRate_tpy.toFixed(0)} t/yr`}
      />
      <Kpi
        label="Simple payback"
        value={
          Number.isFinite(m.paybackYears)
            ? `${m.paybackYears.toFixed(1)} yr`
            : '—'
        }
        accent="#A855F7"
        hint={`Gross profit ${fmtUSDCompact(m.grossProfit)}/yr`}
      />
    </div>
  );
}

function Kpi({ label, value, accent, hint }) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated px-4 py-3 min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-text-muted truncate">
        {label}
      </div>
      <div
        className="mt-1 num text-lg font-semibold truncate"
        style={{ color: accent }}
        title={value}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[10px] text-text-subtle truncate" title={hint}>
          {hint}
        </div>
      )}
    </div>
  );
}

// ── CAPEX / OPEX / revenue tables with proportional bars ────────────────
function BreakdownTable({ title, accent, items, total, totalLabel, subtitle }) {
  const max = items.reduce((m, it) => Math.max(m, it.amount), 0);
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div
        className="px-4 py-2.5 border-b border-border flex items-baseline justify-between"
        style={{ background: `${accent}10` }}
      >
        <div>
          <p className="field-label" style={{ color: accent }}>{title}</p>
          {subtitle && <p className="text-[11px] text-text-subtle mt-0.5">{subtitle}</p>}
        </div>
        <span className="num text-sm font-semibold" style={{ color: accent }}>
          {fmtUSDCompact(total)}
        </span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {items.map((it, i) => {
            const pct = max > 0 ? Math.max(2, (it.amount / max) * 100) : 0;
            return (
              <tr key={it.id} className={i % 2 ? 'bg-bg-elevated/40' : ''}>
                <td className="px-4 py-2 w-[44%]">
                  <div className="text-text-primary text-sm">{it.label}</div>
                  {it.detail && (
                    <div className="text-[11px] text-text-subtle mt-0.5">{it.detail}</div>
                  )}
                </td>
                <td className="px-2 py-2 w-[36%]">
                  <div className="h-2 rounded-full bg-bg-elevated/60 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: accent,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                </td>
                <td className="px-4 py-2 num text-right text-text-primary whitespace-nowrap">
                  {fmtUSDCompact(it.amount)}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-border bg-bg-elevated/30">
            <td className="px-4 py-2 text-text-muted font-medium">{totalLabel}</td>
            <td />
            <td
              className="px-4 py-2 num text-right font-semibold whitespace-nowrap"
              style={{ color: accent }}
            >
              {fmtUSDCompact(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CapexSection({ econ }) {
  const s = econ.sizing;
  const subtitle = `Reactor sized as ${s.nShells} parallel S&T HX shell${s.nShells > 1 ? 's' : ''} (${s.Ahx.toFixed(0)} m² total) · F_P = ${s.F_P.toFixed(2)} · F_BM = ${s.F_BM.toFixed(2)} · CEPCI scale × ${s.escalator.toFixed(2)}`;
  return (
    <BreakdownTable
      title="Capital cost (CAPEX) — Turton bare-module method"
      accent="#22D3EE"
      items={econ.capex.items}
      total={econ.capex.totalCapital}
      totalLabel={`Total Capital Investment (× ${econ.capex.contingencyFactor.toFixed(2)} contingency)`}
      subtitle={subtitle}
    />
  );
}

function OpexSection({ econ }) {
  return (
    <BreakdownTable
      title="Operating cost (OPEX) — annual, USD/yr"
      accent="#F97316"
      items={econ.opex.items}
      total={econ.opex.total}
      totalLabel="Annual operating cost"
      subtitle={`Q_duty = ${(econ.metrics.Q_duty_W / 1e6).toFixed(2)} MW · pump = ${(econ.metrics.pumpPower_W / 1000).toFixed(1)} kW · ΔP = ${(econ.metrics.dP_Pa / 1e5).toFixed(2)} bar`}
    />
  );
}

function RevenueSection({ econ }) {
  const profit = econ.revenue.total - econ.opex.total;
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div
        className="px-4 py-2.5 border-b border-border flex items-baseline justify-between"
        style={{ background: '#10B98110' }}
      >
        <p className="field-label" style={{ color: '#10B981' }}>
          Revenue & gross profit (USD/yr)
        </p>
        <span className="num text-sm font-semibold" style={{ color: '#10B981' }}>
          {fmtUSDCompact(econ.revenue.total)}
        </span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {econ.revenue.items.map((it, i) => (
            <tr key={it.id} className={i % 2 ? 'bg-bg-elevated/40' : ''}>
              <td className="px-4 py-2 w-1/2">
                <div className="text-text-primary text-sm">{it.label}</div>
                {it.detail && (
                  <div className="text-[11px] text-text-subtle mt-0.5">{it.detail}</div>
                )}
              </td>
              <td className="px-4 py-2 num text-right text-text-primary whitespace-nowrap">
                {fmtUSDCompact(it.amount)}
              </td>
            </tr>
          ))}
          <tr className="border-t border-border bg-bg-elevated/30">
            <td className="px-4 py-2 text-text-muted">Total revenue</td>
            <td
              className="px-4 py-2 num text-right font-semibold"
              style={{ color: '#10B981' }}
            >
              {fmtUSDCompact(econ.revenue.total)}
            </td>
          </tr>
          <tr>
            <td className="px-4 py-2 text-text-muted">Annual operating cost</td>
            <td
              className="px-4 py-2 num text-right"
              style={{ color: '#F97316' }}
            >
              −{fmtUSDCompact(econ.opex.total)}
            </td>
          </tr>
          <tr className="border-t border-border bg-bg-elevated/40">
            <td className="px-4 py-2 font-semibold">Gross profit (revenue − OPEX)</td>
            <td
              className="px-4 py-2 num text-right font-semibold"
              style={{ color: profit >= 0 ? '#10B981' : '#EF4444' }}
            >
              {fmtUSDCompact(profit)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Sensitivity (price-driven, no re-solve) ─────────────────────────────
function SensitivitySection({ state, result, assumptions }) {
  const sweeps = useMemo(() => {
    return [
      {
        title: '$/t cumene vs propylene price',
        accent: '#EF4444',
        key: 'propylenePrice',
        x: assumptions.propylenePrice,
        range: [700, 1300],
        unit: '$/t',
        yKey: 'dollarPerTonne',
        yLabel: '$/t cumene',
      },
      {
        title: '$/t cumene vs catalyst price',
        accent: '#22D3EE',
        key: 'catalystPrice',
        x: assumptions.catalystPrice,
        range: [15, 60],
        unit: '$/kg',
        yKey: 'dollarPerTonne',
        yLabel: '$/t cumene',
      },
      {
        title: 'Payback (yr) vs cumene price',
        accent: '#10B981',
        key: 'cumenePrice',
        x: assumptions.cumenePrice,
        range: [1000, 1600],
        unit: '$/t',
        yKey: 'paybackYears',
        yLabel: 'Payback (yr)',
      },
    ].map((cfg) => ({
      ...cfg,
      data: sweepAssumption(state, result, assumptions, cfg.key, cfg.range, 13)
        .map((p) => ({
          x: p.x,
          y: cfg.yKey === 'paybackYears'
            ? (Number.isFinite(p.paybackYears) ? Math.min(p.paybackYears, 50) : null)
            : p[cfg.yKey],
        })),
    }));
  }, [state, result, assumptions]);

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-bg-elevated/30">
        <p className="field-label text-text-primary">Sensitivity to market prices</p>
        <p className="text-[11px] text-text-subtle mt-0.5">
          One assumption swept across a realistic range. Yellow dot = current operating point.
          For design-parameter sensitivity (T<sub>inlet</sub>, U, N<sub>tubes</sub>) use the
          Sensitivity panel.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {sweeps.map((sw) => (
          <SensitivityChart key={sw.key} {...sw} />
        ))}
      </div>
    </div>
  );
}

function SensitivityChart({ title, accent, x, range, unit, yLabel, data }) {
  const currentY = useMemo(() => {
    // Linear interp at x
    for (let i = 1; i < data.length; i++) {
      if (data[i].x >= x) {
        const a = data[i - 1];
        const b = data[i];
        const t = (x - a.x) / Math.max(b.x - a.x, 1e-9);
        return a.y + t * (b.y - a.y);
      }
    }
    return data[data.length - 1]?.y;
  }, [x, data]);

  return (
    <div className="rounded-md border border-border bg-bg-elevated/40 p-3">
      <p className="text-xs font-medium mb-2" style={{ color: accent }}>{title}</p>
      <div className="h-44 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 6, right: 12, bottom: 22, left: 0 }}>
            <CartesianGrid stroke={PLOT_THEME.grid} strokeDasharray="3 5" />
            <XAxis
              dataKey="x"
              type="number"
              domain={range}
              tick={{ fill: PLOT_THEME.axis, fontSize: 10 }}
              axisLine={{ stroke: PLOT_THEME.grid }}
              tickLine={{ stroke: PLOT_THEME.grid }}
              tickFormatter={(v) => v.toLocaleString()}
              label={{
                value: unit,
                position: 'insideBottom',
                offset: -8,
                fill: PLOT_THEME.axisLabel,
                fontSize: 10,
              }}
            />
            <YAxis
              tick={{ fill: PLOT_THEME.axis, fontSize: 10 }}
              axisLine={{ stroke: PLOT_THEME.grid }}
              tickLine={{ stroke: PLOT_THEME.grid }}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(1))}
              label={{
                value: yLabel,
                angle: -90,
                position: 'insideLeft',
                fill: PLOT_THEME.axisLabel,
                fontSize: 10,
                offset: 8,
              }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={(v) => `${fmt(v, 4)} ${unit}`}
              formatter={(v) => [
                yLabel.startsWith('$') ? fmtUSDCompact(v) : fmt(v, 3),
                yLabel,
              ]}
            />
            <Line
              type="monotone"
              dataKey="y"
              stroke={accent}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {Number.isFinite(currentY) && (
              <ReferenceDot
                x={x}
                y={currentY}
                r={5}
                fill={PLOT_THEME.hotspot}
                stroke="#0B1220"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 text-[11px] text-text-subtle text-center num">
        @ {x.toLocaleString()} {unit} →{' '}
        <span style={{ color: accent }}>
          {yLabel.startsWith('$') ? fmtUSDCompact(currentY) : `${(currentY ?? 0).toFixed(2)} yr`}
        </span>
      </div>
    </div>
  );
}

// ── Editable assumptions panel ──────────────────────────────────────────
function AssumptionsPanel({ open, onToggle, assumptions, set, reset, dirty }) {
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between bg-bg-elevated/30 hover:bg-bg-elevated/60 transition-colors"
      >
        <span className="field-label text-text-primary inline-flex items-center gap-2">
          <span className="text-text-muted">{open ? '▾' : '▸'}</span>
          Assumptions
          {dirty && (
            <span className="text-[10px] text-accent-cyan bg-accent-cyan/10 px-1.5 py-0.5 rounded">
              edited
            </span>
          )}
        </span>
        {dirty && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); reset(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); reset(); } }}
            className="text-[11px] text-text-muted hover:text-text-primary cursor-pointer"
          >
            reset defaults
          </span>
        )}
      </button>
      {open && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Group title="Plant operation">
            <NumberInput
              label="Operating hours / yr"
              value={assumptions.operatingHours}
              onValue={set('operatingHours')}
              unit="h/yr"
              min={1000}
              max={8760}
            />
            <NumberInput
              label="Catalyst lifetime"
              value={assumptions.catalystLifetimeYears}
              onValue={set('catalystLifetimeYears')}
              unit="yr"
              min={0.25}
            />
            <NumberInput
              label="CEPCI index"
              value={assumptions.cepci}
              onValue={set('cepci')}
              unit="—"
              min={400}
            />
            <NumberInput
              label="Contingency factor"
              value={assumptions.contingencyFactor}
              onValue={set('contingencyFactor')}
              unit="—"
              min={1}
              precision={3}
            />
            <NumberInput
              label="Material factor F_M"
              value={assumptions.materialFactor}
              onValue={set('materialFactor')}
              unit="—"
              min={1}
              precision={3}
            />
          </Group>
          <Group title="Prices">
            <NumberInput
              label="Catalyst price"
              value={assumptions.catalystPrice}
              onValue={set('catalystPrice')}
              unit="$/kg"
              min={1}
            />
            <NumberInput
              label="Propylene price"
              value={assumptions.propylenePrice}
              onValue={set('propylenePrice')}
              unit="$/t"
              min={100}
            />
            <NumberInput
              label="Benzene price"
              value={assumptions.benzenePrice}
              onValue={set('benzenePrice')}
              unit="$/t"
              min={100}
            />
            <NumberInput
              label="Cumene price"
              value={assumptions.cumenePrice}
              onValue={set('cumenePrice')}
              unit="$/t"
              min={100}
            />
            <NumberInput
              label="DIPB credit"
              value={assumptions.dipbPrice}
              onValue={set('dipbPrice')}
              unit="$/t"
              min={0}
            />
          </Group>
          <Group title="Utilities & labor">
            <NumberInput
              label="HP steam price"
              value={assumptions.steamPrice}
              onValue={set('steamPrice')}
              unit="$/GJ"
              min={0}
            />
            <NumberInput
              label="Electricity price"
              value={assumptions.electricityPrice}
              onValue={set('electricityPrice')}
              unit="$/kWh"
              min={0}
              precision={4}
            />
            <NumberInput
              label="Pump efficiency"
              value={assumptions.pumpEfficiency}
              onValue={set('pumpEfficiency')}
              unit="—"
              min={0.1}
              max={1}
              precision={3}
            />
            <NumberInput
              label="Maintenance fraction"
              value={assumptions.maintenanceFraction}
              onValue={set('maintenanceFraction')}
              unit="of TCI/yr"
              min={0}
              precision={3}
            />
            <NumberInput
              label="Operating labor"
              value={assumptions.laborCost}
              onValue={set('laborCost')}
              unit="$/yr"
              min={0}
            />
          </Group>
        </div>
      )}
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ── References footnote ────────────────────────────────────────────────
function References() {
  return (
    <div className="rounded-md border border-border bg-bg-elevated/20 px-4 py-3 text-[11px] text-text-muted leading-relaxed">
      <span className="field-label text-text-muted block mb-1">References</span>
      <ol className="list-decimal pl-4 space-y-0.5">
        <li>
          Turton, Shaeiwitz, Bhattacharyya & Whiting,{' '}
          <em>Analysis, Synthesis and Design of Chemical Processes</em>, 5th ed.
          (2018) — App. A (K₁K₂K₃, F_P), Ch. 7 (F_BM, TCI), Ch. 8 (COM).
        </li>
        <li>
          Seider, Seader, Lewin & Widagdo,{' '}
          <em>Product and Process Design Principles</em>, 4th ed.
        </li>
        <li>
          Sinnott & Towler,{' '}
          <em>Chemical Engineering Design</em> (Coulson Vol. 6), 6th ed.
        </li>
        <li>CEPCI ≈ 800 (2024) · Turton 2001 basis = 567.5.</li>
        <li>ICIS / S&amp;P Platts spot prices, 2024.</li>
      </ol>
    </div>
  );
}
