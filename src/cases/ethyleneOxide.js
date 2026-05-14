// Ethylene oxide production — non-isothermal multi-tube fixed-bed reactor.
//
// Source project: CHPE4512 Memo 5 — Non-Isothermal Fixed-Bed Reactor with
// Heat Transfer & Stability Analysis (Sultan Qaboos University, Spring 2026).
// Data extracted from "Ethylene oxide production.py" (Borman & Westerterp
// kinetics, Froment heat-transfer correlation, NIST WebBook ΔH values).
//
// Reactions (all three from the Final Report — now that the app supports an
// open-ended `sides` list, we model the full network using literature values):
//
//   R1 (primary, desired):
//       C2H4 + 0.5 O2 → C2H4O          (Ag-catalysed selective oxidation)
//       r1 = k1·C_A·C_O2^0.5,   k01 = 2.121, Ea1 = 60 kJ/mol
//       ΔH1 = −105 kJ/mol               (Borman & Westerterp, 1995)
//
//   R2 (side, parasitic combustion of ethylene):
//       C2H4 + 3 O2 → 2 CO2 + 2 H2O
//       r2 = k2·C_A·C_O2,       k02 = 24.92, Ea2 = 85 kJ/mol
//       ΔH2 = −1323 kJ/mol              (Borman & Westerterp, 1995)
//
//   R3 (side, EO over-oxidation):
//       C2H4O + 2.5 O2 → 2 CO2 + 2 H2O
//       r3 = k3·C_EO·C_O2,      k03 = 12.0, Ea3 = 83 kJ/mol
//       ΔH3 = −1218 kJ/mol              (Stoukides & Pavlou, 1986)
//
// References
//   [1] Borman, P. C.; Westerterp, K. R. Ind. Eng. Chem. Res. 1995, 34(1), 49.
//   [2] Froment, Bischoff & De Wilde, Chemical Reactor Analysis and Design,
//       3rd ed., Wiley 2011, p. 462 (U for fixed-bed cooling jackets).
//   [3] Perry's Chemical Engineers' Handbook, 8th ed., §2 (mean Cp values).
//   [4] NIST WebBook — standard enthalpies of formation.
//   [5] Fogler, Elements of Chemical Reaction Engineering, 6th ed., Eq. 8-35.

const N_TUBES = 1386;
const W_TOTAL = 18_110;            // kg catalyst (Memo 4 design)
const F_A0_TOTAL = 150.0;          // mol/s  C2H4
const F_B0_TOTAL =  75.0;          // mol/s  O2
const F_I0_TOTAL = 525.0;          // mol/s  N2 (inert)

