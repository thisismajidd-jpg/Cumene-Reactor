// Cost analysis — Turton bare-module method, in 2024 USD.
//
// Pure JS, no React or DOM. All money is USD. All physical quantities are SI.
//
// References
// ──────────
//   Turton, R.; Shaeiwitz, J. A.; Bhattacharyya, D.; Whiting, W. B.
//     "Analysis, Synthesis and Design of Chemical Processes" 5th ed. (2018).
//     · Appendix A — equipment cost correlations (K₁, K₂, K₃) and pressure
//       factors. Year-2001 USD basis (CEPCI = 567.5).
//     · Ch. 7 — bare-module factor F_BM = B₁ + B₂·F_M·F_P, total capital.
//     · Ch. 8 — cost of manufacture (COM), utility / labor estimating.
//
//   Seider, W. D.; Seader, J. D.; Lewin, D. R.; Widagdo, S.
//     "Product and Process Design Principles" 4th ed. (2017).
//
//   Sinnott, R. K. & Towler, G. P.
//     "Chemical Engineering Design" (Coulson Vol. 6) 6th ed.  Backup for
//     factorial-method validation.
//
//   CEPCI — Chemical Engineering Plant Cost Index, monthly in
//     "Chemical Engineering" magazine. 2024 ≈ 800.
//
//   ICIS / S&P Platts — 2024 spot prices for propylene, benzene, cumene.
//
// Method notes
// ────────────
//   For the multi-tube PBR, mechanically a shell-and-tube vessel, the
//   equipment cost is estimated using the *fixed-tube-sheet HX* correlation
//   from Turton (Table A.1).  The catalyst inventory is priced separately at
//   market $/kg.  Heat-exchanger area is the inside-tube area:
//
//       A_HX = π · D_t · L_t · N_tubes   (m²)
//
//   When A_HX exceeds the correlation's validity ceiling (1000 m²) we follow
//   Turton's recommendation and split into N parallel shells of A_HX / N each
//   so every shell stays inside its valid range.

// ── Constants ────────────────────────────────────────────────────────────
const CEPCI_TURTON_BASE = 567.5;       // Turton 5e is on a 2001 basis
const R_GAS = 8.314;                    // J/(mol·K)

// Fallback molecular weights (kg/mol) — match cases/cumene.js species table.
const MW_DEFAULT = {
  A: 0.042081, // Propylene
  B: 0.078114, // Benzene
  C: 0.120195, // Cumene
  D: 0.162276, // DIPB
  I: 0.044097, // Propane (inert)
};

// ── Defaults — everything below is exposed in the UI Assumptions panel ──
export const DEFAULT_ASSUMPTIONS = {
  // Plant operation
  operatingHours:       8000,     // h/yr  (91% on-stream factor)
  catalystLifetimeYears: 2,
  cepci:                800,      // 2024 estimate
  contingencyFactor:    1.18,     // TCI = ΣC_BM × factor  (Turton eq. 7.10)

  // Equipment material
  materialFactor:       2.73,     // F_M for SS-316 shell-and-tube (Turton A.3)

  // Catalyst
  catalystPrice:        30,       // $/kg — zeolite Beta (modern Q-MAX)

  // Feedstocks (2024 spot, $/t)
  propylenePrice:       1000,     // polymer grade
  benzenePrice:         950,

  // Products / co-products ($/t)
  cumenePrice:          1300,     // chemical-grade cumene
  dipbPrice:            400,      // fuel-credit / transalkylation value

  // Utilities
  steamPrice:           17,       // $/GJ — high-pressure steam
  electricityPrice:     0.09,     // $/kWh
  pumpEfficiency:       0.7,      // η_pump for blower work

  // Annual cost adders
  maintenanceFraction:  0.05,     // 5% of TCI / yr
  laborCost:            270_000,  // $/yr  (≈ 1 op/shift × 4.5 shifts × $60k)
};

// ── Turton equipment correlation: fixed-tube-sheet S&T HX ───────────────
// log₁₀(Cₚ⁰) = K₁ + K₂·log₁₀(A) + K₃·(log₁₀ A)²
// Valid for A ∈ [10, 1000] m².  Above 1000 m² we use N parallel shells.
const HX = {
  K1: 4.3247,
  K2: -0.3030,
  K3: 0.1634,
  B1: 1.63,
  B2: 1.66,
  Amin: 10,
  Amax: 1000,
};

function hxPurchasedCost2001(A_m2) {
  if (!Number.isFinite(A_m2) || A_m2 <= 0) return { Cp0: 0, nShells: 0, Aper: 0 };
  const nShells = Math.max(1, Math.ceil(A_m2 / HX.Amax));
  const Aper = Math.max(HX.Amin, A_m2 / nShells);
  const logA = Math.log10(Aper);
  const logC = HX.K1 + HX.K2 * logA + HX.K3 * logA * logA;
  const Cp0 = nShells * Math.pow(10, logC);
  return { Cp0, nShells, Aper };
}

