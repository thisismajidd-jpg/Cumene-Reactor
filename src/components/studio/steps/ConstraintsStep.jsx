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
  const ergunOn = state.reactor.pbr.ergunEnabled;

  // SI bound to display, and back. Returns null when display value is null.
  const dimSet = (key, dim) => (v) => {
    set.constraints({ [key]: v == null ? null : fromDisplay(v, dim) });
  };
  const dimGet = (key, dim) => (c[key] == null ? '' : toDisplay(c[key], dim));

  return (
    <StepShell
      index={index}
      title="Constraints (optional)"
      description="Active constraints flag violations in the output panel and steer the optimizer."
      defaultOpen={false}
    >
      {/* ── Thermal constraints ────────────────────────────────────────────── */}
      <SectionHeader title="Thermal" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <NumberInput
          label="Max temperature (Tmax)"
          value={dimGet('Tmax', 'temperature')}
          onValue={dimSet('Tmax', 'temperature')}
          placeholder="off"
          unit={label('temperature')}
        />
        <NumberInput
          label="Min temperature (Tmin)"
          value={dimGet('Tmin', 'temperature')}
          onValue={dimSet('Tmin', 'temperature')}
          placeholder="off"
          unit={label('temperature')}
        />
        <NumberInput
          label="Max ΔT above inlet (ΔTmax)"
          value={c.dTmax == null ? '' : c.dTmax}
          onValue={(v) => set.constraints({ dTmax: v })}
          placeholder="off"
          unit="K"
          min={0}
        />
      </div>

      {/* ── Sizing constraints ─────────────────────────────────────────────── */}
      <SectionHeader title="Sizing" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {reactorType === 'PBR' ? (
          <NumberInput
            label="Max catalyst weight (Wmax)"
            value={dimGet('Wmax', 'weight')}
            onValue={dimSet('Wmax', 'weight')}
            placeholder="off"
            unit={label('weight')}
            min={0}
          />
        ) : (
          <NumberInput
            label="Max reactor volume (Vmax)"
            value={dimGet('Vmax', 'volume')}
            onValue={dimSet('Vmax', 'volume')}
            placeholder="off"
            unit={label('volume')}
            min={0}
          />
        )}
        {reactorType === 'PBR' && ergunOn && (
          <>
            <NumberInput
              label="Min outlet pressure (Pmin)"
              value={dimGet('Pmin', 'pressure')}
              onValue={dimSet('Pmin', 'pressure')}
              placeholder="off"
              unit={label('pressure')}
              min={0}
            />
            <NumberInput
              label="Max pressure drop (ΔPmax)"
              value={dimGet('dPmax', 'pressure')}
              onValue={dimSet('dPmax', 'pressure')}
              placeholder="off"
              unit={label('pressure')}
              min={0}
            />
          </>
        )}
      </div>

      {/* ── Performance constraints ────────────────────────────────────────── */}
      <SectionHeader title="Performance" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NumberInput
          label="Min conversion (Xmin)"
          value={c.Xmin == null ? '' : c.Xmin}
          onValue={(v) => set.constraints({ Xmin: v })}
          placeholder="off"
          unit="—"
          min={0}
          max={1}
          precision={4}
        />
        <NumberInput
          label="Max conversion (Xmax)"
          value={c.Xmax == null ? '' : c.Xmax}
          onValue={(v) => set.constraints({ Xmax: v })}
          placeholder="off"
          unit="—"
          min={0}
          max={1}
          precision={4}
        />
        <NumberInput
          label="Min yield (Ymin)"
          value={c.Ymin == null ? '' : c.Ymin}
          onValue={(v) => set.constraints({ Ymin: v })}
          placeholder="off"
          unit="—"
          min={0}
          max={1}
          precision={4}
        />
        <NumberInput
          label="Min selectivity (Smin)"
          value={c.Smin == null ? '' : c.Smin}
          onValue={(v) => set.constraints({ Smin: v })}
          placeholder="off"
          unit="—"
          min={0}
          max={1}
          precision={4}
        />
      </div>

      <p className="text-xs text-text-muted mt-4">
        Leave any field blank to disable that constraint. Active constraints surface
        as warnings in the Summary tab and steer the Optimizer with a soft penalty.
      </p>
    </StepShell>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-1">
      <span className="field-label text-accent-cyan">{title}</span>
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}
