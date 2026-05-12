import React from 'react';
import { useUnitSystem } from '../../hooks/useUnitSystem.js';

const OPTIONS = [
  { id: 'si', label: 'SI', hint: 'mol/s · K · bar · m³ · kg' },
  { id: 'engineering', label: 'Eng', hint: 'lbmol/hr · °F · psi · gal · lb' },
];

export default function UnitToggle({ className = '' }) {
  const { system, setSystem } = useUnitSystem();
  return (
    <div
      role="radiogroup"
      aria-label="Unit system"
      className={[
        'inline-flex items-center rounded-md bg-bg-elevated border border-border p-1',
        className,
      ].join(' ')}
    >
      {OPTIONS.map((opt) => {
        const active = system === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.hint}
            onClick={() => setSystem(opt.id)}
            className={[
              'px-3 h-7 rounded text-xs font-medium transition-colors focus-ring',
              active
                ? 'bg-accent-cyan/15 text-accent-cyan'
                : 'text-text-muted hover:text-text-primary',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
