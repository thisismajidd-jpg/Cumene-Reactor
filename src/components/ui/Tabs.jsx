import React, { useId } from 'react';

/**
 * Accessible tab list.
 *
 *   <Tabs value={tab} onChange={setTab} tabs={[
 *     { id: 'X', label: 'Conversion' },
 *     { id: 'T', label: 'Temperature', disabled: isothermal },
 *   ]} />
 */
export function Tabs({ value, onChange, tabs, className = '' }) {
  const baseId = useId();
  const handleKey = (e) => {
    const idx = tabs.findIndex((t) => t.id === value);
    if (idx === -1) return;
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    while (tabs[next].disabled && next !== idx) {
      next = (next + 1) % tabs.length;
    }
    onChange(tabs[next].id);
  };

  return (
    <div
      role="tablist"
      onKeyDown={handleKey}
      className={[
        'flex items-stretch gap-1 p-1 rounded-md bg-bg-elevated border border-border',
        'overflow-x-auto',
        className,
      ].join(' ')}
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${baseId}-${t.id}`}
            aria-selected={active}
            aria-disabled={t.disabled || undefined}
            disabled={t.disabled}
            onClick={() => !t.disabled && onChange(t.id)}
            className={[
              'inline-flex items-center gap-2 px-3 h-9 rounded text-sm font-medium',
              'transition-colors duration-150 ease-smooth focus-ring whitespace-nowrap',
              t.disabled && 'opacity-40 cursor-not-allowed',
              active
                ? 'bg-bg-surface text-accent-cyan shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-surface',
            ]
              .filter(Boolean)
              .join(' ')}
            tabIndex={active ? 0 : -1}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge != null && (
              <span className="num text-[10px] text-text-muted">{t.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
