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
    <section className="surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left focus-ring"
        aria-expanded={open}
      >
        <span className="grid place-items-center w-7 h-7 rounded-full bg-accent-cyan/15 text-accent-cyan text-xs font-semibold num">
          {index}
        </span>
        <div className="flex-1">
          <div className="font-display font-semibold text-text-primary">
            {title}
          </div>
          {description && (
            <div className="text-xs text-text-muted mt-0.5">{description}</div>
          )}
        </div>
        {rightSlot}
        <svg
          aria-hidden
          width="14"
          height="14"
          viewBox="0 0 16 16"
          className={[
            'text-text-muted transition-transform duration-200 ease-smooth',
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
          'border-t border-border bg-bg-panel/40 px-5 transition-[max-height,opacity] duration-200 ease-smooth overflow-hidden',
          open ? 'max-h-[2000px] opacity-100 py-5' : 'max-h-0 opacity-0 py-0',
        ].join(' ')}
      >
        {children}
      </div>
    </section>
  );
}
