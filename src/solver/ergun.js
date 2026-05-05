// Ergun pressure drop for a packed bed.
//
// Working with the dimensionless pressure ratio  y = P / P0 :
//
//     dy/dW = -(α / 2y) · (F_T / F_T0)
//
// where α [1/kg_cat] depends on bed and gas properties:
//
//     β0 = G(1-φ) / (ρ_g0 · D_p · φ³) · (150(1-φ)μ/D_p + 1.75 G)
//     α  = 2 β0 / (P0 · ρ_b · A_c)
//
// `ρ_g0` is the inlet gas density at the *reference* temperature; matches the
// Python implementation, which holds α constant along the bed.

/**
 * Compute the Ergun α-parameter [1/kg_cat] at a chosen reference temperature.
 *
 * @param {Object} params
 * @param {number} params.G       Mass velocity [kg/(m²·s)]
 * @param {number} params.rho_g0  Reference gas density [kg/m³]
 * @param {number} params.Dp      Particle diameter [m]
 * @param {number} params.phi     Bed void fraction (dimensionless)
 * @param {number} params.mu      Gas viscosity [kg/(m·s)]
 * @param {number} params.P0      Inlet pressure [Pa]
 * @param {number} params.rho_b   Bulk density of bed [kg/m³]
 * @param {number} params.Ac      Cross-sectional area [m²]
 * @returns {number} α [1/kg_cat]
 */
export function alphaErgun({ G, rho_g0, Dp, phi, mu, P0, rho_b, Ac }) {
  const beta0 =
    ((G * (1 - phi)) / (rho_g0 * Dp * Math.pow(phi, 3))) *
    ((150 * (1 - phi) * mu) / Dp + 1.75 * G);
  return (2 * beta0) / (P0 * rho_b * Ac);
}

/**
 * Reference inlet gas density from ideal-gas law at (T_ref, P0).
 * Result in kg/m³.
 *
 * @param {Object} args
 * @param {number} args.P0       Pressure [Pa]
 * @param {number} args.T        Temperature [K]
 * @param {number} args.MW_avg   Average molar mass [kg/kmol]
 * @param {number} args.R        Gas constant [J/(mol·K)] (default 8.314 — pass from constants)
 */
export function gasDensity({ P0, T, MW_avg, R }) {
  return (P0 * (MW_avg / 1000)) / (R * T);
}

/**
 * dy/dW evaluated at the current state.
 *
 * @param {number} alpha   α from alphaErgun()
 * @param {number} y       Current pressure ratio P/P0
 * @param {number} FT      Current total molar flow
 * @param {number} FT0     Inlet total molar flow
 */
export function dydW(alpha, y, FT, FT0) {
  const yEff = Math.max(y, 1e-9);
  return -(alpha / (2 * yEff)) * (FT / FT0);
}
