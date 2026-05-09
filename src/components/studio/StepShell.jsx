import React, { useState } from 'react';

/**
 * Collapsible step container with a numbered badge and a section title.
 * Steps default to expanded; each can be collapsed by clicking the header.
 */
export default function StepShell({
  index,
  title,
  description,
  defaultOpen = true,
  rightSlot,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      className={[
        'surface overflow-hidden transition-colors duration-200',
        open ? 'border-border-strong' : 'border-border hover:border-border-strong',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left focus-ring group"
        aria-expanded={open}
      >
        <span
          className={[
            'grid place-items-center w-7 h-7 rounded-full text-xs font-semibold num transition-colors duration-200',
            open
              ? 'bg-accent-cyan text-bg-base shadow-[0_0_0_3px_rgba(34,211,238,0.18)]'
              : 'bg-accent-cyan/15 text-accent-cyan',
          ].join(' ')}
        >
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-text-primary group-hover:text-accent-cyan transition-colors">
            {title}
          </div>
          {description && (
            <div className="text-xs text-text-muted mt-0.5 leading-relaxed">
              {description}
            </div>
          )}
        </div>
        {rightSlot}
        <svg
          aria-hidden
          width="14"
          height="14"
          viewBox="0 0 16 16"
          className={[
            'shrink-0 text-text-muted transition-transform duration-200 ease-smooth',
            open ? 'rotate-180' : 'rotate-0',
          ].join(' ')}
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        className={[
          'border-t border-border bg-bg-panel/40 px-5 transition-[max-height,opacity] duration-300 ease-smooth overflow-hidden',
          open ? 'max-h-[3000px] opacity-100 py-5' : 'max-h-0 opacity-0 py-0 border-t-transparent',
        ].join(' ')}
      >
        {children}
      </div>
    </section>
  );
}
