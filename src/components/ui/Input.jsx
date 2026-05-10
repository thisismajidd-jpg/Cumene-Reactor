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
    <div className={['flex flex-col gap-1.5 min-w-0', className].join(' ')}>
      {label && (
        <label
          htmlFor={inputId}
          className="field-label leading-tight break-words flex items-end min-h-[2.5rem]"
          title={typeof label === 'string' ? label : undefined}
        >
          <span>{label}</span>
        </label>
      )}
      <div
        className={[
          'group flex items-center min-w-0 rounded-md bg-bg-elevated border transition-colors overflow-hidden',
          error
            ? 'border-state-danger/60'
            : 'border-border focus-within:border-accent-cyan focus-within:shadow-glow',
        ].join(' ')}
      >
        <input
          id={inputId}
          {...rest}
          className={[
            'flex-1 min-w-0 bg-transparent px-3 h-11 text-sm num text-text-primary',
            'placeholder:text-text-subtle outline-none',
          ].join(' ')}
        />
        {unit && (
          <span
            title={typeof unit === 'string' ? unit : undefined}
            className="shrink-0 max-w-[14ch] overflow-hidden text-ellipsis whitespace-nowrap pr-3 pl-1 text-xs text-text-muted font-mono"
          >
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
