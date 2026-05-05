import React from 'react';

export default function Select({
  label,
  hint,
  error,
  id,
  options = [],
  className = '',
  ...rest
}) {
  const selectId = id || rest.name;
  return (
    <div className={['flex flex-col gap-1.5', className].join(' ')}>
      {label && (
        <label htmlFor={selectId} className="field-label">
          {label}
        </label>
      )}
      <div
        className={[
          'flex items-center rounded-md bg-bg-elevated border transition-colors',
          error
            ? 'border-state-danger/60'
            : 'border-border focus-within:border-accent-cyan focus-within:shadow-glow',
        ].join(' ')}
      >
        <select
          id={selectId}
          {...rest}
          className={[
            'flex-1 bg-transparent px-3 h-11 text-sm text-text-primary',
            'outline-none appearance-none cursor-pointer',
          ].join(' ')}
        >
          {options.map((opt) =>
            typeof opt === 'string' ? (
              <option key={opt} value={opt} className="bg-bg-surface">
                {opt}
              </option>
            ) : (
              <option key={opt.value} value={opt.value} className="bg-bg-surface">
                {opt.label}
              </option>
            )
          )}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="mr-3 h-4 w-4 text-text-muted"
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {error ? (
        <p className="text-xs text-state-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
