import React, { useEffect, useState } from 'react';
import UnitToggle from './UnitToggle.jsx';
import { SECTION_IDS } from '../../utils/constants.js';

const NAV = [
  { id: SECTION_IDS.studio,      label: 'Studio' },
  { id: SECTION_IDS.sensitivity, label: 'Sensitivity' },
  { id: SECTION_IDS.cases,       label: 'Cases' },
  { id: SECTION_IDS.theory,      label: 'Theory' },
  { id: SECTION_IDS.about,       label: 'About' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);

  // Sticky-bar background fade on scroll.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu when a hash navigation happens.
  useEffect(() => {
    const onHash = () => setMenuOpen(false);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Highlight the section that's currently most visible on screen.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    NAV.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <header
      className={[
        'sticky top-0 z-40 transition-all duration-300 ease-smooth',
        scrolled
          ? 'bg-bg-base/80 backdrop-blur-md border-b border-border shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)]'
          : 'bg-transparent border-b border-transparent',
      ].join(' ')}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 h-16 flex items-center justify-between gap-6">
        <a
          href={`#${SECTION_IDS.hero}`}
          className="flex items-center gap-2.5 focus-ring rounded group"
          aria-label="ReactorIQ home"
        >
          <Logo />
          <span className="font-display font-bold tracking-tight text-text-primary text-lg group-hover:text-accent-cyan transition-colors">
            ReactorIQ
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-0.5" aria-label="Primary">
          {NAV.map((item) => {
            const active = activeId === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={active ? 'page' : undefined}
                className={[
                  'relative px-3 h-9 inline-flex items-center text-sm rounded transition-colors focus-ring',
                  active
                    ? 'text-accent-cyan'
                    : 'text-text-muted hover:text-text-primary',
                ].join(' ')}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full bg-accent-cyan"
                    aria-hidden
                  />
                )}
              </a>
            );
          })}
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
            {NAV.map((item) => {
              const active = activeId === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'block px-3 py-2 rounded text-sm focus-ring',
                      active
                        ? 'text-accent-cyan bg-accent-cyan/10'
                        : 'text-text-primary hover:bg-bg-surface',
                    ].join(' ')}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" className="transition-transform duration-300 hover:rotate-[8deg]">
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
