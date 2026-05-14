// Public solver API.  The whole UI talks to the solver through this single
// function; nothing else under src/solver/ is imported by components.

import { rk4Integrate, rk4IntegrateAdaptive } from './rk4.js';
import { buildPBRSystem } from './pbr.js';
import { buildPFRSystem } from './pfr.js';
import { solveCSTR } from './cstr.js';
import { processTrajectory } from './postprocess.js';
import { buildRateLaw } from './kinetics.js';
import { alphaErgun, gasDensity } from './ergun.js';
import { R, DEFAULT_RK4_STEPS } from './constants.js';

/**
 * @param {Object} config   Reactor design configuration in strict SI units.
 *
 * Shape:
 *   {
 *     reactor: { type: 'PFR'|'PBR'|'CSTR', V?, W?, ergun?: {...PBR only} , tubes? },
 *     species: ['A','B','C','D','I'],
 *     reactions: [
 *       {
 *         desired?: boolean,
 *         dHrx?: number,                            // J/mol of reaction extent
 *         stoich: { A: -1, B: -1, C: 1 },
 *         rateLaw: { type, k0, Ea, ... }            // descriptor for buildRateLaw
 *       }, ...
 *     ],
 *     feed: { F0: { A, B, ... } in mol/s, T0: K, P0: Pa },
 *     thermal?: {                                    // omit ⇒ isothermal
 *       Ua: number,                                  // PBR: U·a/ρ_b ; PFR: U·a
 *       Ta: number,
 *       cpCoeffs: { A: [a,b,c,d], ... }
 *     },
 *     constraints?: { Xtarget, Tmax, Wmax, Vmax, Smin },
 *     numerics?: { steps, adaptive }
 *   }
 *
 * Returns:
 *   {
 *     ok,
 *     reactorType,
 *     basis: 'W' | 'V',
 *     trajectory: { ts, F, C, T, P, X, S, Y, summary, warnings } | null,
 *     cstr: { solutions, message } | null,
 *     warnings, message
 *   }
 */
