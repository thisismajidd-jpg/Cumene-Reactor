// Ethylene oxide — simplified isothermal PFR with combustion side reaction.
//
//   1)  C2H4 + 1/2 O2  →  EO        (desired,   Ag-catalyzed selective oxidation)
//   2)  C2H4 + 3 O2    →  2 CO2 + 2 H2O   (parasitic combustion)
//
// Both rate laws written first-order in C2H4 (C_A) and pseudo-first-order in O2 (C_B):
//   r1 = k1 · C_A · C_B
//   r2 = k2 · C_A · C_B
//
// Rate constants picked so that S(C2H4 → EO) ≈ 0.78 at X ≈ 0.55 — typical of an
// Ag/α-Al2O3 catalyst at 500 K. (Numbers are pedagogical, not Aspen-grade.)

export default {
  id: 'ethyleneOxide',
  title: 'Ethylene oxide production',
  subtitle: 'Isothermal PFR with selectivity challenge',
  tagline:
    'Ag-catalyzed selective oxidation of ethylene to EO competes with full combustion. A textbook selectivity-vs-conversion trade-off.',
  state: {
    activeCaseId: 'ethyleneOxide',
    reaction: {
      species: [
        { id: 'A', name: 'Ethylene',     formula: 'C₂H₄', mw: 28.054, isLimiting: true,  isInert: false },
        { id: 'B', name: 'Oxygen',       formula: 'O₂',   mw: 31.998, isLimiting: false, isInert: false },
        { id: 'C', name: 'EO',           formula: 'C₂H₄O', mw: 44.053, isLimiting: false, isInert: false },
        { id: 'D', name: 'CO₂',          formula: 'CO₂',  mw: 44.010, isLimiting: false, isInert: false },
        { id: 'I', name: 'Methane',      formula: 'CH₄',  mw: 16.043, isLimiting: false, isInert: true  },
      ],
      primary: {
        type: 'elementary',
        stoich: { A: -1, B: -0.5, C: 1 },
        k0: 6.5e3,
        Ea: 60_000,
        orders: [
          { species: 'A', alpha: 1 },
          { species: 'B', alpha: 1 },
        ],
        adsorption: [],
        dHrx: -105_000,
        desired: true,
      },
      sideReactionEnabled: true,
      side: {
        type: 'elementary',
        stoich: { A: -1, B: -3, D: 2 },
        k0: 9.0e3,
        Ea: 73_000,
        orders: [
          { species: 'A', alpha: 1 },
          { species: 'B', alpha: 1 },
        ],
        adsorption: [],
        dHrx: -1_323_000,
        desired: false,
      },
    },
    conditions: {
      T_inlet: 500,
      P0: 20.0e5,                  // 20 bar
      feedFlow: {
        A: 0.05,
        B: 0.10,
        C: 0,
        D: 0,
        I: 0.05,
      },
      XTarget: 0.55,
    },
    reactor: {
      type: 'PFR',
      pfr: { V: 0.5 },
      cstr: { V: 0.05 },
      pbr: {
        W: 50, tubes: 1, Dt: 0.0254, perTube: true,
        Dp: 0.005, phi: 0.5, rho_b: 575, mu: 1.76e-5,
        ergunEnabled: false,
      },
      isothermal: true,
      nonIso: {
        U: 65, Ta: 480,
        cpCoeffs: {
          A: [3.71, 234.6, -115.7, 22.0],
          B: [29.0,  -2.0,    0,     0],
          C: [-7.0,  200.0, -100.0,  20.0],
          D: [22.0,   60.0,  -15.0,   0],
          I: [-4.224, 306.3, -158.6, 32.1],
        },
      },
    },
    constraints: {
      Tmax: null, Wmax: null, Vmax: 1.5, Smin: 0.7,
    },
  },
  narrative: [
    'EO synthesis is a classic selectivity problem: you want to stop oxidation at the epoxide rather than burn ethylene to CO₂.',
    'Both rates are first-order in O₂ here, so **decreasing O₂ partial pressure** suppresses the combustion path more than the desired path.',
    'Try the **Optimizer** with objective **maximize selectivity** and the F₀(B) knob — the search will find a leaner O₂ feed.',
  ],
};
