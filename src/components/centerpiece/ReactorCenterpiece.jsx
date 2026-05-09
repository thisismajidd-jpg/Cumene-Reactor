import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment } from '@react-three/drei';
import EnergyCore from './EnergyCore.jsx';
import Atmosphere from './Atmosphere.jsx';
import { useHeroProgress } from '../../hooks/useHeroProgress.js';
import { useScrollProgress } from '../../hooks/useScrollProgress.js';
import { SECTION_IDS } from '../../utils/constants.js';

/**
 * Full-page fixed WebGL canvas. Renders behind every section.
 *
 *   • Atmosphere — persistent depth: gradient sky-dome, drifting glow orbs,
 *     ambient particles, distant light streaks. Visible across the whole page.
 *   • EnergyCore — the hero centerpiece. Mounted inside the canvas always
 *     (so it can keep its WebGL state) but its `exitProgress` ramps to 1 as
 *     the user scrolls past the hero, dismissing it (lift + zoom + explode +
 *     fade). After the hero is gone, the canvas is just atmosphere.
 *
 * Mobile: hidden via Tailwind to skip the GPU cost on small devices.
 */
export default function ReactorCenterpiece({ visible = true }) {
  const heroProgress = useHeroProgress(SECTION_IDS.hero);
  const pageProgress = useScrollProgress();
  const reducedMotion = usePrefersReducedMotion();

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="hidden lg:block fixed inset-0 -z-10 pointer-events-none select-none"
    >
      <Canvas
        dpr={[1, 1.6]}
        frameloop={reducedMotion ? 'demand' : 'always'}
        camera={{ position: [0, 0, 6.2], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <SceneLighting />
        {/* drei's Environment HDRI gives the iridescent core proper IBL.
            background={false} means we don't draw the HDRI — only sample it. */}
        <Environment preset="city" background={false} />
        <Atmosphere pageProgress={pageProgress} reducedMotion={reducedMotion} />
        <EnergyCore exitProgress={heroProgress} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.25} color="#7CC1FF" />
      {/* Cool key from upper-left */}
      <pointLight position={[-4, 3, 4]} intensity={1.6} color="#22D3EE" distance={20} decay={1.4} />
      {/* Warm rim from lower-right (subtle complementary glow) */}
      <pointLight position={[4, -2, 3]} intensity={1.0} color="#F472B6" distance={18} decay={1.6} />
      {/* Faint back light */}
      <pointLight position={[0, 0, -6]} intensity={0.9} color="#14B8A6" distance={16} decay={1.4} />
    </>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  });
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

THREE.ColorManagement.enabled = true;
