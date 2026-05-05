# ReactorIQ

Interactive single-page web application for designing chemical reactors (PFR / CSTR / PBR), running real-time simulations, and exploring constraint-based optimization. Built as part of **CHPE4512 — Chemical Reaction Engineering, Sultan Qaboos University, Group 03**.

The Cumene case study reproduces the calibrated results from the course memos (Memos 1–5).

---

## Tech Stack

| Layer            | Choice                              | Rationale                                                    |
| ---------------- | ----------------------------------- | ------------------------------------------------------------ |
| Framework        | **React 18** (functional + hooks)   | Required by spec.                                            |
| Build tool       | **Vite 5**                          | Fast HMR, simple config, no CRA bloat. Tooling-only.         |
| Styling          | **Tailwind CSS 3**                  | Required by spec.                                            |
| Plots            | **Recharts 2**                      | Required by spec. Pure React, SVG-based, themeable.          |
| Equations        | **KaTeX**                           | Required by spec. Server-quality math typesetting.           |
| State            | React `useReducer` + Context        | No external state lib. Sufficient for this app.              |
| Numerics         | **Hand-written RK4** in `src/solver/` | No `mathjs`, no `numeric.js` — pure JS, fully auditable.   |
| Heavy compute    | **Web Worker** for parametric study | Keeps UI responsive during 20×20+ ODE sweeps.                |

**Locked: no other runtime dependencies.** Adding a library requires explicit user approval.

Tooling (allowed without asking): `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`, `eslint`, `prettier` (the last two optional).

---

## Folder Structure

```
D:\Cumene Web\
├── CLAUDE.md                  ← this file
├── README.md
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx               ← React entrypoint
    ├── App.jsx                ← Top-level layout + section routing
    ├── index.css              ← Tailwind directives + KaTeX import + base tokens
    │
    ├── components/            ← UI ONLY — never imports from /solver
    │   ├── layout/            ← Navbar (with global units toggle), Footer, SectionShell
    │   ├── hero/              ← Landing/Hero + animated background
    │   ├── studio/            ← Reactor Design Studio (the main tool)
    │   │   ├── steps/         ← Input wizard steps
    │   │   └── tabs/          ← Output tabs (conversion, T, C, S/Y, summary)
    │   ├── sensitivity/       ← Sliders, parametric study, optimizer
    │   ├── cases/             ← Case study cards + explainer panels
    │   ├── theory/            ← Equation reference cards (KaTeX)
    │   └── ui/                ← Generic primitives (Button, Slider, Card, …)
    │
    ├── solver/                ← PURE JS — no React, no DOM, fully testable
    │   ├── rk4.js             ← Adaptive-step RK4 integrator
    │   ├── kinetics.js        ← Arrhenius, Elementary, Power-law, Langmuir-Hinshelwood
    │   ├── pfr.js             ← PFR ODE system builder
    │   ├── pbr.js             ← PBR ODE system builder (with optional Ergun)
    │   ├── cstr.js            ← CSTR algebraic solver (Newton + bisection fallback)
    │   ├── energy.js          ← Energy-balance term, mixture Cp(T)
    │   ├── ergun.js           ← Pressure-drop α-parameter and dy/dW term
    │   ├── newton.js          ← Newton-Raphson root finder
    │   ├── bisection.js       ← Bracketed bisection root finder
    │   ├── optimizer.js       ← Grid + golden-section + Nelder-Mead-lite
    │   ├── postprocess.js     ← Conversion/selectivity/yield/hotspot extraction
    │   └── index.js           ← solveReactor(config) — public solver API
    │
    ├── workers/               ← Web Workers (one per CPU-heavy task)
    │   └── parametric.worker.js  ← 2-D sweep for the heatmap (commit 9)
    │
    ├── cases/                 ← Pre-loaded case configurations
    │   ├── cumene.js          ← Featured case (matches Memo 5 baseline)
    │   ├── ethyleneOxide.js
    │   ├── autocatalytic.js   ← CSTR with multiple steady states + bifurcation diagram
    │   └── index.js
    │
    ├── store/                 ← Global app state
    │   ├── reactorContext.jsx ← Context + useReducer (incl. global unitSystem)
    │   ├── reducer.js         ← Pure reducer + initialState
    │   └── initialState.js
    │
    ├── hooks/
    │   ├── useReactor.js      ← Sugar over context (read + dispatch)
    │   ├── useSolver.js       ← Memoized solver invocation
    │   ├── useDebouncedValue.js
    │   ├── useUnitSystem.js   ← Reads/writes the global SI ↔ engineering toggle
    │   └── useParametricWorker.js  ← Wraps the worker behind a promise interface
    │
    └── utils/
        ├── units.js           ← SI ↔ engineering converters (bar↔Pa, mol/s↔kmol/s, etc.)
        ├── validate.js        ← Input range/consistency checks → warnings
        ├── format.js          ← Number formatting, scientific notation
        ├── csv.js             ← Export to CSV
        └── constants.js       ← R, π, presets
```

**Hard rule**: anything inside `src/components/` must NOT import from `src/solver/` directly. Components call hooks (`useSolver`) which orchestrate the solver. This guarantees the simulation core can be ported, tested, or reused without React.