// Pressure factor for shell-and-tube HX (Turton Table A.2).
//   For P ≤ 5 barg: F_P = 1
//   Else: log₁₀(F_P) = 0.03881 − 0.11272·log₁₀(P) + 0.08183·(log₁₀ P)²
function hxPressureFactor(P_barg) {
  if (!Number.isFinite(P_barg) || P_barg < 5) return 1;
  const logP = Math.log10(P_barg);
  const logFP = 0.03881 - 0.11272 * logP + 0.08183 * logP * logP;
  return Math.pow(10, logFP);
}

// ── Helpers ─────────────────────────────────────────────────────────────
function annualTonnes(F_mol_s, MW_kg_per_mol, opHours) {
  if (!Number.isFinite(F_mol_s) || F_mol_s <= 0) return 0;
  return (F_mol_s * MW_kg_per_mol * 3600 * opHours) / 1000;
}

function inletVolumetricFlow(feedFlow, T_K, P_Pa) {
  let FT = 0;
  for (const sp in feedFlow) FT += feedFlow[sp] || 0;
  if (FT <= 0 || P_Pa <= 0) return 0;
  return (FT * R_GAS * T_K) / P_Pa;     // m³/s
}

// Heat-of-reaction × extent → total reaction duty (W, positive when releasing).
//
// We solve the linear system  Σ_j ν_{ij} · ξ_j = ΔF_i   in the least-squares
// sense across all species, where ν is the stoichiometry matrix and ΔF is the
// flow change.  This handles any number of reactions in one shot and is exact
// when reactions are linearly independent (the normal case).
function computeReactionHeat(reaction, F_in, F_out) {
  const all = [reaction.primary, ...((reaction.sides ?? []))].filter(Boolean);
  if (all.length === 0) return 0;

  // Collect all species touched by any reaction
  const speciesSet = new Set();
  for (const r of all) for (const sp in (r.stoich ?? {})) speciesSet.add(sp);
  const species = [...speciesSet];

  // Build A (species × reactions) and b (ΔF per species)
  const m = species.length;
  const n = all.length;
  const A = species.map((sp) => all.map((r) => (r.stoich?.[sp] ?? 0)));
  const b = species.map((sp) => (F_out[sp] ?? 0) - (F_in[sp] ?? 0));

  // Normal equations  AᵀA · ξ = Aᵀb,  solved by tiny Gauss-elimination.
  const AtA = Array.from({ length: n }, () => new Array(n).fill(0));
  const Atb = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < m; k++) AtA[i][j] += A[k][i] * A[k][j];
    }
    for (let k = 0; k < m; k++) Atb[i] += A[k][i] * b[k];
  }
  const ext = gaussSolve(AtA, Atb);
  if (!ext) return 0;

  // Heat released = Σ_j (−ΔH_j) · ξ_j  (positive for exothermic)
  let Q = 0;
  for (let j = 0; j < n; j++) Q += -(all[j].dHrx ?? 0) * ext[j];
  return Q;
}

// Tiny Gauss elimination with partial pivoting. Returns null on singular.
function gaussSolve(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[pivot][i])) pivot = k;
    if (Math.abs(M[pivot][i]) < 1e-12) return null;
    [M[i], M[pivot]] = [M[pivot], M[i]];
    for (let k = i + 1; k < n; k++) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j];
    }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

// ── Main entry point ────────────────────────────────────────────────────
/**
 * Compute the full cost breakdown for the current reactor state.
 *
 * @param {Object} state       The reactor state slice (reactor, reaction,
 *                             conditions, etc.)
 * @param {Object} result      Solver result (must contain a trajectory)
 * @param {Object} assumptions Overrides for DEFAULT_ASSUMPTIONS
 * @returns {Object|null}      Cost breakdown, or null if not applicable
 */
