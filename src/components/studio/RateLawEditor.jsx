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
