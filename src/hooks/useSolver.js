// Bridges the global state to the (pure) solver.
//
// The hook builds a solver-config from current state, calls solveReactor, and
// pushes the result into state under `solver.result`.  Re-runs are debounced
// so slider drags don't fire 60 times a second.

import { useEffect, useMemo, useRef } from 'react';
import { solveReactor } from '../solver/index.js';
import { useReactor } from './useReactor.js';
import { useDebouncedValue } from './useDebouncedValue.js';
import { DEFAULT_DEBOUNCE_MS } from '../utils/constants.js';

/**
 * Build the solver `config` object from the current global state.
 *
 * IMPORTANT: state is already in SI, so we only translate shape — no unit math.
 */
export function buildSolverConfig(state) {
  const speciesIds = state.reaction.species.map((s) => s.id);

  // Reactions array
  const reactions = [];
  reactions.push(buildReaction(state.reaction.primary));
  if (state.reaction.sideReactionEnabled) {
    reactions.push(buildReaction(state.reaction.side));
  }

  // Feed: F0 only contains keys that exist in the species list.
  // For a multi-tube PBR, state.conditions.feedFlow stores the TOTAL reactor
  // flow rate (mol/s, what the user sees in the UI). The solver simulates a
  // single representative tube, so we divide by the tube count here. PFR/CSTR
  // and single-tube PBRs are unaffected (divisor = 1).
  const tubeDivisor =
    state.reactor.type === 'PBR' && state.reactor.pbr.tubes > 1
      ? state.reactor.pbr.tubes
      : 1;
  const F0 = {};
  for (const id of speciesIds) {
    F0[id] = (state.conditions.feedFlow[id] ?? 0) / tubeDivisor;
  }

  // Forward the case's explicit limiting-species hint (the species marked
  // `isLimiting: true` in the species table).  Postprocess uses it instead of
  // the F/|ν| heuristic so X is reported on the species the user actually
  // designs around — e.g. ethylene in the EO case, not oxygen.
  const limitingHint = state.reaction.species.find((s) => s.isLimiting)?.id;

  const feed = {
    F0,
    T0: state.conditions.T_inlet,
    P0: state.conditions.P0,
    limitingSpecies: limitingHint,
  };

  // Reactor block
  const r = state.reactor;
  let reactor;
  if (r.type === 'PBR') {
    const totalW = r.pbr.perTube ? r.pbr.W : r.pbr.W / Math.max(r.pbr.tubes, 1);
    const Ac = (Math.PI / 4) * r.pbr.Dt * r.pbr.Dt;
    reactor = {
      type: 'PBR',
      W: r.pbr.perTube ? r.pbr.W : totalW,
      ergun: r.pbr.ergunEnabled
        ? {
            enabled: true,
            Dp: r.pbr.Dp,
            phi: r.pbr.phi,
            rho_b: r.pbr.rho_b,
            mu: r.pbr.mu,
            Ac,
            MW_avg: avgMW(state),
            T_ref: state.conditions.T_inlet,
            molarMasses: Object.fromEntries(
              state.reaction.species.map((s) => [s.id, s.mw || 0])
            ),
          }
        : null,
    };
  } else if (r.type === 'CSTR') {
    reactor = { type: 'CSTR', V: r.cstr.V };
  } else {
    reactor = { type: 'PFR', V: r.pfr.V };
  }

  // Thermal
  let thermal = null;
  if (!r.isothermal) {
    if (r.type === 'PBR') {
      // Per-kg basis: U·a/ρ_b. a_spec = 4 / D_t for tubular packed beds.
      const aSpec = 4 / r.pbr.Dt;
      const Ua = (r.nonIso.U * aSpec) / r.pbr.rho_b;
      thermal = { Ua, Ta: r.nonIso.Ta, cpCoeffs: r.nonIso.cpCoeffs };
    } else if (r.type === 'PFR') {
      // PFR: pretend D_t = 0.0254 m default (we'll expose this in the UI later).
      const aSpec = 4 / 0.0254;
      const Ua = r.nonIso.U * aSpec;
      thermal = { Ua, Ta: r.nonIso.Ta, cpCoeffs: r.nonIso.cpCoeffs };
    }
  }

  return {
    reactor,
    species: speciesIds,
    reactions,
    feed,
    thermal,
    constraints: {
      Xtarget: state.conditions.XTarget,
      Tmax:  state.constraints.Tmax,
      Tmin:  state.constraints.Tmin,
      dTmax: state.constraints.dTmax,
      Wmax:  state.constraints.Wmax,
      Vmax:  state.constraints.Vmax,
      Pmin:  state.constraints.Pmin,
      dPmax: state.constraints.dPmax,
      Xmin:  state.constraints.Xmin,
      Xmax:  state.constraints.Xmax,
      Smin:  state.constraints.Smin,
    },
  };
}

function buildReaction(rxn) {
  return {
    desired: !!rxn.desired,
    dHrx: rxn.dHrx,
    stoich: rxn.stoich,
    rateLaw: {
      type: rxn.type,
      k0: rxn.k0,
      Ea: rxn.Ea,
      orders: rxn.orders,
      adsorption: rxn.adsorption,
      reactants: Object.entries(rxn.stoich)
        .filter(([, nu]) => nu < 0)
        .map(([species, nu]) => ({ species, nu })),
    },
  };
}

function avgMW(state) {
  let acc = 0;
  let n = 0;
  for (const sp of state.reaction.species) {
    const F = state.conditions.feedFlow[sp.id] ?? 0;
    if (F > 0) {
      acc += F * (sp.mw || 0);
      n += F;
    }
  }
  return n > 0 ? acc / n : 0;
}

/**
 * Subscribes to state changes, runs the solver (debounced), pushes the result
 * back into state. The studio relies entirely on this auto-loop — no manual
 * "solve" CTA is required.
 *
 * IMPORTANT: we deliberately debounce ONLY the input slices (reaction,
 * conditions, reactor, constraints). Including `state.solver` would cause an
 * infinite loop — every solve dispatches `solverStatus`/`solverResult`, which
 * would change `state`, retrigger the debounce, and re-solve indefinitely.
 */
export function useAutoSolve({ debounceMs = DEFAULT_DEBOUNCE_MS, enabled = true } = {}) {
  const { state, set } = useReactor();

  // Stable reference unless one of the input slices actually changed. Reducer
  // dispatches preserve references on untouched slices so this only "ticks"
  // when an input the solver cares about really changed.
  const inputs = useMemo(
    () => ({
      reaction: state.reaction,
      conditions: state.conditions,
      reactor: state.reactor,
      constraints: state.constraints,
    }),
    [state.reaction, state.conditions, state.reactor, state.constraints],
  );

  const debouncedInputs = useDebouncedValue(inputs, debounceMs);
  const runIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const myId = ++runIdRef.current;
    set.solverStatus('running');
    // Run on next tick so the spinner has a chance to render.
    const t = setTimeout(() => {
      const config = buildSolverConfig(debouncedInputs);
      const result = solveReactor(config);
      // Drop late results.
      if (myId !== runIdRef.current) return;
      set.solverResult(result);
    }, 0);
    return () => clearTimeout(t);
  }, [debouncedInputs, enabled, set]);
}
