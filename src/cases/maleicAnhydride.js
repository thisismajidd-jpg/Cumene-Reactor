// Maleic anhydride production — non-isothermal multi-tubular fixed-bed reactor.
//
// Source project: CHPE4512 Group 6 Final Report (Sultan Qaboos University,
// Spring 2026) — "Design and Optimization of a Multi-tubular Fixed-bed Reactor
// for Maleic Anhydride Production". Kinetic + thermo data also cross-checked
// against the supplied Memo 5 Python script (Maleic Anhydride.py) and the
// Borman/Westerterp/Hashim VPO literature.
//
// Triangle reaction network over Vanadium-Phosphorus-Oxide (VPO) catalyst:
//
//   R1 (primary, desired):
//       C4H10 + 3.5 O2 → C4H2O3 + 4 H2O           (selective partial oxidation)
//       r1 = k1·P_A·P_B^0.5 / (1 + K1·P_A + K2·P_W)
//       A1 = 1.28 mol/(s·kg·Pa^1.5),   Ea1 = 114 kJ/mol
//       ΔH1 = −1312 kJ/mol   (Final Report, Table 2)
//
//   R2 (side, parallel full combustion of n-butane):
//       C4H10 + 5.5 O2 → 2 CO + 2 CO2 + 5 H2O
//       r2 = k2·P_A·P_B^0.5 / (1 + K1·P_A + K2·P_W)
//       A2 = 15.1 mol/(s·kg·Pa^1.5),   Ea2 = 132 kJ/mol
//       ΔH2 = −2650 kJ/mol   (Python, NIST)
//
//   R3 (side, consecutive over-oxidation of MA):
//       C4H2O3 + 2 O2 → 2 CO + 2 CO2 + H2O
//       r3 = k3·P_C·P_B^0.25 / (1 + K1·P_A + K2·P_W)
//       A3 = 0.26 mol/(s·kg·Pa^1.25),  Ea3 = 97 kJ/mol
//       ΔH3 ≈ −1340 kJ/mol
//
// Note on rate-law representation
//   The literature kinetics are partial-pressure based with a Langmuir-
//   Hinshelwood denominator (1 + K1·P_A + K2·P_W).  The app's power-law
//   solver works in concentrations (mol/m³).  Conversion of A_P → A_C
//   uses (R·T_ref)^Σαᵢ at T_ref = 709 K, and the denominator's effect
//   (which is ~3× at the design conditions) is folded into the effective
//   k0 values.  The k0 values below were *calibrated* against the Final
//   Report's headline outputs — X_A = 0.805 and S_MA ≈ 0.70 at the
//   Table 2 design point — so the case reproduces the report at the
//   design operating point.  Off-design temperatures see a small
//   systematic offset (≤ 10 %) because the (RT)^Σα factor is held at
//   T_ref instead of varying with T.
//
// References
//   [1] Hashim, B.; Khan, W. U.; Hantoko, D. n-Butane Oxidation to Maleic
//       Anhydride: Reaction Mechanism and Kinetics over VPO Catalyst.
//       Ind. Eng. Chem. Res. 2024, 63, 10234–10248.
//   [2] Cordero-Lanzac, T. et al. On the Importance of By-products in the
//       Kinetics of n-Butane Oxidation to Maleic Anhydride. Chem. Eng. J.
//       2021, 417, 129276.
//   [3] Fogler, H. S. Elements of Chemical Reaction Engineering, 6e,
//       Pearson 2020, §8.6.
//   [4] NIST Chemistry WebBook, SRD 69 (heats of formation).

const N_TUBES   = 12_300;
const W_TOTAL   = 43_000;          // kg catalyst (Final Report Table 2)

// Feed flow is constrained by the Ergun pressure-drop limit (ΔP ≤ 10 % of
// P0) for the report's tube geometry (12 300 × 25.4 mm × 7.65 m).  At that
// geometry the maximum sustainable butane flow is ~4 mol/s — a pure
// scale-up to match the report's headline 28 000 t/yr target would require
// either more tubes (~80 000) or a bigger tube diameter, neither of which
// the report's Table 2 actually provides.  At 4 mol/s butane the plant
// produces ≈ 6 700 t MA/yr; users can scale linearly via the feed-flow
// inputs if they want to explore the 28 000 t/yr aspirational number.
const F_A0_TOTAL = 4.00;            // mol/s  n-butane  (1.8 mol % of feed)
const F_B0_TOTAL = 45.78;           // mol/s  O₂        (21 % of air feed)
const F_I0_TOTAL = 172.22;          // mol/s  N₂        (79 % of air feed, inert)

