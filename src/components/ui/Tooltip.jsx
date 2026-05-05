import React from 'react';

/**
 * Pure-CSS tooltip. No popovers/portals — appears above the element on hover/focus.
 * For "tooltip on a help icon" style use cases.
 */
export default function Tooltip({ content, children, side = 'top', className = '' }) {
  const sideClass = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  }[side];

  return (
    <span className={['relative inline-flex group', className].join(' ')}>
      {children}
      <span
        role="tooltip"
        className={[
          'pointer-events-none absolute z-50 max-w-xs whitespace-pre-line rounded',
          'bg-bg-base border border-border-strong px-2.5 py-1.5 text-xs text-text-primary',
          'opacity-0 scale-95 transition-all duration-150 ease-smooth',
          'group-hover:opacity-100 group-focus-within:opacity-100',
          'group-hover:scale-100 group-focus-within:scale-100',
          'shadow-panel',
          sideClass,
        ].join(' ')}
      >
        {content}
      </span>
    </span>
  );
}
