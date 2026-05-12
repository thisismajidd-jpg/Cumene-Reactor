import React from 'react';
import NumberInput from '../ui/NumberInput.jsx';
import Select from '../ui/Select.jsx';
import { useUnitSystem } from '../../hooks/useUnitSystem.js';
import { RATE_LAW_TYPES } from '../../utils/constants.js';
import Equation from '../ui/Equation.jsx';

/**
 * Editor for one reaction's rate-law descriptor.
 * Receives `rxn` (primary or side) and an `update` function that patches it.
 *
 * Note: stoichiometry editing is handled by StoichEditor separately.
 */
export default function RateLawEditor({ rxn, species, update }) {
  const { label, toDisplay, fromDisplay } = useUnitSystem();

  const setOrder = (sp, alpha) => {
    const others = (rxn.orders || []).filter((o) => o.species !== sp);
    const next = alpha === 0 ? others : [...others, { species: sp, alpha }];
    update({ orders: next });
  };

  const orderFor = (sp) => {
    const o = (rxn.orders || []).find((x) => x.species === sp);
    return o ? o.alpha : 0;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Rate-law type"
          value={rxn.type}
          onChange={(e) => update({ type: e.target.value })}
          options={RATE_LAW_TYPES.map((rl) => ({ value: rl.id, label: rl.label }))}
        />
        <NumberInput
          label="Pre-exponential k₀"
          value={rxn.k0}
          onValue={(v) => update({ k0: v })}
          unit="(units depend on rate law)"
          min={0}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label="Activation energy Eₐ"
          value={toDisplay(rxn.Ea, 'energy')}
          onValue={(v) => update({ Ea: fromDisplay(v, 'energy') })}
          unit={label('energy')}
          min={0}
        />
        <NumberInput
          label="Heat of reaction ΔH"
          value={toDisplay(rxn.dHrx, 'energy')}
          onValue={(v) => update({ dHrx: fromDisplay(v, 'energy') })}
          unit={label('energy')}
        />
      </div>

      <ThermicityBadge dHrx={rxn.dHrx} />

      <div>
        <p className="field-label mb-2">Reaction orders α (per species)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {species.map((sp) => (
            <NumberInput
              key={sp.id}
              label={`α (${sp.id})`}
              value={orderFor(sp.id)}
              onValue={(v) => setOrder(sp.id, v)}
              precision={3}
              unit="—"
              min={0}
            />
          ))}
        </div>
        <p className="text-xs text-text-muted mt-2">
          For elementary kinetics use |ν<sub>i</sub>| (orders match stoichiometric coefficients).
        </p>
      </div>

      <RatePreview rxn={rxn} />
    </div>
  );
}

function ThermicityBadge({ dHrx }) {
  // ΔH is auto-classified: <0 exothermic, >0 endothermic, =0 thermoneutral.
  // No user toggle — the sign of ΔH is the source of truth.
  if (!Number.isFinite(dHrx) || dHrx === 0) {
    return (
      <div className="rounded-md border border-border bg-bg-elevated/40 px-3 py-2 text-xs text-text-muted">
        ΔH = 0 — thermoneutral
      </div>
    );
  }
  const exo = dHrx < 0;
  return (
    <div
      className={[
        'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs border',
        exo
          ? 'border-state-danger/40 bg-state-danger/10 text-state-danger'
          : 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan',
      ].join(' ')}
      title={
        exo
          ? 'ΔH < 0 — releases heat. Energy balance shows T rising (or cooling needed).'
          : 'ΔH > 0 — absorbs heat. Energy balance shows T dropping (or heating needed).'
      }
    >
      <span aria-hidden>{exo ? '🔥' : '❄'}</span>
      <span className="font-medium">
        {exo ? 'Exothermic' : 'Endothermic'}
      </span>
      <span className="text-text-muted">
        · auto-detected from ΔH sign
      </span>
    </div>
  );
}

function RatePreview({ rxn }) {
  const orders = (rxn.orders || []).filter((o) => o.alpha !== 0);
  const concs = orders
    .map(({ species, alpha }) => (alpha === 1 ? `C_{${species}}` : `C_{${species}}^{${alpha}}`))
    .join('\\,');
  const expr =
    rxn.type === 'langmuirHinshelwood'
      ? `r = \\frac{k(T)\\,${concs || 'C_A C_B'}}{(1 + \\sum_i K_i C_i)^{2}}`
      : `r = k(T)\\,${concs || 'C_A C_B'}`;
  return (
    <div className="rounded-md border border-border bg-bg-elevated px-4 py-3">
      <p className="field-label mb-1">Rate-law preview</p>
      <Equation latex={expr} display />
    </div>
  );
}
