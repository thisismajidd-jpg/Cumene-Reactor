import React from 'react';
import { ReactorProvider } from './store/reactorContext.jsx';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import SectionShell from './components/layout/SectionShell.jsx';
import { SECTION_IDS } from './utils/constants.js';
import Hero from './components/hero/Hero.jsx';
import DesignStudio from './components/studio/DesignStudio.jsx';
import SensitivityPanel from './components/sensitivity/SensitivityPanel.jsx';
import CaseStudies from './components/cases/CaseStudies.jsx';

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

          <SectionShell
            id={SECTION_IDS.sensitivity}
            eyebrow="Sensitivity & Optimization"
            title="Tune one variable, sweep two, or optimize many"
            description="Sliders re-solve the studio's plots in real time. The parametric study runs an n×n RK4 sweep in a Web Worker so the UI stays responsive."
          >
            <SensitivityPanel />
          </SectionShell>

          <SectionShell
            id={SECTION_IDS.cases}
            eyebrow="Case studies"
            title="Three reactors, three lessons"
            description="Each case loads a fully-specified design into the Studio. The Cumene case reproduces the calibrated Memo 5 baseline."
          >
            <CaseStudies />
          </SectionShell>
        </main>
        <Footer />
      </div>
    </ReactorProvider>
  );
}
