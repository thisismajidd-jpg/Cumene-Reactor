import React from 'react';
import StepShell from '../StepShell.jsx';
import NumberInput from '../../ui/NumberInput.jsx';
import Toggle from '../../ui/Toggle.jsx';
import ReactorTypeCard, { reactorIcons } from '../ReactorTypeCard.jsx';
import { useReactor } from '../../../hooks/useReactor.js';
import { useUnitSystem } from '../../../hooks/useUnitSystem.js';

const REACTORS = [
  {
    id: 'PFR',
    title: 'PFR',
    subtitle: 'Plug-flow reactor',
    description: 'Continuous, no axial mixing. Volume-based design equation.',
  },
  {
    id: 'CSTR',
    title: 'CSTR',
    subtitle: 'Continuous stirred tank',
    description: 'Perfectly mixed; algebraic balance with possible multiple steady states.',
  },
  {
    id: 'PBR',
    title: 'PBR',
    subtitle: 'Packed-bed reactor',
    description: 'Catalyst-weight basis with optional Ergun pressure drop.',
  },
];

export default function ReactorConfigStep({ index = 3 }) {
  const { state, set } = useReactor();
  const { label, toDisplay, fromDisplay } = useUnitSystem();
  const r = state.reactor;

  const setType = (type) => set.reactor({ type });
  const updPbr = (patch) => set.reactorField('pbr', patch);
  const updPfr = (patch) => set.reactorField('pfr', patch);
  const updCstr = (patch) => set.reactorField('cstr', patch);
  const updNonIso = (patch) => set.nonIso(patch);

  return (
    <StepShell
      index={index}
      title="Reactor configuration"
      description="Choose a reactor type and configure its sizing + thermal mode."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {REACTORS.map((rt) => (
          <ReactorTypeCard
            key={rt.id}
            active={r.type === rt.id}
            title={rt.title}
            subtitle={rt.subtitle}
            description={rt.description}
            icon={reactorIcons[rt.id]}
            onClick={() => setType(rt.id)}
          />
        ))}
      </div>

      {r.type === 'PFR' && (
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Reactor volume V"
            value={toDisplay(r.pfr.V, 'volume')}
            onValue={(v) => updPfr({ V: fromDisplay(v, 'volume') })}
            unit={label('volume')}
            min={0}
          />
        </div>
      )}

      {r.type === 'CSTR' && (
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Reactor volume V"
            value={toDisplay(r.cstr.V, 'volume')}
            onValue={(v) => updCstr({ V: fromDisplay(v, 'volume') })}
            unit={label('volume')}
            min={0}
          />
        </div>
      )}

      {r.type === 'PBR' && (
        <div className="space-y-4">
          {/* Catalyst weight is no longer a user knob — it is derived from
              the target conversion and the kinetics, then surfaced in the
              Summary tab (Required W per tube / Required W total).  The
              solver still keeps a hidden "envelope" value in state.pbr.W
              that it auto-extends until X_target is reached. */}
          <p className="text-xs text-text-muted">
            Catalyst weight is computed from the target conversion you set in step 2
            and shown in the Summary as <em>Required W per tube</em> and{' '}
            <em>Required W total</em>. Specify the tube geometry and packing below.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumberInput
              label="# Tubes"
              value={r.pbr.tubes}
              onValue={(v) => updPbr({ tubes: Math.max(1, Math.round(v)) })}
              precision={0}
              unit="—"
              min={1}
            />
            <NumberInput
              label="Tube diameter Dₜ"
              value={toDisplay(r.pbr.Dt, 'length')}
              onValue={(v) => updPbr({ Dt: fromDisplay(v, 'length') })}
              unit={label('length')}
              min={0}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <NumberInput
              label="Particle Dₚ"
              value={toDisplay(r.pbr.Dp, 'length')}
              onValue={(v) => updPbr({ Dp: fromDisplay(v, 'length') })}
              unit={label('length')}
              min={0}
            />
            <NumberInput
              label="Void fraction φ"
              value={r.pbr.phi}
              onValue={(v) => updPbr({ phi: v })}
              unit="—"
              min={0}
              max={1}
              precision={3}
            />
            <NumberInput
              label="Bulk density ρ_b"
              value={r.pbr.rho_b}
              onValue={(v) => updPbr({ rho_b: v })}
              unit="kg/m³"
              min={0}
            />
            <NumberInput
              label="Gas viscosity μ"
              value={toDisplay(r.pbr.mu, 'viscosity')}
              onValue={(v) => updPbr({ mu: fromDisplay(v, 'viscosity') })}
              unit={label('viscosity')}
              min={0}
              precision={4}
            />
          </div>
          <Toggle
            checked={r.pbr.ergunEnabled}
            onChange={(v) => updPbr({ ergunEnabled: v })}
            label="Ergun pressure drop"
            description="Couples dy/dW to the mole balance (y = P/P₀)."
          />
        </div>
      )}

      <div className="border-t border-border my-6" />

      <Toggle
        checked={!r.isothermal}
        onChange={(v) => set.reactor({ isothermal: !v })}
        label="Non-isothermal operation"
        description="Solves the energy balance alongside the mole balance."
      />
      {!r.isothermal && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <NumberInput
            label="Coolant temp Tₐ"
            value={toDisplay(r.nonIso.Ta, 'temperature')}
            onValue={(v) => updNonIso({ Ta: fromDisplay(v, 'temperature') })}
            unit={label('temperature')}
          />
          <NumberInput
            label="Heat-transfer coeff. U"
            value={toDisplay(r.nonIso.U, 'htc')}
            onValue={(v) => updNonIso({ U: fromDisplay(v, 'htc') })}
            unit={label('htc')}
            min={0}
          />
        </div>
      )}
    </StepShell>
  );
}
