import React, { useEffect, useState } from 'react';
import UnitToggle from './UnitToggle.jsx';
import { SECTION_IDS } from '../../utils/constants.js';

const NAV = [
  { id: SECTION_IDS.studio, label: 'Studio' },
  { id: SECTION_IDS.sensitivity, label: 'Sensitivity' },
  { id: SECTION_IDS.cases, label: 'Cases' },
  { id: SECTION_IDS.theory, label: 'Theory' },
  { id: SECTION_IDS.about, label: 'About' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on hash change.
  useEffect(() => {
    const onHash = () => setMenuOpen(false);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <header
      className={[
        'sticky top-0 z-40 transition-colors duration-200 ease-smooth',
        scrolled
          ? 'bg-bg-base/85 backdrop-blur-md border-b border-border'
          : 'bg-transparent border-b border-transparent',
      ].join(' ')}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 h-16 flex items-center justify-between gap-6">
        <a
          href={`#${SECTION_IDS.hero}`}
          className="flex items-center gap-2.5 focus-ring rounded"
          aria-label="ReactorIQ home"
        >
          <Logo />
          <span className="font-display font-bold tracking-tight text-text-primary text-lg">
            ReactorIQ
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="px-3 h-9 inline-flex items-center text-sm text-text-muted hover:text-text-primary rounded transition-colors focus-ring"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <UnitToggle />
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-text-muted hover:text-text-primary focus-ring"
          >
            {menuOpen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                <path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Primary mobile"
          className="md:hidden border-t border-border bg-bg-base/95 backdrop-blur-md"
        >
          <ul className="flex flex-col px-3 py-2">
            {NAV.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="block px-3 py-2 rounded text-sm text-text-primary hover:bg-bg-surface focus-ring"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22D3EE" />
          <stop offset="1" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="#0F1726" stroke="#1E2A44" />
      <g stroke="url(#lg)" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <rect x="9" y="6" width="14" height="20" rx="7" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="16" y1="26" x2="16" y2="30" />
        <circle cx="13" cy="13" r="1.2" fill="#22D3EE" stroke="none" />
        <circle cx="18" cy="17" r="1.2" fill="#14B8A6" stroke="none" />
        <circle cx="14" cy="21" r="1.2" fill="#FACC15" stroke="none" />
      </g>
    </svg>
  );
}
