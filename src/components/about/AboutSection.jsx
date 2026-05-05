import React from 'react';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';

export default function AboutSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card title="Course & team" subtitle="CHPE4512 · Spring 2026">
        <div className="space-y-3 text-sm">
          <Row label="Course" value="CHPE4512 — Chemical Reaction Engineering" />
          <Row label="Institution" value="Sultan Qaboos University · College of Engineering" />
          <Row label="Group" value="Group 03 · Section 02" />
          <Row label="Project" value="Memos 1–5: Cumene production reactor design" />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge tone="cyan">Stoichiometry</Badge>
          <Badge tone="cyan">Isothermal PBR</Badge>
          <Badge tone="cyan">Reactor sizing</Badge>
          <Badge tone="teal">Multi-reaction</Badge>
          <Badge tone="teal">Pressure drop</Badge>
          <Badge tone="warning">Reactor gain</Badge>
        </div>
      </Card>

      <Card title="What ReactorIQ does" subtitle="Beyond the original Python memos">
        <ul className="text-sm text-text-muted space-y-2 leading-relaxed">
          <li>· Solves PFR, CSTR, and PBR design equations entirely in your browser.</li>
          <li>· Hand-written RK4 integrator with optional adaptive step-doubling.</li>
          <li>· Multi-reaction selectivity, Ergun pressure drop, non-isothermal energy balance.</li>
          <li>· Live sliders, 2-D parametric heatmap (Web Worker), and 1- to n-D optimizer.</li>
          <li>· Detects multiple steady states for autocatalytic CSTRs.</li>
          <li>· Global SI ↔ engineering units toggle in the navbar.</li>
        </ul>
      </Card>

      <Card title="References & acknowledgements" subtitle="Textbooks and source material">
        <ul className="text-sm text-text-muted space-y-2 leading-relaxed">
          <li>
            <span className="text-text-primary">Fogler.</span>{' '}
            <em>Elements of Chemical Reaction Engineering</em>, 5th ed. — design equations, energy balance, Ergun.
          </li>
          <li>
            <span className="text-text-primary">Froment, Bischoff &amp; De Wilde.</span>{' '}
            <em>Chemical Reactor Analysis &amp; Design</em>, 3rd ed. — multi-reaction PBR, parametric sensitivity, reactor gain.
          </li>
          <li>
            <span className="text-text-primary">HITEC molten salt.</span>{' '}
            Coastal Chemical Co. heat-transfer property tables — used for U calibration in the Cumene case.
          </li>
          <li>
            <span className="text-text-primary">Original Python memos 1–5.</span>{' '}
            CHPE4512 Group 03 — stoichiometry, isothermal PBR, sizing, multi-reaction, non-iso/heat-transfer.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-text-muted">{label}</span>
      <span className="text-right text-text-primary">{value}</span>
    </div>
  );
}
