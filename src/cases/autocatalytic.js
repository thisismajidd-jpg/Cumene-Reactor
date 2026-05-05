// Autocatalytic CSTR — the classic multiple-steady-state demo.
//
//   A + B → 2B           (B is the catalyst and the product)
//   r = k · C_A · C_B
//
// At low conversion B is scarce so the rate is small; as conversion grows, B
// builds up and accelerates the reaction; at high conversion A is depleted
// and the rate falls again. Plotted against the Damköhler number Da = V·k·C_A0,
// you get the classic S-shaped curve with a region of three intersections.

export default {
  id: 'autocatalytic',
  title: 'Autocatalytic CSTR',
  subtitle: 'Multiple steady states & bifurcation',
  tagline:
    'A + B → 2B — the product is its own catalyst. Sweep volume and watch the system jump between low- and high-conversion branches.',
  state: {
    activeCaseId: 'autocatalytic',
    reaction: {
      species: [
        { id: 'A', name: 'Reactant',  formula: 'A', mw: 60, isLimiting: true,  isInert: false },
        { id: 'B', name: 'Autocat.',  formula: 'B', mw: 60, isLimiting: false, isInert: false },
      ],
      primary: {
        type: 'elementary',
        stoich: { A: -1, B: 1 },
        k0: 0.5,
        Ea: 0,                          // isothermal, k0 acts as k directly
        orders: [
          { species: 'A', alpha: 1 },
          { species: 'B', alpha: 1 },
        ],
        adsorption: [],
        dHrx: 0,
        desired: true,
      },
      sideReactionEnabled: false,
      side: {
        type: 'elementary',
        stoich: { },
        k0: 1, Ea: 1, orders: [], adsorption: [], dHrx: 0, desired: false,
      },
    },
    conditions: {
      T_inlet: 350,
      P0: 1.0e5,                        // 1 bar
      feedFlow: {
        A: 0.1,
        B: 0.001,                       // tiny seed of catalyst — needed to "start" rxn
      },
      XTarget: 0.8,
    },
    reactor: {
      type: 'CSTR',
      pfr: { V: 0.1 },
      cstr: { V: 5.0 },                 // m³ — sized to land in the multiplicity region
      pbr: {
        W: 50, tubes: 1, Dt: 0.0254, perTube: true,
        Dp: 0.005, phi: 0.5, rho_b: 575, mu: 1.76e-5, ergunEnabled: false,
      },
      isothermal: true,
      nonIso: {
        U: 0, Ta: 300,
        cpCoeffs: {
          A: [40, 0, 0, 0],
          B: [40, 0, 0, 0],
        },
      },
    },
    constraints: { Tmax: null, Wmax: null, Vmax: null, Smin: null },
  },
  narrative: [
    'For a CSTR with rate r = k C_A C_B, the steady-state mole balance is **cubic in conversion** — it can have one root (low or high X) or three roots (bistability).',
    'Use the bifurcation diagram below to see how the steady-state set evolves with reactor volume V. The middle branch is **unstable** — physically unreachable from a startup.',
    'The Studio CSTR solver detects all roots automatically and reports each one as a separate steady state in the Summary tab.',
  ],
};
