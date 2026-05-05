// Cumene production — featured case.
//
// Reproduces the Memo 5 baseline (CHPE4512, SQU, Group 03):
//   Multi-tube fixed-bed PBR · non-isothermal · HITEC molten salt coolant
//   Calibrated A1 ≈ 22.7, A2 ≈ 14.11 in mol/m³ basis (ms-friendly form)
//   ΔH₁ = −99.4 kJ/mol, ΔH₂ = −95.3 kJ/mol
//   Baseline U = 65 W/(m²·K), Tc = 600 K, T_in = 628.15 K, P0 = 35 bar
//   W_per_tube = 11.1525 kg, 4000 tubes
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
  subtitle: 'Multi-tube non-isothermal PBR (Memo 5 baseline)',
  tagline:
    'Propylene + Benzene → Cumene, with the parasitic A + C → DIPB side reaction. Reactor gain ≈ 2.17 — the system operates near the parametric sensitivity boundary.',
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
      sideReactionEnabled: true,
      side: {
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
    },
    conditions: {
      T_inlet: 628.15,
      P0: 35.0e5,                       // Pa (35 bar)
      feedFlow: {
        A: F_A0_TOTAL / N_TUBES,        // per tube basis
        B: F_B0_TOTAL / N_TUBES,
        C: 0,
        D: 0,
        I: F_I0_TOTAL / N_TUBES,
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
        U: 65,
        Ta: 600,
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
    'This design operates near the **parametric sensitivity boundary** — the calibrated reactor gain at baseline is approximately **2.17 K/K**, which would be classified as marginally unstable by the standard threshold of 2.',
    'The hotspot sits near **3% of the bed length** at ~640 K. Increasing the heat-transfer coefficient U from 100 to 150 W/(m²·K) restores a comfortable stability margin.',
    'Try the **Sensitivity panel**: drag the U slider upward — you\'ll see the hotspot flatten and the reactor gain drop below 2 within a few seconds of dragging.',
    'Selectivity to cumene at X = 0.99 is held at 0.929 by the calibrated A2/A1 ratio. The DIPB byproduct stoichiometry (S_C + 2·S_D = 1) is conserved by the solver.',
  ],
};