export default {
  id: 'ethyleneOxide',
  title: 'Ethylene oxide production',
  subtitle: 'Non-isothermal multi-tube PBR (CHPE4512 Memo 5)',
  tagline:
    'Ag-catalysed selective oxidation of ethylene to EO competes with full combustion to CO₂. A 18.1 t fixed bed split across 1386 tubes (50 mm OD), cooled at 493 K, targeting X_A = 0.10 with peak EO selectivity.',
  reaction: {
    A: 'Ethylene', B: 'Oxygen', C: 'Ethylene oxide', D: 'Carbon dioxide', I: 'Nitrogen',
  },
  state: {
    activeCaseId: 'ethyleneOxide',
    reaction: {
      species: [
        { id: 'A', name: 'Ethylene',       formula: 'C₂H₄',  mw: 28.054, isLimiting: true,  isInert: false },
        { id: 'B', name: 'Oxygen',         formula: 'O₂',    mw: 31.998, isLimiting: false, isInert: false },
        { id: 'C', name: 'Ethylene oxide', formula: 'C₂H₄O', mw: 44.053, isLimiting: false, isInert: false },
        { id: 'D', name: 'Carbon dioxide', formula: 'CO₂',   mw: 44.010, isLimiting: false, isInert: false },
        { id: 'I', name: 'Nitrogen',       formula: 'N₂',    mw: 28.014, isLimiting: false, isInert: true  },
      ],
      primary: {
        // Power-law (not 'elementary') because Borman & Westerterp's kinetic
        // order in O₂ (½) is independent of the stoichiometric coefficient.
        type: 'powerLaw',
        // R1:  A + 0.5 B → C   (EO formation)
        stoich: { A: -1, B: -0.5, C: 1 },
        // Borman & Westerterp (1995) literature value.  With all three
        // reactions now active (the app supports an open-ended sides list),
        // we no longer need to fold R3's effect into R1.
        k0: 2.121,                       // mol/m³ basis (literature)
        Ea: 60_000,                      // J/mol  (Borman & Westerterp, 1995)
        orders: [
          { species: 'A', alpha: 1 },
          { species: 'B', alpha: 0.5 },
        ],
        adsorption: [],
        dHrx: -105_000,                  // J/mol  (exothermic)
        desired: true,
      },
      sides: [
        // R2 — parasitic combustion of ethylene.
        // Power-law: rate is first-order in O₂ even though three moles of O₂
        // are consumed per ethylene burnt.  ('elementary' would use |ν_B| = 3
        // as the order and inflate the rate by ~C_B² → thermal runaway.)
        {
          type: 'powerLaw',
          stoich: { A: -1, B: -3, D: 2 },
          k0: 24.92,                     // mol/m³ basis (Borman & Westerterp, 1995)
          Ea: 85_000,                    // J/mol
          orders: [
            { species: 'A', alpha: 1 },
            { species: 'B', alpha: 1 },
          ],
          adsorption: [],
          dHrx: -1_323_000,              // J/mol
          desired: false,
        },
        // R3 — EO over-oxidation (the third reaction from the Final Report).
        //   C₂H₄O + 2.5 O₂ → 2 CO₂ + 2 H₂O   (H₂O omitted from species table)
        //   r3 = k3·C_C·C_B    (first-order in EO, first-order in O₂)
        //   Stoukides & Pavlou (1986)
        {
          type: 'powerLaw',
          stoich: { C: -1, B: -2.5, D: 2 },
          k0: 12.0,                      // mol/m³ basis
          Ea: 83_000,                    // J/mol  (Stoukides & Pavlou, 1986)
          orders: [
            { species: 'C', alpha: 1 },
            { species: 'B', alpha: 1 },
          ],
          adsorption: [],
          dHrx: -1_218_000,              // J/mol
          desired: false,
        },
      ],
    },
    conditions: {
      T_inlet: 523.15,                   // K (250 °C)  — Memo 5 baseline
      P0:       15.0e5,                  // Pa (15 bar)
      // Whole-reactor totals — solver divides by tube count internally.
      feedFlow: {
        A: F_A0_TOTAL,                   // 150 mol/s  C₂H₄
        B: F_B0_TOTAL,                   //  75 mol/s  O₂
        C: 0,
        D: 0,
        I: F_I0_TOTAL,                   // 525 mol/s  N₂ (inert)
      },
      XTarget: 0.10,                     // Memo 4/5 design conversion
    },
    reactor: {
      type: 'PBR',
      pfr: { V: 0.5 },
      cstr: { V: 0.05 },
      pbr: {
        W: W_TOTAL / N_TUBES,            // ≈ 13.066 kg/tube
        tubes: N_TUBES,
        Dt: 0.05,                        // m — 50 mm tubes (industrial EO standard)
        perTube: true,
        Dp: 0.005,                       // m — catalyst particle
        phi: 0.40,                       // bed voidage
        rho_b: 1200,                     // kg/m³ — bulk density
        mu: 2.5e-5,                      // Pa·s — gas viscosity
        ergunEnabled: true,
      },
      isothermal: false,
      nonIso: {
        U:  160,                         // W/(m²·K) — Froment et al. (2011)
        Ta: 493.15,                      // K (220 °C) — coolant temperature
        // Mean Cp values (J/mol/K) over the 500–560 K range — Perry's 8e Table 2-150.
        // Encoded as [a, b, c, d] with Cp(T) = a + b·T·1e-3 + c·T²·1e-6 + d·T³·1e-9.
        cpCoeffs: {
          A: [60.0, 0, 0, 0],            // C₂H₄
          B: [31.0, 0, 0, 0],            // O₂
          C: [73.0, 0, 0, 0],            // EO
          D: [45.0, 0, 0, 0],            // CO₂
          I: [29.5, 0, 0, 0],            // N₂
        },
      },
    },
    constraints: {
      Tmax: null,
      Wmax: null,
      Vmax: null,
      Smin: 0.70,
    },
  },
  narrative: [
    'Design target: **20 000 t/yr EO** at 10 % per-pass conversion, 82.7 % selectivity (Final Report, CHPE4512 Sec.20). The full **three-reaction network** is modelled — R1 (selective oxidation, desired), R2 (full combustion of ethylene), and R3 (EO over-oxidation) — with literature kinetics (Borman & Westerterp 1995; Stoukides & Pavlou 1986).',
    'EO synthesis is a textbook selectivity problem: stop oxidation at the epoxide before ethylene burns to CO₂. The desired path has the lower activation energy (Eₐ₁ = 60 kJ/mol vs Eₐ₂ = 85 kJ/mol), so **lower temperature favours selectivity** — but lower T demands more catalyst to hit X_A = 0.10.',
    'The bed is **1386 tubes × 50 mm × ~5.6 m**, totalling 18.1 t of Ag/Al₂O₃ catalyst, cooled by a shell-side fluid at 493 K (220 °C). U = 160 W/(m²·K) gives a per-kg heat-transfer area of a = 4/(ρ_b·D_t) ≈ 0.067 m²/kg.',
    'The combustion side reaction releases **~12× more heat per ethylene molecule than the desired path** (ΔH₂ ≈ −1323 kJ/mol vs ΔH₁ ≈ −105 kJ/mol), so even modest selectivity loss produces a sharp hotspot. Tracking T_hotspot − T_coolant is the safety-critical diagnostic.',
    'Try the **Sensitivity** panel to sweep T_inlet (503–533 K) or T_coolant (473–503 K) and watch S_EO trade off against the hotspot. The Memo 5 stability criterion (reactor gain < 2) gives the upper bound on T_inlet.',
  ],
};
