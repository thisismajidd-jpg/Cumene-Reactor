// Canonical initial state for the reactor design app.
// All numerical values are stored in SI; the navbar units toggle changes only
// how the UI displays and parses them.

export const initialState = {
  // ── Display preference ────────────────────────────────────────────────
  unitSystem: 'engineering', // 'si' | 'engineering'

  // ── Reaction (with optional side reaction) ────────────────────────────
  reaction: {
    species: [
      { id: 'A', name: 'A', formula: '', mw: 0, isLimiting: true,  isInert: false },
      { id: 'B', name: 'B', formula: '', mw: 0, isLimiting: false, isInert: false },
      { id: 'C', name: 'C', formula: '', mw: 0, isLimiting: false, isInert: false },
    ],
    primary: {
      type: 'elementary',
      stoich: { A: -1, B: -1, C: 1 },
      k0: 1e3,
      Ea: 75_000,                          // J/mol
      orders: [
        { species: 'A', alpha: 1 },
        { species: 'B', alpha: 1 },
      ],
      adsorption: [],
      dHrx: -80_000,                       // J/mol
      desired: true,
    },
    sideReactionEnabled: false,
    side: {
      type: 'elementary',
      stoich: { A: -1, C: -1, D: 1 },
      k0: 1e5,
      Ea: 100_000,
      orders: [
        { species: 'A', alpha: 1 },
        { species: 'C', alpha: 1 },
      ],
      adsorption: [],
      dHrx: -50_000,
      desired: false,
    },
  },

  // ── Operating conditions ──────────────────────────────────────────────
  conditions: {
    T_inlet: 600,                          // K
    P0: 30 * 1e5,                          // Pa  (= 30 bar)
    feedFlow: { A: 0.025, B: 0.025, C: 0, I: 0 },   // mol/s
    XTarget: 0.95,
  },

  // ── Reactor configuration ─────────────────────────────────────────────
  reactor: {
    type: 'PFR',                           // 'PFR' | 'CSTR' | 'PBR'
    pfr: { V: 0.1 },                       // m³
    cstr: { V: 0.05 },                     // m³
    pbr: {
      W: 50,                               // kg per tube (or whole reactor when perTube=false)
      tubes: 1,
      Dt: 0.0254,                          // m
      perTube: true,
      Dp: 0.005,
      phi: 0.5,
      rho_b: 575,
      mu: 1.76e-5,                         // Pa·s
      ergunEnabled: false,
    },
    isothermal: true,
    nonIso: {
      U: 65,                               // W/(m²·K)
      Ta: 600,                             // K
      cpCoeffs: {                          // each: [a, b, c, d] in J/(mol·K)
        A: [3.71, 234.6, -115.7, 22.0],
        B: [-33.92, 474.0, -301.8, 71.3],
        C: [-39.40, 636.0, -392.0, 92.7],
        D: [-47.00, 830.0, -500.0, 118.0],
        I: [-4.224, 306.3, -158.6, 32.1],
      },
    },
  },

  // ── Optional constraints (null = inactive) ────────────────────────────
  constraints: {
    Tmax: null,
    Wmax: null,
    Vmax: null,
    Smin: null,
  },

  // ── Solver bookkeeping ────────────────────────────────────────────────
  solver: {
    status: 'idle',                        // 'idle' | 'running' | 'success' | 'error'
    result: null,                          // last solveReactor() return
    runId: 0,
  },

  // ── Active case study (if loaded from a preset) ───────────────────────
  activeCaseId: null,
};
