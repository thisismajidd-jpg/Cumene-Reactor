import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';

/**
 * Glass packed-bed reactor centerpiece.
 *
 * Anatomy (horizontal orientation, axis = +X):
 *   ┌───── inlet pipe ───┐  outer coolant jacket  ┌── outlet pipe ───┐
 *   │ end-cap │ glass shell with catalyst pellets │ end-cap          │
 *   └─────────┘                                   └──────────────────┘
 *
 * Drives:
 *   • particles' axial speed       ← `flowSpeed` (set from T_inlet upstream)
 *   • pellet emissive intensity    ← `tProfile` array sampled along X
 *   • hotspot glow position        ← `hotspot` ([0,1] relative position)
 *   • coolant jacket pulse         ← `coolantIntensity`
 */
const LENGTH = 5;
const SHELL_R = 1.0;
const JACKET_R = 1.28;
const PELLET_COUNT = 240;
const PELLET_R = 0.07;
const PARTICLE_COUNT = 80;

export default function Reactor({
  flowSpeed = 0.4,
  tProfile = null,
  hotspot = 0.35,
  coolantIntensity = 0.35,
  reducedMotion = false,
}) {
  // ── Pellet positions, packed into the cylinder, deterministic. ──────
  const pellets = useMemo(() => buildPellets(), []);
  const pelletMeshRef = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  // Set instance transforms + initial colors once when the mesh mounts.
  useEffect(() => {
    if (!pelletMeshRef.current) return;
    const mesh = pelletMeshRef.current;
    pellets.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rx, p.ry, p.rz);
      const s = 0.85 + 0.3 * p.s;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      // Cool blue baseline; useFrame replaces this with the live heat ramp.
      tmpColor.setRGB(0.10, 0.40, 0.70);
      mesh.setColorAt(i, tmpColor);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [pellets, dummy, tmpColor]);

  // ── Particle flow positions / progress along the axis. ──────────────
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = Math.sqrt(Math.random()) * (SHELL_R - PELLET_R - 0.02);
      const a = Math.random() * Math.PI * 2;
      arr.push({
        startProgress: Math.random(), // 0..1 along axis
        radius: r,
        angle: a,
        speedJitter: 0.6 + Math.random() * 0.8,
      });
    }
    return arr;
  }, []);
  const particlesGeoRef = useRef(null);

  // ── Reactor group ref for gentle idle rotation. ─────────────────────
  const groupRef = useRef(null);

  useFrame((stateThree, delta) => {
    if (reducedMotion) return;
    // Idle rotation
    if (groupRef.current) {
      groupRef.current.rotation.x += delta * 0.06;
      // Tiny sway on Z for life
      groupRef.current.rotation.z =
        Math.sin(stateThree.clock.elapsedTime * 0.4) * 0.03;
    }

    // Pellet color along axis (heat profile, with hotspot bump). We use
    // InstancedMesh.setColorAt — three.js automatically wires up the per-
    // instance color attribute and meshStandardMaterial picks it up.
    if (pelletMeshRef.current) {
      const mesh = pelletMeshRef.current;
      for (let i = 0; i < pellets.length; i++) {
        const p = pellets[i];
        const u = (p.x + LENGTH / 2) / LENGTH; // 0 at inlet → 1 at outlet
        let heat;
        if (tProfile && tProfile.length > 1) {
          const idx = Math.min(
            tProfile.length - 1,
            Math.max(0, Math.floor(u * (tProfile.length - 1))),
          );
          heat = tProfile[idx]; // already 0..1
        } else {
          // Asymmetric peak around the hotspot: cool→hot→warm
          const d = Math.abs(u - hotspot);
          heat = Math.exp(-Math.pow(d * 3.2, 2));
        }
        rampColor(heat, tmpColor);
        mesh.setColorAt(i, tmpColor);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // Particles flow along +X. Each particle has its own progress that
    // increases at a rate proportional to flowSpeed, wrapping at the end.
    if (particlesGeoRef.current) {
      const positions = particlesGeoRef.current.attributes.position;
      const colors = particlesGeoRef.current.attributes.color;
      const t = stateThree.clock.elapsedTime;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const prog = (p.startProgress + t * flowSpeed * p.speedJitter * 0.5) % 1;
        const x = (prog - 0.5) * LENGTH;
        const wobble = Math.sin(t * 1.2 + i) * 0.02;
        const y = Math.sin(p.angle) * p.radius + wobble;
        const z = Math.cos(p.angle) * p.radius + wobble;
        positions.setXYZ(i, x, y, z);
        // Particles brighten near the hotspot
        const dHot = Math.abs(prog - hotspot);
        const glow = 0.55 + 0.45 * Math.exp(-Math.pow(dHot * 4.0, 2));
        colors.setXYZ(i, 0.45 * glow + 0.55, 0.85 * glow + 0.15, 1.0);
      }
      positions.needsUpdate = true;
      colors.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} rotation={[0, 0, 0]}>
      {/* ── Coolant jacket ──────────────────────────────────────────── */}
      <mesh>
        <cylinderGeometry
          args={[JACKET_R, JACKET_R, LENGTH * 0.95, 64, 1, true]}
        />
        <meshPhysicalMaterial
          color="#0E2B3A"
          transparent
          opacity={0.18}
          transmission={0.45}
          thickness={0.6}
          roughness={0.35}
          metalness={0.0}
          side={THREE.DoubleSide}
          emissive="#0DD3FF"
          emissiveIntensity={coolantIntensity}
        />
      </mesh>
      {/* Coolant ribbed bands for industrial detail */}
      {[-1.4, -0.7, 0, 0.7, 1.4].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[JACKET_R + 0.02, 0.04, 12, 48]} />
          <meshStandardMaterial
            color="#1B2C44"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
      ))}

      {/* ── Glass shell ─────────────────────────────────────────────── */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[SHELL_R, SHELL_R, LENGTH, 96, 1, true]} />
        <MeshTransmissionMaterial
          transmission={1}
          thickness={0.35}
          roughness={0.05}
          chromaticAberration={0.025}
          anisotropicBlur={0.1}
          distortion={0.05}
          distortionScale={0.4}
          temporalDistortion={0.04}
          ior={1.4}
          backside
          backsideThickness={0.08}
          color="#A8DAFF"
          attenuationColor="#0DD3FF"
          attenuationDistance={2.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Catalyst bed (instanced pellets) ───────────────────────── */}
      <instancedMesh ref={pelletMeshRef} args={[undefined, undefined, PELLET_COUNT]}>
        <sphereGeometry args={[PELLET_R, 14, 14]} />
        <meshStandardMaterial
          metalness={0.2}
          roughness={0.55}
          toneMapped={true}
        />
      </instancedMesh>

      {/* ── Particle flow ───────────────────────────────────────────── */}
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
          size={0.12}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* ── End caps ────────────────────────────────────────────────── */}
      {[-LENGTH / 2 - 0.05, LENGTH / 2 + 0.05].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[SHELL_R + 0.05, SHELL_R + 0.05, 0.15, 48]} />
          <meshStandardMaterial
            color="#1A2740"
            metalness={0.85}
            roughness={0.32}
          />
        </mesh>
      ))}

      {/* ── Inlet / outlet pipes ────────────────────────────────────── */}
      {[-1, 1].map((sign) => (
        <group key={sign} position={[(LENGTH / 2 + 0.12) * sign, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.18, 0.18, 0.55, 32]} />
            <meshStandardMaterial color="#162033" metalness={0.9} roughness={0.28} />
          </mesh>
          {/* Flange */}
          <mesh position={[sign * 0.27, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.27, 0.27, 0.06, 32]} />
            <meshStandardMaterial color="#0F1A2C" metalness={0.95} roughness={0.25} />
          </mesh>
          {/* Bolt heads */}
          {Array.from({ length: 8 }).map((_, j) => {
            const a = (j / 8) * Math.PI * 2;
            return (
              <mesh
                key={j}
                position={[sign * 0.31, Math.sin(a) * 0.21, Math.cos(a) * 0.21]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.025, 0.025, 0.02, 6]} />
                <meshStandardMaterial color="#2B3A57" metalness={0.95} roughness={0.2} />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* ── Thermocouple probes (decorative) ────────────────────────── */}
      {[-1.5, 0, 1.5].map((x, i) => (
        <group key={i} position={[x, JACKET_R + 0.08, 0]}>
          <mesh>
            <cylinderGeometry args={[0.025, 0.025, 0.5, 12]} />
            <meshStandardMaterial color="#2B3A57" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial
              color="#FACC15"
              emissive="#FACC15"
              emissiveIntensity={i === 1 ? 0.9 : 0.25}
              roughness={0.2}
              metalness={0.4}
            />
          </mesh>
        </group>
      ))}

      {/* ── Hotspot halo (additive billboard) ───────────────────────── */}
      <HotspotHalo hotspot={hotspot} />
    </group>
  );
}

/**
 * A soft additive disk that sits at the hotspot location to suggest a glowing
 * region inside the reactor without expensive volumetric tricks.
 */
function HotspotHalo({ hotspot }) {
  const ref = useRef(null);
  useFrame((state) => {
    if (!ref.current) return;
    const x = (hotspot - 0.5) * LENGTH;
    ref.current.position.x = x;
    ref.current.material.opacity =
      0.55 + 0.15 * Math.sin(state.clock.elapsedTime * 2.5);
  });
  return (
    <mesh ref={ref} rotation={[0, Math.PI / 2, 0]}>
      <circleGeometry args={[1.4, 32]} />
      <meshBasicMaterial
        color="#FACC15"
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── helpers ───────────────────────────────────────────────────────────
function buildPellets() {
  const out = [];
  let attempts = 0;
  const minR = 0.18; // min center-to-center distance
  while (out.length < PELLET_COUNT && attempts < PELLET_COUNT * 30) {
    attempts++;
    const x = (Math.random() - 0.5) * (LENGTH - 0.4);
    const r = Math.sqrt(Math.random()) * (SHELL_R - PELLET_R - 0.04);
    const a = Math.random() * Math.PI * 2;
    const y = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    let ok = true;
    for (const p of out) {
      const dx = x - p.x;
      const dy = y - p.y;
      const dz = z - p.z;
      if (dx * dx + dy * dy + dz * dz < minR * minR) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    out.push({
      x, y, z,
      rx: Math.random() * Math.PI,
      ry: Math.random() * Math.PI,
      rz: Math.random() * Math.PI,
      s: Math.random(),
    });
  }
  return out;
}

// Heat ramp: 0 → indigo, 0.4 → cyan, 0.7 → amber, 1.0 → red
const STOPS = [
  { t: 0.0,  c: [0.06, 0.18, 0.45] },
  { t: 0.35, c: [0.10, 0.55, 0.85] },
  { t: 0.65, c: [0.95, 0.65, 0.20] },
  { t: 1.0,  c: [0.95, 0.25, 0.20] },
];
function rampColor(t, color) {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (x >= a.t && x <= b.t) {
      const k = (x - a.t) / (b.t - a.t || 1);
      color.setRGB(
        a.c[0] + (b.c[0] - a.c[0]) * k,
        a.c[1] + (b.c[1] - a.c[1]) * k,
        a.c[2] + (b.c[2] - a.c[2]) * k,
      );
      return;
    }
  }
  color.setRGB(...STOPS[STOPS.length - 1].c);
}
