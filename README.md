# ReactorIQ

> Design any reactor. Analyze any reaction. Instantly.

Interactive single-page web application for chemical reactor design. Solves PFR / CSTR / PBR mole and energy balances client-side, supports multi-reaction selectivity analysis, parametric sensitivity, and constraint-based optimization.

Built as part of **CHPE4512 — Chemical Reaction Engineering, Sultan Qaboos University, Group 03**.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm run preview
```

## Tech stack

React 18 · Tailwind CSS 3 · Recharts 2 · KaTeX · Vite 5 · hand-written RK4 solver in `src/solver/`. No other runtime dependencies.

## Architecture

See [CLAUDE.md](./CLAUDE.md) for the full folder structure, design system, and coding conventions. Two hard rules:

1. **`src/components/` may not import from `src/solver/`** — UI talks to the solver via the `useSolver` hook only.
2. **The solver works in strict SI units.** Conversions live in `src/utils/units.js` and are applied at the UI boundary.

## Pre-loaded case studies

| Case | Reactor | Highlight |
| --- | --- | --- |
| **Cumene production** | Multi-tube PBR, non-isothermal | Reproduces Memo 5 baseline (ReactorGain ≈ 2.17, hotspot ~3% of bed) |
| **Ethylene oxide** | Isothermal PFR | Selectivity vs total-oxidation side reaction |
| **Autocatalytic CSTR** | CSTR | Multiple steady states + bifurcation diagram |

## References

- Fogler, *Elements of Chemical Reaction Engineering* (5th ed.)
- Froment, Bischoff, De Wilde, *Chemical Reactor Analysis and Design* (3rd ed.)
