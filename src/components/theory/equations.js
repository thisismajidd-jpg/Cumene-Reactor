// Compact equation reference. Each card shows:
//   - title         topic name
//   - latex         the headline equation (block, KaTeX)
//   - blurb         one-line caption
//   - legend        symbol -> meaning (rendered as a small list)
//
// Symbol strings inside legend may include simple HTML markup for sub/super.

export const EQUATIONS = [
  {
    id: 'pfr',
    title: 'PFR mole balance',
    latex: '\\frac{dF_i}{dV} \\;=\\; \\sum_{j} \\nu_{ij}\\, r_j',
    blurb: 'Differential mole balance for a plug-flow reactor on a volume basis.',
    legend: [
      ['F<sub>i</sub>', 'molar flow of species i'],
      ['V', 'reactor volume'],
      ['ν<sub>ij</sub>', 'stoichiometric coefficient of i in reaction j'],
      ['r<sub>j</sub>', 'rate of reaction j'],
    ],
  },
  {
    id: 'cstr',
    title: 'CSTR algebraic balance',
    latex: 'F_{i,0} - F_i \\;=\\; - V\\, \\sum_j \\nu_{ij}\\, r_j(T,\\,C)',
    blurb: 'Steady-state mass balance — algebraic, not differential.',
    legend: [
      ['F<sub>i,0</sub>', 'inlet molar flow'],
      ['F<sub>i</sub>', 'outlet molar flow'],
      ['V', 'reactor volume'],
      ['r<sub>j</sub>(T, C)', 'rate at outlet conditions'],
    ],
  },
  {
    id: 'pbr',
    title: 'PBR mole balance (catalyst basis)',
    latex: '\\frac{dF_i}{dW} \\;=\\; \\sum_{j} \\nu_{ij}\\, r_j',
    blurb: 'Same form as PFR but on a catalyst-weight basis (W).',
    legend: [
      ['W', 'catalyst weight'],
      ['r<sub>j</sub>', 'rate per unit catalyst weight'],
    ],
  },
  {
    id: 'energy',
    title: 'Non-isothermal energy balance',
    latex:
      '\\frac{dT}{dW} \\;=\\; \\frac{\\dfrac{Ua}{\\rho_b}\\,(T_a - T)\\;+\\;\\sum_j r_j\\,(-\\Delta H_{rx,j})}{\\sum_i F_i\\, C_{p,i}(T)}',
    blurb: 'Energy balance for a packed bed with external coolant at Tₐ.',
    legend: [
      ['U', 'overall heat-transfer coefficient'],
      ['a', 'heat-transfer area per reactor volume (4/Dₜ for tubes)'],
      ['ρ<sub>b</sub>', 'bulk catalyst density'],
      ['T<sub>a</sub>', 'coolant temperature'],
      ['ΔH<sub>rx,j</sub>', 'heat of reaction j'],
      ['C<sub>p,i</sub>', 'molar heat capacity of i'],
    ],
  },
  {
    id: 'arrhenius',
    title: 'Arrhenius equation',
    latex: 'k(T) \\;=\\; k_0\\,\\exp\\!\\left(-\\frac{E_a}{R\\,T}\\right)',
    blurb: 'Temperature dependence of the rate constant.',
    legend: [
      ['k<sub>0</sub>', 'pre-exponential factor'],
      ['E<sub>a</sub>', 'activation energy'],
      ['R', '8.314 J/(mol·K)'],
    ],
  },
  {
    id: 'ergun',
    title: 'Ergun pressure drop',
    latex:
      '\\frac{dy}{dW} \\;=\\; -\\frac{\\alpha}{2 y}\\,\\frac{F_T}{F_{T0}},\\quad y \\equiv \\frac{P}{P_0}',
    blurb: 'Couples pressure to the mole balance via the dimensionless ratio y.',
    legend: [
      ['α', 'Ergun parameter — depends on G, ρ_g0, D_p, φ, μ, P₀, ρ_b, A_c'],
      ['F<sub>T</sub>, F<sub>T0</sub>', 'total molar flow (current / inlet)'],
    ],
  },
  {
    id: 'selectivity',
    title: 'Selectivity & yield',
    latex:
      '\\;S_C \\;=\\; \\dfrac{F_C - F_{C,0}}{F_{A,0} - F_A},\\qquad Y_C \\;=\\; \\dfrac{F_C - F_{C,0}}{F_{A,0}}\\;',
    blurb: 'Per-mole-A-consumed selectivity to the desired product C, and overall yield.',
    legend: [
      ['F<sub>A,0</sub>, F<sub>A</sub>', 'inlet & outlet flow of limiting reactant A'],
      ['F<sub>C,0</sub>, F<sub>C</sub>', 'inlet & outlet flow of desired product C'],
    ],
  },
  {
    id: 'damkohler',
    title: 'Damköhler number',
    latex: '\\mathrm{Da} \\;=\\; \\frac{V \\, k(T)\\, C_{A,0}^{n-1}}{v_0}',
    blurb: 'Ratio of reaction rate to flow rate. Drives the CSTR multiplicity diagram.',
    legend: [
      ['v<sub>0</sub>', 'volumetric flow at inlet'],
      ['n', 'overall reaction order'],
    ],
  },
];
