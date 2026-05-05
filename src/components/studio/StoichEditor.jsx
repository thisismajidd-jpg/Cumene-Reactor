import React from 'react';
import NumberInput from '../ui/NumberInput.jsx';

/**
 * Edit stoichiometric coefficients for one reaction.
 * Convention: ν < 0 reactant, ν > 0 product, ν = 0 spectator.
 */
export default function StoichEditor({ rxn, species, update }) {
  const setNu = (id, nu) => {
    const next = { ...rxn.stoich, [id]: nu };
    if (nu === 0) delete next[id];
    update({ stoich: next });
  };

  const reactantSide = species
    .filter((s) => (rxn.stoich[s.id] ?? 0) < 0)
    .map((s) => `${Math.abs(rxn.stoich[s.id]) === 1 ? '' : Math.abs(rxn.stoich[s.id])}${s.id}`)
    .join(' + ');
  const productSide = species
    .filter((s) => (rxn.stoich[s.id] ?? 0) > 0)
    .map((s) => `${rxn.stoich[s.id] === 1 ? '' : rxn.stoich[s.id]}${s.id}`)
    .join(' + ');

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-bg-elevated px-4 py-3 num text-sm text-accent-cyan">
        {reactantSide || '—'} <span className="text-text-muted">→</span>{' '}
        {productSide || '—'}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {species.map((sp) => (
          <NumberInput
            key={sp.id}
            label={`ν (${sp.id})`}
            value={rxn.stoich[sp.id] ?? 0}
            onValue={(v) => setNu(sp.id, v)}
            precision={3}
            hint={
              (rxn.stoich[sp.id] ?? 0) < 0
                ? 'reactant'
                : (rxn.stoich[sp.id] ?? 0) > 0
                ? 'product'
                : 'spectator'
            }
          />
        ))}
      </div>
    </div>
  );
}
