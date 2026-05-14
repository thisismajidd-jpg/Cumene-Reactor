// Cumene production — featured case.
//
// Optimised operating point (CHPE4512, SQU, Group 03):
//   Multi-tube fixed-bed PBR · non-isothermal
//   T_inlet = 628 K (354.9 °C), T_coolant = 620 K (346.9 °C), U = 120 W/(m²·K)
//   Achieves X = 99%+ at S_cumene ≈ 93.2 % (best selectivity in feasible region)
//   U = 120 is achievable with high-pressure steam or hot-oil shell cooling.
//   Calibrated A1 ≈ 22.7, A2 ≈ 13.77  ΔH₁ = −99.4 kJ/mol, ΔH₂ = −95.3 kJ/mol
//   W_per_tube = 11.1525 kg, 4000 tubes, P0 = 35 bar
//
// All values are stored in SI (mol/s, K, Pa, m, kg, J/mol, W/(m²·K)).

const N_TUBES = 4000;
const F_A0_TOTAL = 27.75;       // mol/s propylene
const F_B0_TOTAL = 30.75;       // mol/s benzene
const F_I0_TOTAL = 1.46;        // mol/s propane (inert)
const W_TOTAL = 44610;          // kg

export default {
  id: 'cumene',
  title: 'Cumene production',
  subtitle: 'Multi-tube non-isothermal PBR — optimised operating point',
  tagline:
    'Propylene + Benzene → Cumene, with the parasitic A + C → DIPB side reaction. Optimised at T_in = 628 K, T_cool = 620 K, U = 120 W/(m²·K) for X ≥ 99 % at maximum selectivity.',
  reaction: {
    A: 'Propylene', B: 'Benzene', C: 'Cumene', D: 'DIPB', I: 'Propane',
  },
  state: {
    activeCaseId: 'cumene',
    reaction: {
      species: [
        { id: 'A', name: 'Propylene', formula: 'C₃H₆',  mw: 42.081, isLimiting: true,  isInert: false },
        { id: 'B', name: 'Benzene',   formula: 'C₆H₆',  mw: 78.114, isLimiting: false, isInert: false },
        { id: 'C', name: 'Cumene',    formula: 'C₉H₁₂', mw: 120.195, isLimiting: false, isInert: false },
        { id: 'D', name: 'DIPB',      formula: 'C₁₂H₁₈', mw: 162.276, isLimiting: false, isInert: false },
        { id: 'I', name: 'Propane',   formula: 'C₃H₈',  mw: 44.097,  isLimiting: false, isInert: true  },
      ],
      primary: {
        type: 'elementary',
        stoich: { A: -1, B: -1, C: 1 },
        k0: 22.703,                    // calibrated mol/m³ basis (memo 5)
        Ea: 104_200,                   // J/mol
        orders: [
          { species: 'A', alpha: 1 },
          { species: 'B', alpha: 1 },
        ],
        adsorption: [],
        dHrx: -99_400,
        desired: true,
      },
      sides: [
        // R2 — parasitic A + C → D (DIPB formation)
        {
          type: 'elementary',
          stoich: { A: -1, C: -1, D: 1 },
          k0: 14.11,                     // calibrated for S = 0.929
          Ea: 120_200,                   // J/mol (memo 5)
          orders: [
            { species: 'A', alpha: 1 },
            { species: 'C', alpha: 1 },
          ],
          adsorption: [],
          dHrx: -95_300,
          desired: false,
        },
      ],
    },
    conditions: {
      T_inlet: 628,                        // K (354.9 °C) — optimised
      P0: 35.0e5,                       // Pa (35 bar)
      // Whole-reactor totals — the solver divides by the tube count when it
      // builds its single-tube simulation (see hooks/useSolver.js).
      feedFlow: {
        A: F_A0_TOTAL,                  // 27.75 mol/s — propylene
        B: F_B0_TOTAL,                  // 30.75 mol/s — benzene
        C: 0,
        D: 0,
        I: F_I0_TOTAL,                  //  1.46 mol/s — propane (inert)
      },
      XTarget: 0.99,
    },
    reactor: {
      type: 'PBR',
      pfr: { V: 0.1 },
      cstr: { V: 0.05 },
      pbr: {
        W: W_TOTAL / N_TUBES,           // ≈ 11.1525 kg/tube
        tubes: N_TUBES,
        Dt: 0.0254,
        perTube: true,
        Dp: 0.005,
        phi: 0.5,
        rho_b: 575,
        mu: 1.76e-5,
        ergunEnabled: true,
      },
      isothermal: false,
      nonIso: {
        U: 120,                            // W/(m²·K) — optimised (steam/hot-oil cooling)
        Ta: 620,                           // K (346.9 °C) — optimised
        cpCoeffs: {
          A: [3.71, 234.6, -115.7, 22.0],
          B: [-33.92, 474.0, -301.8, 71.3],
          C: [-39.40, 636.0, -392.0, 92.7],
          D: [-47.00, 830.0, -500.0, 118.0],
          I: [-4.224, 306.3, -158.6, 32.1],
        },
      },
    },
    constraints: {
      Tmax: 700,
      Wmax: null,
      Vmax: null,
      Smin: 0.90,
    },
  },
  narrative: [
    'Operating conditions were optimised over a grid of T_inlet × T_coolant × U to maximise selectivity subject to X ≥ 0.99. The winner: **T_in = 628 K, T_cool = 620 K, U = 120 W/(m²·K)**.',
    'The key insight: keeping T_coolant only **5 K below T_inlet** with a high U makes the reactor nearly isothermal at ~628 K. Because the side reaction has a higher activation energy (Ea₂ = 120.2 kJ/mol > Ea₁ = 104.2 kJ/mol), lower controlled temperature maximises S_cumene.',
    'U = 120 W/(m²·K) is industrially achievable with **high-pressure steam or hot-oil shell cooling** on a 1-inch tube bundle — within the standard 80–200 W/(m²·K) range for gas/steam systems.',
    'The hotspot is only **+7.5 K above T_inlet** (632.5 K) — far below the Memo 5 baseline hotspot. Reactor gain drops well below 2 — the system is comfortably stable.',
  ],
};