---

## Dev / Build Commands

```bash
npm install            # install deps (one-time)
npm run dev            # Vite dev server on http://localhost:5173
npm run build          # production build → dist/
npm run preview        # serve dist/ locally to verify the build
npm run lint           # eslint (optional, if added)
```

---

## Approved Decisions (locked in via planning convo)

1. **Project root** — `D:\Cumene Web\` (this folder).
2. **Git** — `git init` here; one commit per major module (13 commits total).
3. **Heatmap** — custom SVG implementation under ~120 lines (no extra library).
4. **Multiple steady states** — bracketed root scan + bifurcation diagram (X vs Da) in the autocatalytic case.
5. **Web Worker** — parametric study runs in `workers/parametric.worker.js` to keep the UI responsive.
6. **Units** — **global toggle in the navbar** (SI ↔ engineering). Every input/output re-labels and converts together. Unit suffix still shown next to every field for clarity.
7. **Plot sampling** — 600 points per integration; PBR plotting is per-tube by default with an explicit "show whole reactor" multiplier.

---

## Design System (engineering-dashboard, dark)

| Token             | Value                                                |
| ----------------- | ---------------------------------------------------- |
| Background base   | `#0B1220` (dark navy)                                |
| Surface           | `#111A2E` (cards) / `#0F1726` (panels)               |
| Border            | `#1E2A44`                                            |
| Primary accent    | `#22D3EE` (cyan-400)                                 |
| Secondary accent  | `#14B8A6` (teal-500)                                 |
| Warning           | `#F59E0B` (amber-500)                                |
| Danger            | `#EF4444` (red-500)                                  |
| Success           | `#10B981` (emerald-500)                              |
| Text primary      | `#E5E7EB`                                            |
| Text muted        | `#94A3B8`                                            |
| Font (UI)         | **Inter**, weights 400/500/600/700                   |
| Font (display)    | **Space Grotesk**, weights 500/700                   |
| Font (mono/data)  | **JetBrains Mono** (numeric tables, code)            |
| Base size         | 16 px, line-height 1.5                               |
| Radii             | `rounded-xl` (12px) for cards, `rounded-md` for buttons |
| Shadow            | Subtle inner-glow on focused inputs; no heavy drop shadows |

Plot palette (Recharts):
- Conversion: `#22D3EE` (cyan)
- Temperature: `#F97316` (orange)
- Hotspot marker: `#FACC15` (yellow)
- Species A/B/C/D/I: `#EF4444` / `#3B82F6` / `#10B981` / `#A855F7` / `#94A3B8`
- Safe / warn / violation zones: `#10B981 / #F59E0B / #EF4444` at 15% opacity fills

Animations: 150–300 ms cubic-bezier transitions, `prefers-reduced-motion` respected, a `<MotionFade>` primitive wrapping CSS keyframes (no Framer Motion).

---

## Coding Conventions

- **Functional components**, hooks, no class components.
- **Pure functions in `/solver`** — the entire solver is referentially transparent: same input → same output, no side effects. Solver works in strict SI (Pa, K, mol/s, kg).
- **State shape** is documented in `store/reducer.js` (single source of truth).
- **Validation** runs on every input change and surfaces warnings inline; the solver itself never crashes — it returns `{ ok: false, warnings: [...] }` when inputs are inconsistent.
- **Units boundary**: the UI layer (and ONLY the UI layer) calls `utils/units.js` to convert between display units and SI before dispatching to the store.
- **Naming**: variables matching engineering symbols (`F_A0`, `T_in`, `dHrx`) are allowed in solver code; UI props use camelCase (`feedFlow`, `inletTemp`).

---

## Key Engineering References

- Fogler, *Elements of Chemical Reaction Engineering* (5th ed.) — design equations, energy balance, Ergun.
- Froment, Bischoff, De Wilde, *Chemical Reactor Analysis and Design* (3rd ed.) — multi-reaction PBR, parametric sensitivity, reactor gain.
- The course memos in `C:\Users\majos\OneDrive\Desktop\Cumene Python\` (1–5) — the Cumene case study reproduces these.

---

## Commit Policy

One commit per major module. Sequence:

1. `chore: scaffold Vite + React + Tailwind project`
2. `feat(solver): RK4 integrator + kinetics primitives`
3. `feat(solver): PFR / PBR / CSTR builders + Ergun + energy balance`
4. `feat(store): global reactor state context (with units)`
5. `feat(ui): design tokens, primitives, layout shell, navbar units toggle`
6. `feat(hero): landing section with animated background`
7. `feat(studio): input wizard (4 steps)`
8. `feat(studio): output tabs (conversion / T / C / S-Y / summary)`
9. `feat(sensitivity): sliders + parametric heatmap (worker) + optimizer`
10. `feat(cases): Cumene + EO + autocatalytic CSTR with bifurcation`
11. `feat(theory): KaTeX equation reference`
12. `feat(footer): about / references`
13. `polish: animations, accessibility pass, responsive review`

Never skip hooks, never `--no-verify`.
