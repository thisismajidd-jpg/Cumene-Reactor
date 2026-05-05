import React from 'react';

export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  className = '',
}) {
  return (
    <label
      className={[
        'flex items-start gap-3 cursor-pointer select-none',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        role="switch"
        aria-checked={!!checked}
        className={[
          'relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full',
          'transition-colors duration-150 ease-smooth focus-ring',
          checked ? 'bg-accent-cyan' : 'bg-bg-elevated border border-border',
        ].join(' ')}
        onClick={() => !disabled && onChange?.(!checked)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            !disabled && onChange?.(!checked);
          }
        }}
        tabIndex={0}
      >
        <span
          className={[
            'inline-block h-5 w-5 rounded-full bg-bg-base shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          ].join(' ')}
        />
      </span>
      <div className="text-left">
        {label && (
          <div className="text-sm text-text-primary font-medium">{label}</div>
        )}
        {description && (
          <div className="text-xs text-text-muted mt-0.5">{description}</div>
        )}
      </div>
    </label>
  );
}
