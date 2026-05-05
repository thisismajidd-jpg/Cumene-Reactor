// Physical and numerical constants used by the solver.
// All values in strict SI unless noted.

export const R = 8.314;             // J / (mol · K)
export const PI = Math.PI;

// Numerical defaults
export const DEFAULT_RK4_STEPS = 600;
export const DEFAULT_NEWTON_TOL = 1e-9;
export const DEFAULT_NEWTON_MAX_ITER = 80;
export const DEFAULT_BISECTION_TOL = 1e-9;
export const DEFAULT_BISECTION_MAX_ITER = 200;

// A small floor used to keep flows / pressures from going slightly negative
// because of numerical noise. Mirrors the `max(F, 0)` guards in the Python memos.
export const FLOW_FLOOR = 0.0;
export const PRESSURE_FLOOR = 1e-6;
