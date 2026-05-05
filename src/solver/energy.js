// Energy-balance helpers for non-isothermal reactors.
//
// Mixture heat capacity uses a 4-term polynomial in T (matches the Python
// implementation in memo5.py):
//
//     Cp_i(T) = a + b·T·1e-3 + c·T²·1e-6 + d·T³·1e-9    [J / (mol · K)]
//
// The cofficient table (a, b, c, d) is supplied by the caller through `cpCoeffs`
// so the solver itself stays case-agnostic.

/**
 * @param {[number,number,number,number]} coeffs   [a, b, c, d]
 * @param {number} T                                Temperature [K]
 * @returns {number} Cp in J/(mol·K)
 */
export function cpPolynomial(coeffs, T) {
  const [a, b, c, d] = coeffs;
  return a + b * T * 1e-3 + c * T * T * 1e-6 + d * T * T * T * 1e-9;
}

/**
 * Σ F_j · Cp_j(T) for the current state.
 *
 * @param {Object} flows                 { species → molar flow }
 * @param {Object} cpCoeffs              { species → [a,b,c,d] }
 * @param {number} T                     Temperature [K]
 * @returns {number} Heat-capacity rate in J/(K · time)
 */
export function sumFCp(flows, cpCoeffs, T) {
  let acc = 0;
  for (const sp in flows) {
    const coeffs = cpCoeffs[sp];
    if (!coeffs) continue;
    acc += flows[sp] * cpPolynomial(coeffs, T);
  }
  return acc;
}

/**
 * Non-isothermal energy balance for a packed bed (per unit catalyst weight basis):
 *
 *   dT/dW = [ Ua/ρ_b · (T_a - T) + Σ r_j · (-ΔH_rx,j) ] / Σ F_i · Cp_i(T)
 *
 * For a PFR (volume basis), pass `Ua = U · a_spec` directly (no ρ_b division).
 *
 * @param {Object} args
 * @param {number[]} args.rates       Reaction rates r_j (same units as ΔH for the
 *                                    product r·ΔH to give an energy rate)
 * @param {number[]} args.dHrx        Heats of reaction ΔH_rx,j [J/mol]
 * @param {number}   args.Ua          U·a (volume basis) or U·a/ρ_b (weight basis) [W/(K·m³ or W/(K·kg)]
 * @param {number}   args.Ta          Coolant temperature [K]
 * @param {number}   args.T           Local temperature [K]
 * @param {number}   args.heatCapRate Σ F·Cp(T) [J/(K·time)]
 * @returns {number} dT/d(W or V)
 */
export function dTd({ rates, dHrx, Ua, Ta, T, heatCapRate }) {
  let generation = 0;
  for (let j = 0; j < rates.length; j++) {
    generation += rates[j] * (-dHrx[j]);
  }
  const removal = Ua * (Ta - T);
  return (removal + generation) / heatCapRate;
}
