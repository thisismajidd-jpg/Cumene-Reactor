import React from 'react';

/**
 * Keyboard-only skip-to-content link. Visible on focus.
 */
export default function SkipLink({ targetId = 'main' }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-accent-cyan focus:text-bg-base focus:px-3 focus:h-10 focus:flex focus:items-center focus:font-medium"
    >
      Skip to main content
    </a>
  );
}
