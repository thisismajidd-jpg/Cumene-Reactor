import React from 'react';
import { ReactorProvider } from './store/reactorContext.jsx';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import SectionShell from './components/layout/SectionShell.jsx';
import SkipLink from './components/layout/SkipLink.jsx';
import ScrollToTop from './components/layout/ScrollToTop.jsx';
import ErrorBoundary from './components/layout/ErrorBoundary.jsx';
import { SECTION_IDS } from './utils/constants.js';
import Hero from './components/hero/Hero.jsx';
import DesignStudio from './components/studio/DesignStudio.jsx';
import SensitivityPanel from './components/sensitivity/SensitivityPanel.jsx';
import CaseStudies from './components/cases/CaseStudies.jsx';
import TheoryReference from './components/theory/TheoryReference.jsx';
import AboutSection from './components/about/AboutSection.jsx';

export default function App() {
  return (
    <ErrorBoundary>
      <ReactorProvider>
        <SkipLink targetId="main" />

        <div className="relative min-h-screen text-text-primary flex flex-col">
          <Navbar />
          <main id="main" className="flex-1">
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

            <SectionShell
              id={SECTION_IDS.theory}
              eyebrow="Theory reference"
              title="The equations behind the plots"
              description="Compact, beautifully typeset summary of the design equations the solver implements."
            >
              <TheoryReference />
            </SectionShell>

            <SectionShell
              id={SECTION_IDS.about}
              eyebrow="About"
              title="Built for CHPE4512 · Group 03"
              description="Project context, what ReactorIQ adds beyond the original Python memos, and the textbooks behind the equations."
            >
              <AboutSection />
            </SectionShell>
          </main>
          <Footer />
          <ScrollToTop />
        </div>
      </ReactorProvider>
    </ErrorBoundary>
  );
}