export function solveReactor(config) {
  try {
    const reactions = config.reactions.map((rx) => ({
      ...rx,
      rate: buildRateLaw(rx.rateLaw),
    }));
    const baseCfg = { ...config, reactions };

    if (config.reactor.type === 'CSTR') {
      const result = solveCSTR({
        species: config.species,
        reactions,
        feed: config.feed,
        reactor: config.reactor,
      });
      return {
        ok: result.ok,
        reactorType: 'CSTR',
        basis: 'V',
        trajectory: null,
        cstr: result,
        warnings: [],
        message: result.message,
      };
    }

    if (config.reactor.type === 'PBR') {
      const ergunCfg = buildErgunConfig(config);
      const system = buildPBRSystem({
        species: config.species,
        reactions,
        feed: config.feed,
        thermal: config.thermal ?? null,
        ergun: ergunCfg,
      });
      const integrator = config.numerics?.adaptive ? rk4IntegrateAdaptive : rk4Integrate;
      const steps = config.numerics?.steps ?? DEFAULT_RK4_STEPS;
      const Xtarget = config.constraints?.Xtarget;

      // ── 1. Auto-extend pass: grow the integration envelope until X_target
      // is reached (or until a hard cap stops us).  W in state acts only as
      // an initial seed — the user no longer specifies catalyst inventory
      // directly; it is derived from the target conversion.
      let Wenv = Math.max(config.reactor.W ?? 1, 1);
      const W_CAP = 1_000_000;        // kg/tube — physical absurdity ceiling
      const MAX_EXTENSIONS = 12;      // 2¹² = 4096× starting envelope
      let out;
      let processed;
      let extensions = 0;
      while (extensions <= MAX_EXTENSIONS) {
        out = integrator(system.rhs, 0, Wenv, system.y0, { steps });
        if (!out.ok) {
          return { ok: false, message: out.message, warnings: [], trajectory: null };
        }
        processed = processTrajectory({
          ts: out.ts, ys: out.ys,
          species: config.species,
          indices: system.indices,
          feed: config.feed,
          reactions,
          constraints: config.constraints,
          basis: 'W',
        });
        const reached =
          Xtarget == null ||
          (processed.summary.W_for_target != null &&
            processed.summary.W_for_target < Wenv * 0.95);
        if (reached) break;
        if (Wenv * 2 > W_CAP) break;
        Wenv *= 2;
        extensions++;
      }

      // ── 2. Truncation pass: integrate again, this time stopping at
      // 1.2 × W_for_target so the trajectory shows the designed reactor
      // plus a little context past the design point.  When X_target was not
      // reached at the cap we keep the auto-extended trajectory.
      const Wdesign = processed.summary.W_for_target;
      const warnings = [...(processed.warnings ?? [])];
      if (Wdesign != null && Wdesign > 0) {
        const Wplot = 1.2 * Wdesign;
        const out2 = integrator(system.rhs, 0, Wplot, system.y0, { steps });
        if (out2.ok) {
          processed = processTrajectory({
            ts: out2.ts, ys: out2.ys,
            species: config.species,
            indices: system.indices,
            feed: config.feed,
            reactions,
            constraints: config.constraints,
            basis: 'W',
          });
          warnings.push(...(processed.warnings ?? []));
        }
      } else if (Xtarget != null) {
        warnings.push({
          level: 'warning',
          code: 'XTARGET_UNREACHED',
          message: `X_target = ${Xtarget} not reached even at ${Wenv.toFixed(0)} kg/tube; kinetics may be too slow or X_target too aggressive.`,
        });
      }

      return {
        ok: true,
        reactorType: 'PBR',
        basis: 'W',
        trajectory: processed,
        cstr: null,
        warnings,
        message: 'completed',
      };
    }

    // Default: PFR
    const system = buildPFRSystem({
      species: config.species,
      reactions,
      feed: config.feed,
      thermal: config.thermal ?? null,
    });
    const Vmax = config.reactor.V;
    const integrator = config.numerics?.adaptive ? rk4IntegrateAdaptive : rk4Integrate;
    const out = integrator(system.rhs, 0, Vmax, system.y0, {
      steps: config.numerics?.steps ?? DEFAULT_RK4_STEPS,
    });
    if (!out.ok) {
      return { ok: false, message: out.message, warnings: [], trajectory: null };
    }
    const processed = processTrajectory({
      ts: out.ts,
      ys: out.ys,
      species: config.species,
      indices: system.indices,
      feed: config.feed,
      reactions,
      constraints: config.constraints,
      basis: 'V',
    });
    return {
      ok: true,
      reactorType: 'PFR',
      basis: 'V',
      trajectory: processed,
      cstr: null,
      warnings: processed.warnings,
      message: 'completed',
    };
  } catch (err) {
    return {
      ok: false,
      message: err?.message ?? 'unknown error',
      trajectory: null,
      cstr: null,
      warnings: [
        { level: 'danger', code: 'SOLVER_THREW', message: String(err?.message ?? err) },
      ],
    };
  }
}

function buildErgunConfig(config) {
  const e = config.reactor.ergun;
  if (!e || !e.enabled) return null;
  const { Dp, phi, mu, rho_b, Ac, MW_avg, T_ref } = e;
  // Mass velocity G = (Σ F·MW) / Ac.   feed.F0 is in mol/s, MW in kg/kmol.
  const m_dot = config.species.reduce((sum, sp) => {
    const F = config.feed.F0[sp] ?? 0;
    const MW = e.molarMasses?.[sp] ?? 0;
    return sum + F * (MW / 1000); // mol/s · kg/mol
  }, 0);
  const G = m_dot / Ac;
  const rho_g0 = gasDensity({ P0: config.feed.P0, T: T_ref ?? config.feed.T0, MW_avg, R });
  const alpha = alphaErgun({ G, rho_g0, Dp, phi, mu, P0: config.feed.P0, rho_b, Ac });
  return { alpha };
}