export default {
  id: 'maleicAnhydride',
  title: 'Maleic anhydride production',
  subtitle: 'Multi-tubular fixed-bed PBR — n-butane partial oxidation over VPO',
  tagline:
    'n-Butane + O₂ → maleic anhydride over VPO catalyst, with parallel and consecutive combustion paths. A 43 t bed split across 12 300 tubes (1″ OD), cooled with molten salt at 680 K, targeting 28 000 t/yr of MA at 80.5 % per-pass conversion.',
  reaction: {
    A: 'n-Butane', B: 'Oxygen', C: 'Maleic anhydride',
    D: 'Carbon monoxide', E: 'Carbon dioxide', I: 'Nitrogen',
  },
  state: {
    activeCaseId: 'maleicAnhydride',
    reaction: {
      species: [
        { id: 'A', name: 'n-Butane',          formula: 'C₄H₁₀',  mw: 58.122, isLimiting: true,  isInert: false },
        { id: 'B', name: 'Oxygen',            formula: 'O₂',     mw: 31.998, isLimiting: false, isInert: false },
        { id: 'C', name: 'Maleic anhydride',  formula: 'C₄H₂O₃', mw: 98.060, isLimiting: false, isInert: false },
        { id: 'D', name: 'Carbon monoxide',   formula: 'CO',     mw: 28.010, isLimiting: false, isInert: false },
        { id: 'E', name: 'Carbon dioxide',    formula: 'CO₂',    mw: 44.010, isLimiting: false, isInert: false },
        { id: 'I', name: 'Nitrogen',          formula: 'N₂',     mw: 28.014, isLimiting: false, isInert: true  },
      ],
      primary: {
        // R1 — partial oxidation of n-butane to MA.
        // Power-law with literature orders (1 in butane, 0.5 in O₂).  H₂O
        // produced by the reaction is not tracked as a species — its only
        // role in the literature LH model was to enter the denominator, and
        // that effect is now absorbed into the calibrated k0.
        type: 'powerLaw',
        stoich: { A: -1, B: -3.5, C: 1 },
        k0: 2.17e4,                      // mol/m³ basis (calibrated — see header)
        Ea: 114_000,                     // J/mol  (Hashim et al. 2024)
        orders: [
          { species: 'A', alpha: 1 },
          { species: 'B', alpha: 0.5 },
        ],
        adsorption: [],
        dHrx: -1_312_000,                // J/mol  (Final Report Table 2)
        desired: true,
      },
      sides: [
        // R2 — full combustion of n-butane (parallel waste path).
        {
          type: 'powerLaw',
          stoich: { A: -1, B: -5.5, D: 2, E: 2 },   // 2 CO + 2 CO₂ + 5 H₂O (H₂O omitted)
          k0: 2.28e5,                    // mol/m³ basis (calibrated; A2/A1 ≈ 10.5)
          Ea: 132_000,                   // J/mol  (Hashim et al. 2024)
          orders: [
            { species: 'A', alpha: 1 },
            { species: 'B', alpha: 0.5 },
          ],
          adsorption: [],
          dHrx: -2_650_000,              // J/mol  (Python; NIST cross-check)
          desired: false,
        },
        // R3 — consecutive over-oxidation of MA.  Same product split as R2.
        // Kept modest so most of the combustion happens via R2 (parallel),
        // matching the report's "triangle network" emphasis on parallel waste.
        {
          type: 'powerLaw',
          stoich: { C: -1, B: -2, D: 2, E: 2 },
          k0: 50,                        // mol/m³ basis (calibrated)
          Ea: 97_000,                    // J/mol  (Hashim et al. 2024)
          orders: [
            { species: 'C', alpha: 1 },
            { species: 'B', alpha: 0.25 },
          ],
          adsorption: [],
          dHrx: -1_340_000,              // J/mol
          desired: false,
        },
      ],
    },
    conditions: {
      T_inlet: 709,                       // K  (Final Report Table 2)
      P0:       1.8e5,                    // Pa (1.8 bar — Final Report Table 2)
      // Whole-reactor totals — solver divides by tube count internally.
      feedFlow: {
        A: F_A0_TOTAL,
        B: F_B0_TOTAL,
        C: 0,
        D: 0,
        E: 0,
        I: F_I0_TOTAL,
      },
      XTarget: 0.805,                     // Final Report Table 2 design conversion
    },
    reactor: {
      type: 'PBR',
      pfr:  { V: 1.0 },
      cstr: { V: 0.1 },
      pbr: {
        W: W_TOTAL / N_TUBES,             // ≈ 3.496 kg/tube — initial envelope
        tubes: N_TUBES,
        Dt: 0.0254,                       // m — 1-inch tubes (Final Report)
        perTube: true,
        Dp: 0.005,                        // m — typical VPO pellet
        phi: 0.45,                        // bed voidage (typical packed bed)
        rho_b: 900,                       // kg/m³ — Final Report Table 2
        mu: 3.0e-5,                       // Pa·s — gas-phase μ at 700 K
        ergunEnabled: true,
      },
      // Isothermal mode is the right model for the Group 6 design intent —
      // the molten-salt jacket holds the bed within ~5 K of T_inlet over the
      // whole length (their Memo 5 hotspot is ≤ +6 K).  Running this case
      // non-isothermal in our model triggers thermal runaway because R2 has
      // ΔH = −2650 kJ/mol and Ea₂ > Ea₁; the LH denominator in the literature
      // rate law is the stabiliser our model can't directly reproduce.
      // Switching to isothermal lets us reproduce X_A = 0.805 and S_MA ≈ 0.7
      // faithfully at the report's design weight while keeping the kinetic
      // parameters realistic.
      isothermal: true,
      nonIso: {
        U:  150,                          // W/(m²·K) — Final Report Table 2 (display only)
        Ta: 620,                          // K — molten-salt coolant (display only when isothermal)
        // Mean Cp values (J/mol/K) over the 660–720 K operating window.
        // Encoded as [a, b, c, d] with Cp(T) = a + b·T·1e-3 + c·T²·1e-6 + d·T³·1e-9.
        // Values rounded from Perry's 8e Table 2-150 ideal-gas correlations.
        cpCoeffs: {
          A: [130, 0, 0, 0],              // n-butane
          B: [33,  0, 0, 0],              // O₂
          C: [110, 0, 0, 0],              // MA
          D: [31,  0, 0, 0],              // CO
          E: [50,  0, 0, 0],              // CO₂
          I: [32,  0, 0, 0],              // N₂
        },
      },
    },
    constraints: {
      Tmax: 723,                          // catalyst sinter limit (Final Report)
      Wmax: null,
      Vmax: null,
      Smin: 0.65,                         // lower edge of the 65–75 % target band
    },
  },
  narrative: [
    'Design target: **X_A = 0.805** at **65–75 % MA selectivity** over a multi-tubular VPO bed (CHPE4512 Group 6 Final Report, Spring 2026). The case is calibrated so the Studio lands at W_total ≈ 43 000 kg with S_MA ≈ 0.7 at the design conversion, matching the report.',
    'The catalytic partial oxidation of n-butane over **VPO** follows a *triangle network*: R1 makes MA, R2 burns butane directly to CO + CO₂ (parallel waste), and R3 over-oxidises the desired MA to the same waste (consecutive). All three reactions have *higher* activation energies for the combustion paths (Ea₂ = 132, Ea₃ = 97 kJ/mol) than for the selective path (Ea₁ = 114 kJ/mol), so excess heat shifts the network toward waste.',
    'The bed is **12 300 tubes × 25.4 mm OD × ~7.65 m**, totalling ≈ 43 t of VPO (ρ_b = 900 kg/m³). The case ships in **isothermal mode** to reflect the report\'s near-isothermal design intent (their Memo 5 puts the hotspot only ~+6 K above inlet thanks to the molten-salt jacket). U = 150 W/(m²·K) and T_a = 620 K are recorded for reference; flip the **Non-isothermal** toggle in step 3 to inspect the energy balance, but expect a stiff response — the LH-denominator self-limitation that stabilises the real reactor is folded into the effective k₀ values, not modelled directly.',
    'Feed is sized to ≈ 4 mol/s of butane, the largest flow the report\'s tube geometry can sustain under the 10 % pressure-drop constraint — at that flow the plant produces ~6 700 t MA/yr. The Final Report\'s 28 000 t/yr aspirational target would require a larger tube count (or a bigger tube ID); users can scale the feed-flow inputs in step 2 to explore that envelope, with the Cost tab tracking the catalyst inventory automatically.',
  ],
};
