import React from 'react';
import Input from '../ui/Input.jsx';
import NumberInput from '../ui/NumberInput.jsx';
import Button from '../ui/Button.jsx';
import { useReactor } from '../../hooks/useReactor.js';

/**
 * Edit species names, formulas, MW. Used by ReactionSetupStep.
 * The species list is the source of truth for stoichiometry pickers in this Studio.
 */
export default function SpeciesEditor() {
  const { state, set } = useReactor();
  const species = state.reaction.species;

  const update = (idx, patch) => {
    const next = species.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    set.species(next);
  };

  const addSpecies = () => {
    const ids = species.map((s) => s.id);
    const next = nextLetter(ids);
    set.species([
      ...species,
      { id: next, name: next, formula: '', mw: 0, isInert: false, isLimiting: false },
    ]);
  };

  const removeSpecies = (idx) => {
    if (species.length <= 2) return;
    const next = species.filter((_, i) => i !== idx);
    set.species(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-2 text-xs text-text-muted px-1">
        <div className="col-span-2">ID</div>
        <div className="col-span-4">Name</div>
        <div className="col-span-3">Formula</div>
        <div className="col-span-2">MW (g/mol)</div>
        <div className="col-span-1" />
      </div>
      {species.map((sp, i) => (
        <div key={sp.id} className="grid grid-cols-12 gap-2 items-center">
          <Input
            className="col-span-2"
            value={sp.id}
            onChange={(e) => update(i, { id: e.target.value.trim().slice(0, 3).toUpperCase() })}
            aria-label={`Species ${i + 1} id`}
          />
          <Input
            className="col-span-4"
            value={sp.name}
            onChange={(e) => update(i, { name: e.target.value })}
            aria-label={`Species ${i + 1} name`}
          />
          <Input
            className="col-span-3"
            value={sp.formula}
            onChange={(e) => update(i, { formula: e.target.value })}
            aria-label={`Species ${i + 1} formula`}
          />
          <NumberInput
            className="col-span-2"
            value={sp.mw}
            onValue={(v) => update(i, { mw: v })}
            min={0}
            aria-label={`Species ${i + 1} molecular weight`}
          />
          <Button
            variant="ghost"
            size="sm"
            className="col-span-1 px-2 text-text-muted hover:text-state-danger"
            onClick={() => removeSpecies(i)}
            disabled={species.length <= 2}
            aria-label={`Remove species ${sp.id}`}
          >
            ✕
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addSpecies}>
        + Add species
      </Button>
    </div>
  );
}

function nextLetter(ids) {
  const used = new Set(ids);
  for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (!used.has(c)) return c;
  }
  return `S${ids.length + 1}`;
}