export function computeEconomics(state, result, assumptions = {}) {
  if (!result?.trajectory) return null;
  if (state?.reactor?.type !== 'PBR') return null;

  const a = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  const pbr = state.reactor.pbr ?? {};
  const conditions = state.conditions ?? {};
  const reaction = state.reaction ?? {};
  const traj = result.trajectory;

  // Build MW lookup from the species table, falling back to defaults.
  const MW = { ...MW_DEFAULT };
  for (const sp of reaction?.species ?? []) {
    if (sp?.id && Number.isFinite(sp.mw)) MW[sp.id] = sp.mw / 1000; // g/mol → kg/mol
  }

  // ── Sizing ────────────────────────────────────────────────────────
  // The "designed" catalyst weight is W_for_target — the W needed to reach
  // X_target, as found by the solver.  Falling back to the envelope keeps
  // the cost analysis non-null even when X_target was unreachable.
  const Dt    = pbr.Dt ?? 0.0254;
  const tubes = pbr.tubes ?? 1;
  const W_for_target = traj.summary?.W_for_target;
  const envelopePer  = pbr.perTube ? (pbr.W ?? 0) : (pbr.W ?? 0) / Math.max(tubes, 1);
  const Wper  = W_for_target ?? envelopePer;
  const Wtot  = Wper * tubes;
  const phi   = pbr.phi ?? 0;
  const rho_b = pbr.rho_b ?? 0;
  const rho_c = phi < 1 && rho_b > 0 ? rho_b / (1 - phi) : rho_b;

  const Vreactor = rho_c > 0 ? Wtot / rho_c : 0;
  // A_HX (inside-tube area) = π·Dₜ·L_t·N_tubes.  Using L_t = W_per /(ρ_c·A_t)
  // with A_t = π·Dₜ²/4, this simplifies to A_HX = (4 / (ρ_c·Dₜ))·W_tot.
  const Ahx = rho_c > 0 && Dt > 0 ? (4 / (rho_c * Dt)) * Wtot : 0;

  const Pbarg = (conditions.P0 ?? 101325) / 1e5 - 1;

  // ── CAPEX ─────────────────────────────────────────────────────────
  const { Cp0, nShells, Aper } = hxPurchasedCost2001(Ahx);
  const F_P  = hxPressureFactor(Pbarg);
  const F_M  = a.materialFactor;
  const F_BM = HX.B1 + HX.B2 * F_M * F_P;
  const escalator = a.cepci / CEPCI_TURTON_BASE;
  const C_BM_HX = Cp0 * F_BM * escalator;

  const C_catalyst_initial = Wtot * a.catalystPrice;

  const totalBareModule = C_BM_HX + C_catalyst_initial;
  const totalCapital = totalBareModule * a.contingencyFactor;

  // ── Production rate ───────────────────────────────────────────────
  // The trajectory is per-tube — scale outlet flows back to the full reactor.
  const F = traj.F;
  const last = traj.ts.length - 1;
  const F_out = {};
  for (const sp of ['A', 'B', 'C', 'D', 'I']) {
    F_out[sp] = (F?.[sp]?.[last] ?? 0) * tubes;
  }
  const F_in = { ...(conditions.feedFlow ?? {}) };

  const tonnesA_in  = annualTonnes(F_in.A  ?? 0, MW.A, a.operatingHours);
  const tonnesB_in  = annualTonnes(F_in.B  ?? 0, MW.B, a.operatingHours);
  const tonnesC_out = annualTonnes(F_out.C ?? 0, MW.C, a.operatingHours);
  const tonnesD_out = annualTonnes(F_out.D ?? 0, MW.D, a.operatingHours);

  // ── Cooling duty (W) ──────────────────────────────────────────────
  // Steady-state: heat released = Σ_j −ΔH_j · ξ_j  over every reaction
  // (primary + each side).  At the optimised near-isothermal operating point
  // this also equals the heat the coolant must remove (sensible heat-up of
  // the product stream is negligible).
  const Q_W = Math.max(0, computeReactionHeat(reaction, F_in, F_out));
  const annualHeat_GJ = (Q_W * 3600 * a.operatingHours) / 1e9;

  // ── Pumping electricity ───────────────────────────────────────────
  const T_in = conditions.T_inlet ?? 628;
  const P_in = conditions.P0 ?? 35e5;
  const P_out = traj.P?.[last] ?? P_in;
  const dP = Math.max(0, P_in - P_out);
  const Qvol = inletVolumetricFlow(F_in, T_in, P_in);
  const pumpPower_W = (dP * Qvol) / Math.max(a.pumpEfficiency, 0.01);
  const annualElec_kWh = (pumpPower_W * a.operatingHours) / 1000;

  // ── OPEX line items ───────────────────────────────────────────────
  const opex_propylene   = tonnesA_in * a.propylenePrice;
  const opex_benzene     = tonnesB_in * a.benzenePrice;
  const opex_steam       = annualHeat_GJ * a.steamPrice;
  const opex_electricity = annualElec_kWh * a.electricityPrice;
  const opex_catalyst    = (Wtot * a.catalystPrice) /
                           Math.max(a.catalystLifetimeYears, 0.1);
  const opex_maintenance = totalCapital * a.maintenanceFraction;
  const opex_labor       = a.laborCost;

  const opexItems = [
    {
      id: 'propylene', label: 'Propylene feedstock',
      amount: opex_propylene,
      detail: `${tonnesA_in.toFixed(0)} t/yr × $${a.propylenePrice}/t`,
    },
    {
      id: 'benzene', label: 'Benzene feedstock',
      amount: opex_benzene,
      detail: `${tonnesB_in.toFixed(0)} t/yr × $${a.benzenePrice}/t`,
    },
    {
      id: 'steam', label: 'Cooling utility (HP steam)',
      amount: opex_steam,
      detail: `${annualHeat_GJ.toFixed(0)} GJ/yr × $${a.steamPrice}/GJ`,
    },
    {
      id: 'electricity', label: 'Pumping electricity',
      amount: opex_electricity,
      detail: `${annualElec_kWh.toFixed(0)} kWh/yr × $${a.electricityPrice}/kWh`,
    },
    {
      id: 'catalyst', label: 'Catalyst replacement',
      amount: opex_catalyst,
      detail: `${(Wtot / 1000).toFixed(2)} t / ${a.catalystLifetimeYears} yr × $${a.catalystPrice}/kg`,
    },
    {
      id: 'maintenance', label: 'Maintenance',
      amount: opex_maintenance,
      detail: `${(a.maintenanceFraction * 100).toFixed(1)} % of TCI`,
    },
    {
      id: 'labor', label: 'Operating labor',
      amount: opex_labor,
      detail: '1 op/shift × 4.5 shifts × $60 k/yr',
    },
  ];
  const totalOpex = opexItems.reduce((s, x) => s + x.amount, 0);

  // ── Revenue ───────────────────────────────────────────────────────
  const rev_cumene = tonnesC_out * a.cumenePrice;
  const rev_dipb   = tonnesD_out * a.dipbPrice;
  const revenueItems = [
    {
      id: 'cumene', label: 'Cumene product',
      amount: rev_cumene,
      detail: `${tonnesC_out.toFixed(0)} t/yr × $${a.cumenePrice}/t`,
    },
    {
      id: 'dipb', label: 'DIPB co-product (fuel credit)',
      amount: rev_dipb,
      detail: `${tonnesD_out.toFixed(0)} t/yr × $${a.dipbPrice}/t`,
    },
  ];
  const totalRevenue = rev_cumene + rev_dipb;

  // ── Metrics ───────────────────────────────────────────────────────
  const grossProfit    = totalRevenue - totalOpex;
  const dollarPerTonne = tonnesC_out > 0 ? totalOpex / tonnesC_out : Infinity;
  const paybackYears   = grossProfit > 0 ? totalCapital / grossProfit : Infinity;

  const capexItems = [
    {
      id: 'reactor', label: 'Reactor (S&T-HX equivalent)',
      amount: C_BM_HX,
      detail: `A = ${Ahx.toFixed(0)} m² · ${nShells} parallel shell${nShells > 1 ? 's' : ''} · F_BM = ${F_BM.toFixed(2)}`,
    },
    {
      id: 'catalyst_initial', label: 'Catalyst initial fill',
      amount: C_catalyst_initial,
      detail: `${(Wtot / 1000).toFixed(2)} t × $${a.catalystPrice}/kg`,
    },
  ];

  return {
    sizing: { Vreactor, Ahx, Wtot, tubes, Dt, nShells, F_P, F_BM, escalator },
    capex: {
      items: capexItems,
      totalBareModule,
      totalCapital,
      contingencyFactor: a.contingencyFactor,
    },
    opex: {
      items: opexItems,
      total: totalOpex,
    },
    revenue: {
      items: revenueItems,
      total: totalRevenue,
    },
    metrics: {
      productionRate_tpy: tonnesC_out,
      grossProfit,
      dollarPerTonne,
      paybackYears,
      Q_duty_W: Q_W,
      pumpPower_W,
      dP_Pa: dP,
    },
  };
}

// ── Sensitivity sweep ────────────────────────────────────────────────────
/**
 * Sweep one assumption across a range and re-compute economics each time.
 * Useful for quick price-sensitivity plots — no solver re-run needed since
 * none of the swept assumptions affect the underlying ODE solution.
 *
 * @returns {Array<{x, dollarPerTonne, grossProfit, paybackYears}>}
 */
export function sweepAssumption(state, result, assumptions, key, range, steps = 11) {
  const [min, max] = range;
  if (!Number.isFinite(min) || !Number.isFinite(max) || steps < 2) return [];
  const out = [];
  for (let i = 0; i < steps; i++) {
    const x = min + (max - min) * (i / (steps - 1));
    const econ = computeEconomics(state, result, { ...assumptions, [key]: x });
    if (!econ) continue;
    out.push({
      x,
      dollarPerTonne: econ.metrics.dollarPerTonne,
      grossProfit: econ.metrics.grossProfit,
      paybackYears: econ.metrics.paybackYears,
    });
  }
  return out;
}
