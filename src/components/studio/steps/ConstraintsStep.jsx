import React from 'react';
import StepShell from '../StepShell.jsx';
import NumberInput from '../../ui/NumberInput.jsx';
import { useReactor } from '../../../hooks/useReactor.js';
import { useUnitSystem } from '../../../hooks/useUnitSystem.js';

export default function ConstraintsStep({ index = 4 }) {
  const { state, set } = useReactor();
  const { label, toDisplay, fromDisplay } = useUnitSystem();
  const c = state.constraints;
  const reactorType = state.reactor.type;

  return (
    <StepShell
      index={index}
      title="Constraints (optional)"
      description="Active constraints flag violations in the output panel."
      defaultOpen={false}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberInput
          label="Max temperature"
          value={c.Tmax == null ? '' : toDisplay(c.Tmax, 'temperature')}
          onValue={(v) =>
            set.constraints({ Tmax: v == null ? null : fromDisplay(v, 'temperature') })
          }
          placeholder="off"
          unit={label('temperature')}
        />
        {reactorType === 'PBR' ? (
          <NumberInput
            label="Max catalyst weight"
            value={c.Wmax == null ? '' : toDisplay(c.Wmax, 'weight')}
            onValue={(v) =>
              set.constraints({ Wmax: v == null ? null : fromDisplay(v, 'weight') })
            }
            placeholder="off"
            unit={label('weight')}
          />
        ) : (
          <NumberInput
            label="Max reactor volume"
            value={c.Vmax == null ? '' : toDisplay(c.Vmax, 'volume')}
            onValue={(v) =>
              set.constraints({ Vmax: v == null ? null : fromDisplay(v, 'volume') })
            }
            placeholder="off"
            unit={label('volume')}
          />
        )}
        <NumberInput
          label="Min selectivity"
          value={c.Smin == null ? '' : c.Smin}
          onValue={(v) => set.constraints({ Smin: v })}
          placeholder="off"
          unit="—"
          min={0}
          max={1}
          precision={3}
        />
      </div>
      <p className="text-xs text-text-muted mt-3">
        Leave blank to disable a constraint. Active constraints appear in the output
        panel as red flags when violated.
      </p>
    </StepShell>
  );
}
