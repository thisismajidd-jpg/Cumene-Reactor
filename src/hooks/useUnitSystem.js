// Tiny shim that exposes the global unit-system value plus convenience converters
// already bound to the active system.

import { useReactor } from './useReactor.js';
import { toDisplay, fromDisplay, unitLabel } from '../utils/units.js';

export function useUnitSystem() {
  const { state, set } = useReactor();
  const system = state.unitSystem;
  return {
    system,
    setSystem: set.unitSystem,
    isSI: system === 'si',
    isEngineering: system === 'engineering',
    label: (dim) => unitLabel(dim, system),
    toDisplay: (value, dim) => toDisplay(value, dim, system),
    fromDisplay: (value, dim) => fromDisplay(value, dim, system),
  };
}
