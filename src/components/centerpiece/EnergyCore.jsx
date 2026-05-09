import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * A glowing energy-core centerpiece. Lives in the hero only.
 *
 * Composition:
 *   • inner crystal      — iridescent icosahedron (MeshPhysicalMaterial)
 *   • wireframe overlay  — slightly larger icosahedron with bright edges
 *   • halo ring          — thin torus, perpendicular to the camera
 *   • aura particles     — N points orbiting the core, additive blended
 *
 * Driven by `exitProgress` ∈ [0,1]:
 *   0   → fully formed, idle pulse
 *   0.3 → particles begin to explode outward
 *   0.7 → wireframe disassembles, halo expands
 *   1   → entirely faded
 *
 * Motion philosophy: gentle, smooth, snappy. No continuous fast spin —
 * just a slow Y-axis drift + breathing pulse.
 */
const PARTICLE_COUNT = 240;
const AURA_RADIUS = 1.85;

export default function EnergyCore({ exitProgress = 0, reducedMotion = false }) {
  const groupRef = useRef(null);
  const innerRef = useRef(null);
  const wireRef = useRef(null);
  const haloRef = useRef(null);
  const haloMatRef = useRef(null);
  const innerMatRef = useRef(null);
  const wireMatRef = useRef(null);
  const particlesGeoRef = useRef(null);
  const particlesMatRef = useRef(null);

  // Particle initial positions on a sphere shell + orbital params.
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Fibonacci sphere — even distribution
      const k = i + 0.5;
      const phi = Math.acos(1 - (2 * k) / PARTICLE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * k;
      arr.push({
        baseR: AURA_RADIUS * (0.92 + Math.random() * 0.16),
        phi,
        theta,
        speed: 0.25 + Math.random() * 0.5,
        spin: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const exit = THREE.MathUtils.clamp(exitProgress, 0, 1);
    const visible = 1 - exit;

    // ── Group: gentle Y rotation + scroll-driven scale & lift ──────────
    if (groupRef.current) {
      const g = groupRef.current;
      if (!reducedMotion) {
        g.rotation.y += delta * 0.18; // slow, single axis only
        g.rotation.x = Math.sin(t * 0.6) * 0.04; // tiny breathing tilt
      }
      // As we scroll past the hero, push the core up and slightly toward
      // camera (zoom past) while shrinking — creates the "fly past" feel.
      const lift = exit * 1.6;
      const dolly = exit * 0.9;
      const scale = 1 - exit * 0.55;
      g.position.set(0, lift, dolly);
      g.scale.setScalar(Math.max(0.05, scale));
    }

    // ── Inner crystal: pulse + iridescence shift ───────────────────────
    if (innerRef.current && innerMatRef.current) {
      const pulse = 1 + Math.sin(t * 1.6) * 0.04;
      innerRef.current.scale.setScalar(pulse);
      // Iridescence "thickness" drift gives the holographic shimmer
      const m = innerMatRef.current;
      m.iridescenceIOR = 1.4 + Math.sin(t * 0.7) * 0.15;
      m.transmission = 0.55 + Math.sin(t * 0.4) * 0.1;
      m.opacity = visible;
      m.transparent = true;
    }

    // ── Wireframe: counter-rotate + dissolve on exit ───────────────────
    if (wireRef.current && wireMatRef.current) {
      if (!reducedMotion) {
        wireRef.current.rotation.y -= delta * 0.4;
        wireRef.current.rotation.x = -Math.sin(t * 0.8) * 0.12;
      }
      // Disassemble: expand outward + fade as we exit
      const expand = 1 + exit * 0.6;
      wireRef.current.scale.setScalar(expand);
      wireMatRef.current.opacity = (1 - exit * 1.4) * 0.85;
      wireMatRef.current.transparent = true;
    }

    // ── Halo ring: rotate slowly + expand + fade on exit ───────────────
    if (haloRef.current && haloMatRef.current) {
      if (!reducedMotion) haloRef.current.rotation.z += delta * 0.12;
      const haloExpand = 1 + exit * 0.8;
      haloRef.current.scale.setScalar(haloExpand);
      haloMatRef.current.opacity = (1 - exit * 1.2) * 0.9;
    }

    // ── Particles: orbit, explode outward on exit ──────────────────────
    if (particlesGeoRef.current && particlesMatRef.current) {
      const positions = particlesGeoRef.current.attributes.position;
      const colors = particlesGeoRef.current.attributes.color;
      // Explosion radius grows quickly past 30% exit
      const explosion = THREE.MathUtils.smoothstep(exit, 0.0, 0.7) * 4.5;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const orbit = reducedMotion ? 0 : t * p.speed;
        const phi = p.phi;
        const theta = p.theta + orbit + p.spin;
        const r = p.baseR + explosion * (0.6 + (i % 7) / 7);
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);
        positions.setXYZ(i, x, y, z);
        // Iridescent color shift — cyan/magenta/teal palette
        const hue = (i / particles.length + t * 0.05) % 1;
        const c = TMP_COL.setHSL(0.5 + hue * 0.2, 0.85, 0.65);
        colors.setXYZ(i, c.r, c.g, c.b);
      }
      positions.needsUpdate = true;
      colors.needsUpdate = true;
      particlesMatRef.current.opacity = (1 - exit * 1.3) * 0.95;
      // Particles grow slightly as they fly off
      particlesMatRef.current.size = 0.05 + exit * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      {/* ── Inner crystal — iridescent icosahedron ──────────────────── */}
      <mesh ref={innerRef}>
        <icosahedronGeometry args={[1, 1]} />
        <meshPhysicalMaterial
          ref={innerMatRef}
          color="#0BB4D4"
          metalness={0.15}
          roughness={0.08}
          transmission={0.55}
          thickness={0.6}
          ior={1.45}
          iridescence={1}
          iridescenceIOR={1.4}
          iridescenceThicknessRange={[100, 800]}
          attenuationColor="#22D3EE"
          attenuationDistance={1.4}
          clearcoat={0.6}
          clearcoatRoughness={0.1}
          envMapIntensity={1.4}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* ── Wireframe shell ─────────────────────────────────────────── */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.06, 1]} />
        <meshBasicMaterial
          ref={wireMatRef}
          color="#A5F3FC"
          wireframe
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ── Halo ring (perpendicular to camera) ─────────────────────── */}
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.65, 0.025, 24, 160]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color="#22D3EE"
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Secondary thinner halo, tilted */}
      <mesh rotation={[Math.PI / 2.5, Math.PI / 6, 0]}>
        <torusGeometry args={[1.95, 0.012, 16, 128]} />
        <meshBasicMaterial
          color="#A5F3FC"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* ── Aura particles ──────────────────────────────────────────── */}
      <points>
        <bufferGeometry ref={particlesGeoRef}>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={new Float32Array(PARTICLE_COUNT * 3)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={PARTICLE_COUNT}
            array={new Float32Array(PARTICLE_COUNT * 3)}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={particlesMatRef}
          size={0.05}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* ── Soft glow billboard (additive disk) ─────────────────────── */}
      <mesh>
        <circleGeometry args={[2.4, 48]} />
        <meshBasicMaterial
          color="#22D3EE"
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

const TMP_COL = new THREE.Color();
