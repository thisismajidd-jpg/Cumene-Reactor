import React, { useState } from 'react';

/** Renders a list of paragraph strings with simple **bold** support. */
export default function CaseExplainer({ items }) {
  const [open, setOpen] = useState(false);
  if (!items || items.length === 0) return null;
  return (
    <div className="border-t border-border mt-4 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-sm text-accent-cyan hover:text-accent-cyan/80 focus-ring rounded inline-flex items-center gap-1.5"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          aria-hidden
          className={[
            'transition-transform duration-200 ease-smooth',
            open ? 'rotate-90' : 'rotate-0',
          ].join(' ')}
        >
          <path
            d="M5 4l5 4-5 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {open ? 'Hide narrative' : 'Explain this case'}
      </button>
      {open && (
        <div className="mt-3 space-y-2 text-sm text-text-muted leading-relaxed">
          {items.map((p, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: bolden(p) }} />
          ))}
        </div>
      )}
    </div>
  );
}

function bolden(text) {
  return String(text).replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary">$1</strong>');
}
