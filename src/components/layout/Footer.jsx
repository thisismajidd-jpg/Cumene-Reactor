import React from 'react';
import { SECTION_IDS } from '../../utils/constants.js';

export default function Footer() {
  return (
    <footer
      id={SECTION_IDS.about}
      className="border-t border-border bg-bg-panel/60 mt-24"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 py-12 grid gap-10 md:grid-cols-3">
        <div>
          <h3 className="font-display font-semibold text-text-primary">ReactorIQ</h3>
          <p className="text-sm text-text-muted mt-2 leading-relaxed max-w-sm">
            Built as part of CHPE4512 — Chemical Reaction Engineering, Sultan Qaboos
            University, Group&nbsp;03. The Cumene case study reproduces the calibrated
            results from the course memos (1–5).
          </p>
        </div>
        <div>
          <h4 className="field-label mb-3">Technologies</h4>
          <ul className="text-sm text-text-muted space-y-1.5">
            <li>React 18 · Tailwind CSS 3</li>
            <li>Recharts 2 · KaTeX</li>
            <li>Hand-written RK4 solver (JS)</li>
            <li>Vite 5 build</li>
          </ul>
        </div>
        <div>
          <h4 className="field-label mb-3">References</h4>
          <ul className="text-sm text-text-muted space-y-1.5">
            <li>Fogler — <em>Elements of CRE</em>, 5th ed.</li>
            <li>Froment, Bischoff &amp; De Wilde — <em>Chemical Reactor Analysis &amp; Design</em>, 3rd ed.</li>
            <li>HITEC molten salt heat-transfer correlations</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 py-4 text-xs text-text-subtle flex items-center justify-between flex-wrap gap-2">
          <span>© CHPE4512 · Group 03 · Section 02</span>
          <span className="num">v0.1 · solver pure-JS RK4</span>
        </div>
      </div>
    </footer>
  );
}
