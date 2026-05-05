import React from 'react';

/**
 * Visually-rich selectable card for reactor type (PFR / CSTR / PBR).
 */
export default function ReactorTypeCard({
  active,
  title,
  subtitle,
  icon,
  onClick,
  description,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'relative text-left rounded-xl p-4 border transition-all duration-150 ease-smooth focus-ring',
        active
          ? 'border-accent-cyan bg-accent-cyan/10 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.5),0_0_24px_-8px_rgba(34,211,238,0.45)]'
          : 'border-border bg-bg-elevated hover:border-border-strong',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className={[
          'shrink-0 w-10 h-10 rounded-md grid place-items-center',
          active ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-bg-surface text-text-muted',
        ].join(' ')}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="font-display font-semibold text-text-primary">
            {title}
          </div>
          <div className="text-xs text-text-muted mt-0.5">{subtitle}</div>
          {description && (
            <p className="text-xs text-text-muted mt-2 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {active && (
        <span className="absolute top-3 right-3 text-accent-cyan text-xs font-semibold">
          Selected
        </span>
      )}
    </button>
  );
}

export const reactorIcons = {
  PFR: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="9" width="18" height="6" rx="1" />
      <path d="M2 12h1M21 12h1" />
    </svg>
  ),
  CSTR: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="6" width="12" height="14" rx="2" />
      <path d="M9 11l3 3 3-3M12 14V8" />
    </svg>
  ),
  PBR: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="9" width="18" height="6" rx="1" />
      <circle cx="7" cy="12" r="0.9" fill="currentColor" />
      <circle cx="10" cy="12" r="0.9" fill="currentColor" />
      <circle cx="13" cy="12" r="0.9" fill="currentColor" />
      <circle cx="16" cy="12" r="0.9" fill="currentColor" />
      <circle cx="19" cy="12" r="0.9" fill="currentColor" />
    </svg>
  ),
};
