import React from 'react';
import { ReactorProvider } from './store/reactorContext.jsx';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import SectionShell from './components/layout/SectionShell.jsx';
import { SECTION_IDS } from './utils/constants.js';
import Card from './components/ui/Card.jsx';
import Hero from './components/hero/Hero.jsx';

export default function App() {
  return (
    <ReactorProvider>
      <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Hero />

          <SectionShell
            id={SECTION_IDS.studio}
            eyebrow="Reactor Design Studio"
            title="Inputs ↔ Live outputs"
            description="Wizard inputs and the live output tabs land in commits 7 and 8."
          >
            <Card title="Studio (placeholder)">
              <p className="text-sm text-text-muted">
                Reaction setup, operating conditions, reactor configuration, and
                constraints on the left; conversion, temperature, concentration,
                selectivity/yield, and summary on the right.
              </p>
            </Card>
          </SectionShell>
        </main>
        <Footer />
      </div>
    </ReactorProvider>
  );
}
