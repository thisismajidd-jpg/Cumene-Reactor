import React from 'react';
import Button from '../ui/Button.jsx';
import CapabilityBadges from './CapabilityBadges.jsx';
import BackgroundVideo from './BackgroundVideo.jsx';
import { useHeroProgress } from '../../hooks/useHeroProgress.js';
import { SECTION_IDS } from '../../utils/constants.js';

// Imported as a Vite asset — the file is copied into dist/assets/ at build
// time with a hashed name and served directly in dev. To swap, just drop a
// new file into ../../../background/ and change this import.
import HERO_VIDEO_URL from '../../../background/347325_medium.mp4';

export default function Hero() {
  const p = useHeroProgress(SECTION_IDS.hero);

  // Snappy, staggered exit (Stripe-style). Each element starts fading at a
  // different scroll progress so the choreography feels like a cascade.
  const titleP    = smoothstep(0.00, 0.55, p);
  const subtitleP = smoothstep(0.10, 0.65, p);
  const ctaP      = smoothstep(0.20, 0.75, p);
  const badgesP   = smoothstep(0.30, 0.85, p);
  // Video fades out across the second half of the hero scroll.
  const videoOpacity = 1 - smoothstep(0.35, 0.95, p);

  const goStudio = () => {
    document.getElementById(SECTION_IDS.studio)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <section
      id={SECTION_IDS.hero}
      className="relative isolate overflow-hidden bg-black"
      style={{ height: '100vh', minHeight: 720 }}
    >
      {/* ── Background video layer (z 0) ─────────────────────────────
           Slight blur acts as the "cover" so the title sits clean above
           it; opacity is scroll-driven so the whole layer fades as the
           user scrolls down. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          opacity: videoOpacity,
          willChange: 'opacity',
        }}
      >
        <BackgroundVideo
          src={HERO_VIDEO_URL}
          className="absolute left-1/2 top-0 -translate-x-1/2 object-cover object-center w-full h-full"
          style={{
            // A touch of blur for the dreamy "cover" feel — kept light
            // enough that you can still read the scene behind the title.
            filter: 'blur(3px) saturate(0.95) brightness(0.82)',
            transform: 'translate(-50%, 0) scale(1.04)',
            transformOrigin: 'center top',
          }}
        />
        {/* Soft vignette: top + bottom slight darkening for text legibility
            without an obvious "video with overlay" look. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.45) 100%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-bg-base pointer-events-none"
        />
      </div>

      {/* Faint engineering grid for character (very subtle) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #22D3EE 1px, transparent 1px), linear-gradient(to bottom, #22D3EE 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      {/* ── Foreground content (z 10) ───────────────────────────────── */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 sm:px-8 text-center">
        <div
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 backdrop-blur-md px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-accent-cyan"
          style={transformStyle(titleP, { y: 24, blur: true })}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse"
            aria-hidden
          />
          CHPE4512 · Group 03 · SQU
        </div>

        <h1
          className="mt-6 font-display font-bold tracking-tight leading-[1.04] text-[clamp(2.5rem,7vw,5.5rem)] max-w-5xl"
          style={transformStyle(titleP, {
            y: 90,
            scale: 0.96,
            blur: true,
            // Stacked drop-shadows: a tight hard shadow for edge separation
            // plus a wide soft shadow for ambient lift. drop-shadow (filter)
            // works on gradient/transparent text where text-shadow would not.
            dropShadow:
              'drop-shadow(0 1px 2px rgba(0,0,0,0.95)) drop-shadow(0 6px 16px rgba(0,0,0,0.85)) drop-shadow(0 18px 48px rgba(0,0,0,0.6))',
          })}
        >
          <span className="text-white">Design any reactor.</span>
          <br />
          <span className="gradient-text">Analyze any reaction.</span>
        </h1>

        <p
          className="mt-6 max-w-xl text-white/90 text-base sm:text-lg leading-relaxed"
          style={transformStyle(subtitleP, {
            y: 60,
            blur: true,
            dropShadow:
              'drop-shadow(0 1px 2px rgba(0,0,0,0.9)) drop-shadow(0 4px 14px rgba(0,0,0,0.7))',
          })}
        >
          Solve PFR, CSTR, and PBR design equations in your browser. Real-time
          simulation, multi-reaction selectivity, dual-objective optimization —
          no installs, no backend.
        </p>

        <div
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          style={transformStyle(ctaP, { y: 50, blur: true })}
        >
          <Button
            size="lg"
            onClick={goStudio}
            className="group backdrop-blur-md"
            trailingIcon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
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
            className="backdrop-blur-md bg-white/8 border-white/20 text-white hover:bg-white/15 hover:border-white/40"
            onClick={() =>
              document
                .getElementById(SECTION_IDS.cases)
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            Browse case studies
          </Button>
        </div>

        <div
          className="mt-10 max-w-3xl"
          style={transformStyle(badgesP, { y: 40 })}
        >
          <CapabilityBadges className="justify-center" />
        </div>
      </div>

      {/* Scroll affordance */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-6 text-[10px] uppercase tracking-[0.2em] text-white/70 flex flex-col items-center gap-2 z-10 pointer-events-none"
        style={{ opacity: 1 - p * 2 }}
      >
        <span>Scroll to enter the studio</span>
        <span
          className="w-px h-7 bg-gradient-to-b from-accent-cyan to-transparent"
          aria-hidden
        />
      </div>
    </section>
  );
}

// ── helpers ────────────────────────────────────────────────────────────
function transformStyle(
  progress,
  { y = 60, scale = 1, blur = false, dropShadow = '' } = {},
) {
  const opacity = 1 - progress;
  const ty = progress * y;
  const sc = 1 - (1 - scale) * progress;
  const blurPx = blur ? progress * 8 : 0;
  const filterParts = [];
  if (dropShadow) filterParts.push(dropShadow);
  if (blur) filterParts.push(`blur(${blurPx}px)`);
  return {
    transform: `translate3d(0, ${ty}px, 0) scale(${sc})`,
    opacity,
    filter: filterParts.length ? filterParts.join(' ') : undefined,
    willChange: 'transform, opacity, filter',
    transition: 'none',
  };
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
