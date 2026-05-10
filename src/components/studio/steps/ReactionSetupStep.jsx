import React from 'react';
import StepShell from '../StepShell.jsx';
import SpeciesEditor from '../SpeciesEditor.jsx';
import RateLawEditor from '../RateLawEditor.jsx';
import StoichEditor from '../StoichEditor.jsx';
import Toggle from '../../ui/Toggle.jsx';
import { useReactor } from '../../../hooks/useReactor.js';

export default function ReactionSetupStep({ index = 1 }) {
  const { state, set } = useReactor();
  const rx = state.reaction;

  return (
    <StepShell
      index={index}
      title="Reaction setup"
      description="Species, kinetics, and stoichiometry. Toggle a side reaction for selectivity analysis."
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

        <div className="border-t border-border pt-5">
          <Toggle
            checked={rx.sideReactionEnabled}
            onChange={(v) => set.toggleSide(v)}
            label="Enable side reaction"
            description="Adds a second reaction (e.g. A + C → D) for selectivity analysis."
          />
        </div>

        {rx.sideReactionEnabled && (
          <div className="space-y-6 pl-4 border-l-2 border-accent-cyan/30">
            <section>
              <h4 className="field-label mb-3">Side reaction · stoichiometry</h4>
              <StoichEditor
                rxn={rx.side}
                species={rx.species}
                update={(patch) => set.side(patch)}
              />
            </section>
            <section>
              <h4 className="field-label mb-3">Side reaction · kinetics</h4>
              <RateLawEditor
                rxn={rx.side}
                species={rx.species}
                update={(patch) => set.side(patch)}
              />
            </section>
          </div>
        )}
      </div>
    </StepShell>
  );
}
