import React from 'react';
import { fmt } from '../../utils/format.js';

export default function Slider({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  precision = 4,
  className = '',
}) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className={['flex flex-col gap-2 min-w-0', className].join(' ')}>
      {label && (
        <div className="flex items-baseline justify-between gap-2 min-w-0">
          <span className="field-label truncate">{label}</span>
          <span className="text-xs num text-text-primary whitespace-nowrap shrink-0">
            <span className="text-accent-cyan font-semibold">{fmt(value, precision)}</span>
            {unit && <span className="ml-1 text-text-muted">{unit}</span>}
          </span>
        </div>
      )}
      <div className="relative h-6 flex items-center">
        <div
          className="absolute inset-x-0 h-1.5 rounded-full bg-bg-elevated border border-border"
          aria-hidden
        />
        <div
          className="absolute h-1.5 rounded-full bg-gradient-to-r from-accent-cyan to-accent-teal shadow-[0_0_8px_-1px_rgba(34,211,238,0.6)]"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange?.(parseFloat(e.target.value))}
          className="relative z-10 w-full h-6 appearance-none bg-transparent cursor-pointer focus-ring"
          style={{ WebkitAppearance: 'none' }}
        />
      </div>
      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: #0B1220;
          border: 2px solid #22D3EE;
          box-shadow: 0 0 0 3px rgba(34,211,238,0.20), 0 2px 6px rgba(0,0,0,0.4);
          cursor: pointer;
          transition: transform 120ms ease-out, box-shadow 120ms ease-out;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.12);
          box-shadow: 0 0 0 5px rgba(34,211,238,0.22), 0 2px 8px rgba(0,0,0,0.5);
        }
        input[type='range']::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: #0B1220;
          border: 2px solid #22D3EE;
          cursor: pointer;
        }
        input[type='range']::-webkit-slider-runnable-track { background: transparent; }
        input[type='range']::-moz-range-track { background: transparent; }
      `}</style>
    </div>
  );
}
