// App-level constants (UI side). Solver-side constants live in src/solver/constants.js.

export const R = 8.314;                 // J/(mol·K)

export const SECTION_IDS = {
  hero: 'section-hero',
  studio: 'section-studio',
  sensitivity: 'section-sensitivity',
  cases: 'section-cases',
  theory: 'section-theory',
  about: 'section-about',
};

export const REACTOR_TYPES = ['PFR', 'PBR', 'CSTR'];

export const RATE_LAW_TYPES = [
  { id: 'elementary', label: 'Elementary' },
  { id: 'powerLaw', label: 'Power Law' },
  { id: 'langmuirHinshelwood', label: 'Langmuir-Hinshelwood' },
];

export const DEFAULT_DEBOUNCE_MS = 220;
export const SLIDER_DEBOUNCE_MS = 120;
