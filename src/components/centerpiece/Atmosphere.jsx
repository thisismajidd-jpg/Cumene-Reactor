import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Persistent cinematic background scene. Renders behind ALL sections.
 *
 *   • a wide gradient sky-dome (radial: faint cyan glow at top)
 *   • drifting glow orbs at varying z-depths (parallax illusion)
 *   • a low-density ambient particle field
 *   • a couple of long light-streak ribbons in the deep distance
 *
 * No reactor here — this is just depth + atmosphere.
 *
 * Scroll progress (0..1 over the whole page) drives a gentle camera dolly
 * forward and a parallax shift on the orbs so you feel like you're moving
 * through the scene as you read.
 */
const ORB_COUNT = 14;
const PARTICLE_COUNT = 220;
const STREAK_COUNT = 5;

export default function Atmosphere({
  pageProgress = 0,
  reducedMotion = false,
}) {
  const orbsRef = useRef([]);
  const particlesGeoRef = useRef(null);
  const groupRef = useRef(null);

  // Deterministic orb layout: spread in 3D, wide z range for parallax depth.
  const orbs = useMemo(() => {
    const arr = [];
    const rand = mulberry32(11);
    for (let i = 0; i < ORB_COUNT; i++) {
      const z = -2 - rand() * 22;          // far back
      const x = (rand() - 0.5) * Math.abs(z) * 1.5;
      const y = (rand() - 0.5) * Math.abs(z) * 0.9;
      const hue = 0.50 + rand() * 0.18;     // cyan → teal → faint magenta
      const sat = 0.65;
      const lit = 0.55 + rand() * 0.15;
      const c = new THREE.Color().setHSL(hue, sat, lit);
      arr.push({
        pos: [x, y, z],
        size: 0.7 + rand() * 1.6,
        color: c,
        drift: 0.05 + rand() * 0.18,
        offset: rand() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  // Ambient particles — deterministic positions in a wide volume.
  const particleData = useMemo(() => {
    const rand = mulberry32(42);
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const z = -1 - rand() * 18;
      positions[i * 3]     = (rand() - 0.5) * 18;
      positions[i * 3 + 1] = (rand() - 0.5) * 11;
      positions[i * 3 + 2] = z;
      // cool palette, dim
      const c = new THREE.Color().setHSL(0.52 + rand() * 0.12, 0.7, 0.6);
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, []);

  // Streak ribbons: long thin emissive lines, in the deep background.
  const streaks = useMemo(() => {
    const rand = mulberry32(7);
    const arr = [];
    for (let i = 0; i < STREAK_COUNT; i++) {
      const z = -8 - rand() * 12;
      const yMid = (rand() - 0.5) * 6;
      arr.push({
        pos: [(rand() - 0.5) * 16, yMid, z],
        rot: [0, 0, (rand() - 0.5) * 0.4],
        length: 6 + rand() * 6,
        hue: 0.5 + rand() * 0.15,
        opacity: 0.18 + rand() * 0.18,
      });
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Group: gentle camera-relative drift driven by page scroll.
    if (groupRef.current) {
      const g = groupRef.current;
      // As user scrolls down the page, parallax-pan the whole scene up
      // and subtly forward → "moving through" sensation.
      g.position.y = pageProgress * 1.6;
      g.position.z = pageProgress * 1.2;
    }

    // Drift each orb softly (sine wobble + slow rotation around scene Y).
    if (!reducedMotion) {
      orbs.forEach((orb, i) => {
        const ref = orbsRef.current[i];
        if (!ref) return;
        const [x0, y0, z0] = orb.pos;
        ref.position.x = x0 + Math.sin(t * orb.drift + orb.offset) * 0.6;
        ref.position.y = y0 + Math.cos(t * orb.drift * 0.7 + orb.offset) * 0.4;
        ref.position.z = z0 + Math.sin(t * orb.drift * 0.5) * 0.3;
      });
    }

    // Ambient particles: tiny twinkle (re-render colors w/ alpha-like sine).
    if (particlesGeoRef.current && !reducedMotion) {
      const colors = particlesGeoRef.current.attributes.color;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const flicker = 0.55 + 0.45 * Math.sin(t * 1.2 + i * 0.37);
        const r = particleData.colors[i * 3] * flicker;
        const g = particleData.colors[i * 3 + 1] * flicker;
        const b = particleData.colors[i * 3 + 2] * flicker;
        colors.setXYZ(i, r, g, b);
      }
      colors.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      {/* ── Sky-dome gradient (large inverted sphere) ───────────────── */}
      <mesh scale={[40, 40, 40]} rotation={[0, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          side={THREE.BackSide}
          color="#0B1220"
          fog={false}
        />
      </mesh>

      {/* Top-half soft cyan glow — fakes a "horizon" ambience */}
      <mesh scale={[35, 35, 35]} rotation={[0, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <SkyGradientMaterial />
      </mesh>

      {/* ── Glow orbs at varying depths ─────────────────────────────── */}
      {orbs.map((orb, i) => (
        <mesh
          key={i}
          position={orb.pos}
          ref={(el) => (orbsRef.current[i] = el)}
        >
          <sphereGeometry args={[orb.size, 24, 24]} />
          <meshBasicMaterial
            color={orb.color}
            transparent
            opacity={0.28}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </mesh>
      ))}

      {/* Inner solid bright cores for the orbs (smaller, brighter) */}
      {orbs.map((orb, i) => (
        <mesh key={`c${i}`} position={orb.pos}>
          <sphereGeometry args={[orb.size * 0.18, 16, 16]} />
          <meshBasicMaterial
            color={orb.color}
            transparent
            opacity={0.95}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </mesh>
      ))}

      {/* ── Light streaks in the deep distance ─────────────────────── */}
      {streaks.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={s.rot}>
          <planeGeometry args={[s.length, 0.04]} />
          <meshBasicMaterial
            color={new THREE.Color().setHSL(s.hue, 0.7, 0.65)}
            transparent
            opacity={s.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* ── Ambient particle field ──────────────────────────────────── */}
      <points>
        <bufferGeometry ref={particlesGeoRef}>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={particleData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={PARTICLE_COUNT}
            array={particleData.colors.slice()}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/**
 * A vertex-color gradient assigned procedurally on a sphere geometry, used
 * as a soft "sky" ambience. We don't need a custom shader — just bake colors
 * into vertex attributes once and rely on vertexColors on the basic material.
 */
function SkyGradientMaterial() {
  const matRef = useRef(null);
  const geomRef = useRef(null);

  React.useEffect(() => {
    const mesh = matRef.current?.parent;
    const geom = mesh?.geometry;
    if (!geom) return;
    const positions = geom.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const c1 = new THREE.Color('#1A2A55'); // upper, faint blue-violet
    const c2 = new THREE.Color('#0B1220'); // mid horizon (matches body bg)
    const c3 = new THREE.Color('#0D1F2D'); // lower, slight cyan tint
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = (y + 1) / 2; // 0 at bottom, 1 at top
      const c = new THREE.Color();
      if (t < 0.5) c.lerpColors(c3, c2, t * 2);
      else c.lerpColors(c2, c1, (t - 0.5) * 2);
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }, []);

  return (
    <meshBasicMaterial
      ref={matRef}
      side={THREE.BackSide}
      vertexColors
      fog={false}
      transparent
      opacity={0.95}
    />
  );
}

// Deterministic PRNG so positions don't change across reloads.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
