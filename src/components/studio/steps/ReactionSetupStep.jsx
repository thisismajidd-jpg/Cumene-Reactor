import React from 'react';
import StepShell from '../StepShell.jsx';
import SpeciesEditor from '../SpeciesEditor.jsx';
import RateLawEditor from '../RateLawEditor.jsx';
import StoichEditor from '../StoichEditor.jsx';
import Button from '../../ui/Button.jsx';
import { useReactor } from '../../../hooks/useReactor.js';

export default function ReactionSetupStep({ index = 1 }) {
  const { state, set } = useReactor();
  const rx = state.reaction;
  const sides = rx.sides ?? [];

  // Build a sensible seed from the current species table when the user adds
  // a new side reaction.  Picks the first reactant and the first product the
  // table already has so the editor doesn't show a fully-empty stoichiometry.
  const buildSeed = () => {
    const ids = rx.species.map((s) => s.id);
    const stoich = {};
    if (ids[0]) stoich[ids[0]] = -1;
    if (ids[2]) stoich[ids[2]] = -1;
    if (ids[3]) stoich[ids[3]] = 1;
    return {
      type: 'powerLaw',
      stoich,
      k0: 1e3,
      Ea: 90_000,
      orders: ids.slice(0, 2).map((id) => ({ species: id, alpha: 1 })),
      adsorption: [],
      dHrx: -100_000,
      desired: false,
    };
  };

  return (
    <StepShell
      index={index}
      title="Reaction setup"
      description="Species, kinetics, and stoichiometry. Add side reactions to model selectivity, over-oxidation, etc."
    >
      <div className="space-y-6">
        <section>
          <h4 className="field-label mb-3">Species</h4>
          <SpeciesEditor />
        </section>

        <section>
          <h4 className="field-label mb-3">Primary reaction · stoichiometry</h4>
          <StoichEditor
            rxn={rx.primary}
            species={rx.species}
            update={(patch) => set.primary(patch)}
          />
        </section>

        <section>
          <h4 className="field-label mb-3">Primary reaction · kinetics</h4>
          <RateLawEditor
            rxn={rx.primary}
            species={rx.species}
            update={(patch) => set.primary(patch)}
          />
        </section>

        {/* ── Side reactions: an open-ended list ──────────────────────── */}
        <div className="border-t border-border pt-5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="field-label">Side reactions</h4>
              <p className="text-xs text-text-muted mt-1">
                {sides.length === 0
                  ? 'No side reactions. The Selectivity tab and many cost-side terms unlock once you add one.'
                  : `${sides.length} side reaction${sides.length > 1 ? 's' : ''} active (R₂ … R${sides.length + 1}).`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => set.addSide(buildSeed())}
            >
              + Add side reaction
            </Button>
          </div>

          {sides.map((sideRxn, i) => (
            <SideReactionCard
              key={i}
              index={i}
              rxn={sideRxn}
              species={rx.species}
              onUpdate={(patch) => set.sideAt(i, patch)}
              onRemove={() => set.removeSide(i)}
            />
          ))}
        </div>
      </div>
    </StepShell>
  );
}

/**
 * One side reaction in the wizard — labelled R₂, R₃, …, with its own
 * stoichiometry and kinetics editors and a Remove button.
 */
function SideReactionCard({ index, rxn, species, onUpdate, onRemove }) {
  const num = index + 2; // primary is R1 visually
  return (
    <div className="pl-4 border-l-2 border-accent-cyan/30 space-y-6 relative">
      <div className="flex items-center justify-between">
        <h5 className="field-label text-accent-cyan">
          Side reaction R<sub>{num}</sub>
        </h5>
        <Button
          variant="ghost"
          size="sm"
          className="text-text-muted hover:text-state-danger"
          onClick={onRemove}
          aria-label={`Remove side reaction ${num}`}
        >
          Remove
        </Button>
      </div>

      <section>
        <h4 className="field-label mb-3">
          R<sub>{num}</sub> · stoichiometry
        </h4>
        <StoichEditor rxn={rxn} species={species} update={onUpdate} />
      </section>

      <section>
        <h4 className="field-label mb-3">
          R<sub>{num}</sub> · kinetics
        </h4>
        <RateLawEditor rxn={rxn} species={species} update={onUpdate} />
      </section>
    </div>
  );
}
