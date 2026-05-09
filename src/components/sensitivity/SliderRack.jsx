import React from 'react';
import Slider from '../ui/Slider.jsx';
import { useReactor } from '../../hooks/useReactor.js';
import { useUnitSystem } from '../../hooks/useUnitSystem.js';

/**
 * Live sliders for the most sensitive design variables. Each move
 * updates the global state, which triggers useAutoSolve (debounced) and
 * the existing OutputPanel re-renders automatically.
 */
export default function SliderRack() {
  const { state, set } = useReactor();
  const { label, toDisplay, fromDisplay } = useUnitSystem();
  const r = state.reactor;
  const c = state.conditions;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <Slider
        label="Inlet temperature"
        unit={label('temperature')}
        min={toDisplay(450, 'temperature')}
        max={toDisplay(800, 'temperature')}
        step={1}
        value={toDisplay(c.T_inlet, 'temperature')}
        onChange={(v) => set.conditions({ T_inlet: fromDisplay(v, 'temperature') })}
      />
      <Slider
        label="Coolant temperature"
        unit={label('temperature')}
        min={toDisplay(400, 'temperature')}
        max={toDisplay(750, 'temperature')}
        step={1}
        value={toDisplay(r.nonIso.Ta, 'temperature')}
        onChange={(v) => set.nonIso({ Ta: fromDisplay(v, 'temperature') })}
      />
      <Slider
        label="Heat-transfer coefficient U"
        unit={label('htc')}
        min={toDisplay(10, 'htc')}
        max={toDisplay(300, 'htc')}
        step={1}
        value={toDisplay(r.nonIso.U, 'htc')}
        onChange={(v) => set.nonIso({ U: fromDisplay(v, 'htc') })}
      />
      <Slider
        label="Inlet pressure"
        unit={label('pressure')}
        min={toDisplay(1e5, 'pressure')}
        max={toDisplay(60e5, 'pressure')}
        step={toDisplay(1e4, 'pressure')}
        value={toDisplay(c.P0, 'pressure')}
        onChange={(v) => set.conditions({ P0: fromDisplay(v, 'pressure') })}
      />
    </div>
  );
}
