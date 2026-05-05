import React from 'react';
import StepShell from '../StepShell.jsx';
import NumberInput from '../../ui/NumberInput.jsx';
import { useReactor } from '../../../hooks/useReactor.js';
import { useUnitSystem } from '../../../hooks/useUnitSystem.js';
import { vMolFractions } from '../../../utils/validate.js';

export default function OperatingConditionsStep({ index = 2 }) {
  const { state, set } = useReactor();
  const { label, toDisplay, fromDisplay } = useUnitSystem();
  const c = state.conditions;
  const species = state.reaction.species;

  // Compute mole fractions from current feed (for display only)
  const FT = species.reduce((sum, sp) => sum + (c.feedFlow[sp.id] ?? 0), 0);
  const fracWarning = FT > 0 ? null : 'Total feed flow is zero — set at least one species F₀ > 0';

  const updateFeed = (id, value) => {
    set.feed({ [id]: value });
  };

  return (
    <StepShell
      index={index}
      title="Operating conditions"
      description="Temperature, pressure, feed flow, and target conversion."
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NumberInput
          label="Inlet temperature"
          value={toDisplay(c.T_inlet, 'temperature')}
          onValue={(v) => set.conditions({ T_inlet: fromDisplay(v, 'temperature') })}
          unit={label('temperature')}
        />
        <NumberInput
          label="Inlet pressure"
          value={toDisplay(c.P0, 'pressure')}
          onValue={(v) => set.conditions({ P0: fromDisplay(v, 'pressure') })}
          unit={label('pressure')}
          min={0}
        />
        <NumberInput
          label="Target conversion X"
          value={c.XTarget}
          onValue={(v) => set.conditions({ XTarget: v })}
          unit="—"
          min={0}
          max={0.9999}
          precision={4}
        />
        <div />
      </div>

      <div className="mt-6">
        <h4 className="field-label mb-2">Feed molar flow rates</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {species.map((sp) => (
            <NumberInput
              key={sp.id}
              label={`F₀ (${sp.id})`}
              value={toDisplay(c.feedFlow[sp.id] ?? 0, 'flow')}
              onValue={(v) => updateFeed(sp.id, fromDisplay(v, 'flow'))}
              unit={label('flow')}
              min={0}
            />
          ))}
        </div>
        {fracWarning && (
          <p className="text-xs text-state-warning mt-3">{fracWarning}</p>
        )}
        {FT > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-text-muted">
            {species.map((sp) => {
              const F = c.feedFlow[sp.id] ?? 0;
              const y = F / FT;
              return (
                <div key={sp.id}>
                  y<sub>{sp.id}</sub> ={' '}
                  <span className="num text-text-primary">{y.toFixed(4)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StepShell>
  );
}
