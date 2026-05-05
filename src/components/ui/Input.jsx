import React from 'react';

export default function Input({
  label,
  hint,
  error,
  unit,
  id,
  className = '',
  ...rest
}) {
  const inputId = id || rest.name;
  return (
    <div className={['flex flex-col gap-1.5', className].join(' ')}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <div
        className={[
          'group flex items-center rounded-md bg-bg-elevated border transition-colors',
          error
            ? 'border-state-danger/60'
            : 'border-border focus-within:border-accent-cyan focus-within:shadow-glow',
        ].join(' ')}
      >
        <input
          id={inputId}
          {...rest}
          className={[
            'flex-1 bg-transparent px-3 h-11 text-sm num text-text-primary',
            'placeholder:text-text-subtle outline-none',
          ].join(' ')}
        />
        {unit && (
          <span className="pr-3 pl-1 text-xs text-text-muted font-mono whitespace-nowrap">
            {unit}
          </span>
        )}
      </div>
      {error ? (
        <p className="text-xs text-state-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
