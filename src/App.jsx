import React from 'react';
import { ReactorProvider } from './store/reactorContext.jsx';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import SectionShell from './components/layout/SectionShell.jsx';
import { SECTION_IDS } from './utils/constants.js';
import Hero from './components/hero/Hero.jsx';
import DesignStudio from './components/studio/DesignStudio.jsx';

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
            description="Configure the reaction, operating conditions, reactor type, and any constraints on the left. Outputs update as you type."
          >
            <DesignStudio />
          </SectionShell>
        </main>
        <Footer />
      </div>
    </ReactorProvider>
  );
}
