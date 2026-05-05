import React from 'react';
import { ReactorProvider } from './store/reactorContext.jsx';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import SectionShell from './components/layout/SectionShell.jsx';
import { SECTION_IDS } from './utils/constants.js';
import Card from './components/ui/Card.jsx';
import Badge from './components/ui/Badge.jsx';

export default function App() {
  return (
    <ReactorProvider>
      <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
        <Navbar />
        <main className="flex-1">
          {/* Placeholder hero — replaced in commit 6 */}
          <SectionShell
            id={SECTION_IDS.hero}
            eyebrow="ReactorIQ"
            title="Design any reactor. Analyze any reaction. Instantly."
            description="UI shell ready. Hero animation, design studio, sensitivity panel, case studies and theory reference land in subsequent commits."
          >
            <div className="flex flex-wrap gap-2">
              <Badge tone="cyan">PFR</Badge>
              <Badge tone="cyan">CSTR</Badge>
              <Badge tone="cyan">PBR</Badge>
              <Badge tone="teal">Non-isothermal</Badge>
              <Badge tone="teal">Heat Transfer</Badge>
              <Badge tone="teal">Multi-reaction</Badge>
            </div>
          </SectionShell>

          <SectionShell
            id={SECTION_IDS.studio}
            eyebrow="Reactor Design Studio"
            title="Inputs ↔ Live Outputs"
            description="The two-panel design studio lands in commit 7."
          >
            <Card title="Studio (placeholder)">
              <p className="text-sm text-text-muted">
                Wizard inputs (reaction setup, operating conditions, reactor config,
                constraints) and the conversion / temperature / concentration / S-Y /
                summary tabs ship in commits 7 and 8.
              </p>
            </Card>
          </SectionShell>
        </main>
        <Footer />
      </div>
    </ReactorProvider>
  );
}
