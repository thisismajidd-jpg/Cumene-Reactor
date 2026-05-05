import React from 'react';
import Button from '../ui/Button.jsx';
import MotionFade from '../ui/MotionFade.jsx';
import MeshBackground from './MeshBackground.jsx';
import CapabilityBadges from './CapabilityBadges.jsx';
import { SECTION_IDS } from '../../utils/constants.js';

export default function Hero() {
  const goStudio = () => {
    document.getElementById(SECTION_IDS.studio)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <section
      id={SECTION_IDS.hero}
      className="relative isolate overflow-hidden border-b border-border"
    >
      <MeshBackground />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-bg-base/0 via-bg-base/0 to-bg-base"
      />
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 py-24 md:py-32">
        <MotionFade>
          <p className="field-label text-accent-cyan mb-3">
            CHPE4512 · Group 03 · Sultan Qaboos University
          </p>
        </MotionFade>
        <MotionFade delay={80}>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight max-w-3xl leading-[1.05]">
            Design any reactor.
            <br />
            <span className="bg-gradient-to-r from-accent-cyan to-accent-teal bg-clip-text text-transparent">
              Analyze any reaction.
            </span>{' '}
            Instantly.
          </h1>
        </MotionFade>
        <MotionFade delay={140}>
          <p className="mt-5 max-w-xl text-text-muted text-lg leading-relaxed">
            ReactorIQ solves PFR, CSTR, and PBR design equations in your browser. Real-time
            simulation, multi-reaction selectivity, parametric sensitivity, and constraint-based
            optimization — no installs, no backend.
          </p>
        </MotionFade>
        <MotionFade delay={200} className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={goStudio}
            trailingIcon={
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          >
            Start designing
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              document.getElementById(SECTION_IDS.cases)?.scrollIntoView({
                behavior: 'smooth',
              });
            }}
          >
            Browse case studies
          </Button>
        </MotionFade>
        <MotionFade delay={260} className="mt-10">
          <CapabilityBadges />
        </MotionFade>

        <div className="mt-16 max-w-3xl">
          <HeroStats />
        </div>
      </div>
    </section>
  );
}

function HeroStats() {
  const items = [
    { k: '3', label: 'Reactor types' },
    { k: 'RK4', label: 'Pure-JS solver' },
    { k: '5', label: 'Memos reproduced' },
    { k: '0', label: 'External plot libs' },
  ];
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="surface px-4 py-3 flex flex-col gap-1"
        >
          <dt className="text-xs text-text-muted uppercase tracking-wide">
            {item.label}
          </dt>
          <dd className="font-display text-2xl font-bold text-accent-cyan num">
            {item.k}
          </dd>
        </div>
      ))}
    </dl>
  );
}
