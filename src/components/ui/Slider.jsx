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
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={['flex flex-col gap-1.5', className].join(' ')}>
      {label && (
        <div className="flex items-baseline justify-between">
          <span className="field-label">{label}</span>
          <span className="text-xs num text-text-primary">
            {fmt(value, precision)}
            {unit && <span className="ml-1 text-text-muted">{unit}</span>}
          </span>
        </div>
      )}
      <div className="relative h-6 flex items-center">
        <div
          className="absolute inset-x-0 h-1 rounded-full bg-bg-elevated border border-border"
          aria-hidden
        />
        <div
          className="absolute h-1 rounded-full bg-accent-cyan/70"
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
          style={{
            // Custom thumb via CSS
            WebkitAppearance: 'none',
          }}
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
          box-shadow: 0 0 0 3px rgba(34,211,238,0.18);
          cursor: pointer;
        }
        input[type='range']::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: #0B1220;
          border: 2px solid #22D3EE;
          cursor: pointer;
        }
        input[type='range']::-webkit-slider-runnable-track {
          background: transparent;
        }
        input[type='range']::-moz-range-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
}
