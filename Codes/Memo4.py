# =============================================================================
# MEMO 4 — MULTIPLE REACTIONS, SELECTIVITY & PRESSURE DROP
# Cumene Production | CHPE4512 | SQU | Group 03 | Section 02
#
# Convention (matches Memo 1 and the handwritten appendix):
#   A = Propylene  (limiting reactant)
#   B = Benzene
#   C = Cumene     (desired product)
#   D = DIPB       (byproduct)
#   I = Propane    (inert diluent)
#
# Reaction Network:
#   Rxn 1 (desired):  A + B  →  C    (Propylene + Benzene → Cumene)
#   Rxn 2 (side):     A + C  →  D    (Propylene + Cumene  → DIPB)
#
# Rate Laws:
#   r1 = k1(T) · CA · CB           [kmol / (kg_cat · s)]
#   r2 = k2(T) · CA · CC           [kmol / (kg_cat · s)]
#
# Mole Balances (with stoichiometry):
#   dFA/dW = -r1 - r2     (consumed in both reactions)
#   dFB/dW = -r1          (only Rxn 1)
#   dFC/dW = +r1 - r2     (made in 1, consumed in 2)
#   dFD/dW = +r2          (only Rxn 2)
#
# Pressure Drop (Ergun):
#   dy/dW = -(α / (2y)) · (FT / FT0),     where y = P/P0
# =============================================================================

import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import brentq
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# =============================================================================
# 1. CONSTANTS & DESIGN CONDITIONS
# =============================================================================
R          = 8.314             # J / (mol · K)
P0_bar     = 35.0              # inlet pressure [bar]
P0_Pa      = P0_bar * 1.0e5    # inlet pressure [Pa]
T_design   = 628.0             # design temperature [K] = 355 °C  (Memo 3)
W_design   = 44_610.0          # design catalyst weight [kg]      (Memo 3)
X_target   = 0.99              # target conversion of A (propylene)

# =============================================================================
# 2. FEED CONDITIONS  (exact values from Memo 1, Table 8)
# =============================================================================
FA0 = 0.027750     # kmol/s   Propylene (A) — limiting
FB0 = 0.030750     # kmol/s   Benzene   (B)
FI0 = 0.001460     # kmol/s   Propane   (I) — inert
FT0 = FA0 + FB0 + FI0
yA0, yB0, yI0 = FA0/FT0, FB0/FT0, FI0/FT0

# =============================================================================
# 3. KINETIC PARAMETERS  (handwritten appendix)
# =============================================================================
k01 = 2.8e4        # m⁶ / (kmol · kg_cat · s)
Ea1 = 104_174.0    # J / mol
k02 = 2.32e6       # m⁶ / (kmol · kg_cat · s)
Ea2 = 146_742.0    # J / mol

def k1(T): return k01 * np.exp(-Ea1 / (R * T))
def k2(T): return k02 * np.exp(-Ea2 / (R * T))

# =============================================================================
# 4. REACTOR GEOMETRY & ERGUN PARAMETERS  (Memo 3)
# =============================================================================
N_tubes  = 4000
D_shell  = 2.147               # m  — overall reactor shell diameter
Ac       = np.pi/4 * D_shell**2  # m²
rho_c    = 1150.0              # catalyst skeletal density [kg/m³]
phi      = 0.5                 # void fraction
rho_b    = rho_c * (1 - phi)   # bulk density [kg/m³]
Dp       = 0.005               # particle diameter [m] (5 mm)
mu_g     = 1.76e-5             # gas viscosity [kg/(m·s)]

# Molecular weights [kg/kmol]
MW_A, MW_B, MW_I = 42.081, 78.114, 44.097
mdot = FA0*MW_A + FB0*MW_B + FI0*MW_I    # kg/s
G    = mdot / Ac                          # mass velocity [kg/(m²·s)]

def alpha_ergun(T):
    """Ergun α-parameter for pressure drop at temperature T."""
    MW_avg = yA0*MW_A + yB0*MW_B + yI0*MW_I               # kg/kmol
    rho_g0 = (P0_Pa * MW_avg/1000) / (R * T)              # kg/m³
    beta0  = (G*(1-phi) / (rho_g0 * Dp * phi**3)) * \
             (150*(1-phi)*mu_g/Dp + 1.75*G)
    return 2 * beta0 / (P0_Pa * rho_b * Ac)

# =============================================================================
# 5. ODE SYSTEM
# =============================================================================
def odes(W, state, T):
    FA, FB, FC, FD, y = state
    FA, FB, FC, FD = max(FA,0), max(FB,0), max(FC,0), max(FD,0)
    y  = max(y, 1e-6)
    FT = FA + FB + FC + FD + FI0

    CT0 = (P0_Pa / (R*T)) * 1e-3          # kmol/m³  (mol/m³ → kmol/m³)
    CA  = CT0 * (FA/FT) * y
    CB  = CT0 * (FB/FT) * y
    CC  = CT0 * (FC/FT) * y

    r1  = k1(T) * CA * CB
    r2  = k2(T) * CA * CC

    return [-r1 - r2,                         # dFA/dW
            -r1,                              # dFB/dW
            +r1 - r2,                         # dFC/dW
            +r2,                              # dFD/dW
            -(alpha_ergun(T)/(2*y)) * (FT/FT0)]  # dy/dW

state0 = [FA0, FB0, 0.0, 0.0, 1.0]

# =============================================================================
# 6. SOLVE AT DESIGN TEMPERATURE → FIGURE 1
# =============================================================================
W_max  = 80_000.0  # kg
W_eval = np.linspace(0, W_max, 4000)

sol = solve_ivp(lambda W, s: odes(W, s, T_design),
                t_span=(0, W_max), y0=state0, t_eval=W_eval,
                method='LSODA', rtol=1e-9, atol=1e-12)

W_arr = sol.t
FA_p, FB_p, FC_p, FD_p, y_p = sol.y
FI_p = np.full_like(W_arr, FI0)

# ---- Figure 1: Molar Flow Profiles ------------------------------------------
fig1, ax1 = plt.subplots(figsize=(12, 7))
ax1.plot(W_arr/1000, FA_p*1000, color='#C62828', lw=2.5,
         label='Propylene (A) — limiting')
ax1.plot(W_arr/1000, FB_p*1000, color='#1565C0', lw=2.5,
         label='Benzene (B)')
ax1.plot(W_arr/1000, FC_p*1000, color='#2E7D32', lw=2.5,
         label='Cumene (C) — desired')
ax1.plot(W_arr/1000, FD_p*1000, color='#7B1FA2', lw=2.0, ls='--',
         label='DIPB (D) — byproduct')
ax1.plot(W_arr/1000, FI_p*1000, color='#E65100', lw=1.5, ls=':',
         label='Propane (I) — inert')

ax1.set_xlabel("Catalyst Weight,  W  [tonnes]", fontsize=13)
ax1.set_ylabel("Molar Flow Rate,  Fᵢ  [mol / s]", fontsize=13)
ax1.set_title(
    "Molar Flow Profiles — Cumene Production with Multiple Reactions\n"
    f"Isothermal Fixed-Bed PBR with Ergun Pressure Drop  |  "
    f"T = {T_design:.0f} K, P₀ = {P0_bar:.0f} bar, Nₜ = {N_tubes}",
    fontsize=12.5, fontweight='bold', pad=12)
ax1.set_xlim(0, 80); ax1.set_ylim(0, None)
ax1.grid(True, alpha=0.3, ls='--')
ax1.legend(fontsize=11, loc='center right')
ax1.tick_params(labelsize=11)
plt.tight_layout()
plt.savefig("memo4_fig1_molar_flows.png", dpi=180, bbox_inches='tight')
plt.show()
plt.close()
print("Fig 1 saved → memo4_fig1_molar_flows.png")

# =============================================================================
# 7. REACTION PATHWAY DIAGRAM → FIGURE 2
#    Layout (new convention):
#       A₁ (above B)        A₂ (above C)
#           ↓                    ↓
#       B  ──Rxn 1──►  C  ──Rxn 2──►  D
# =============================================================================
fig2, ax2 = plt.subplots(figsize=(13, 5))
ax2.set_xlim(0, 13); ax2.set_ylim(0, 5.5)
ax2.axis('off'); fig2.patch.set_facecolor('white')

SW, SH = 0.90, 0.55                     # species box (half-w, half-h)
AW, AH = 0.85, 0.50                     # propylene-feed box
Y_SP, Y_A_FEED = 3.2, 4.8
XB, XC, XD = 1.8, 6.5, 11.2             # main flow x-positions
XA1, XA2   = XB, XC                     # propylene boxes above B and C

def sp_box(cx, cy, lbl, formula, bg, ec):
    ax2.add_patch(mpatches.FancyBboxPatch(
        (cx-SW, cy-SH), 2*SW, 2*SH,
        boxstyle='round,pad=0.10', facecolor=bg, edgecolor=ec,
        linewidth=2.0, zorder=3))
    ax2.text(cx, cy+0.12, lbl, ha='center', va='center',
             fontsize=18, fontweight='bold', color=ec, zorder=4)
    ax2.text(cx, cy-0.28, formula, ha='center', va='center',
             fontsize=8.5, color='#444', zorder=4, style='italic')

def a_feed_box(cx, cy):
    ax2.add_patch(mpatches.FancyBboxPatch(
        (cx-AW, cy-AH), 2*AW, 2*AH,
        boxstyle='round,pad=0.10', facecolor='#FFCDD2',
        edgecolor='#C62828', linewidth=2.0, zorder=3))
    ax2.text(cx, cy+0.10, 'A', ha='center', va='center',
             fontsize=18, fontweight='bold', color='#C62828', zorder=4)
    ax2.text(cx, cy-0.26, 'Propylene  C₃H₆', ha='center', va='center',
             fontsize=8.5, color='#444', zorder=4, style='italic')

def arrow(x0, y0, x1, y1, color, lw=2.4):
    ax2.annotate('', xy=(x1, y1), xytext=(x0, y0),
                 arrowprops=dict(arrowstyle='->', color=color,
                                 lw=lw, mutation_scale=22))

# Species (main flow row)
sp_box(XB, Y_SP, 'B', 'Benzene  C₆H₆', '#BBDEFB', '#0D47A1')
sp_box(XC, Y_SP, 'C', 'Cumene  C₉H₁₂', '#C8E6C9', '#1B5E20')
sp_box(XD, Y_SP, 'D', 'DIPB  C₁₂H₁₈',  '#EDE7F6', '#4A148C')

# Propylene feed boxes above B and C
a_feed_box(XA1, Y_A_FEED)
a_feed_box(XA2, Y_A_FEED)

# A arrows: straight down into B and C
arrow(XA1, Y_A_FEED-AH-0.05, XB, Y_SP+SH+0.05, '#C62828', lw=2.2)
arrow(XA2, Y_A_FEED-AH-0.05, XC, Y_SP+SH+0.05, '#C62828', lw=2.2)

# Horizontal reaction arrows
arrow(XB+SW+0.08, Y_SP, XC-SW-0.08, Y_SP, '#1B5E20', lw=2.5)
arrow(XC+SW+0.08, Y_SP, XD-SW-0.08, Y_SP, '#4A148C', lw=2.5)

# Kinetic-info boxes (centered under each reaction arrow)
XJ1, XJ2 = (XB+XC)/2, (XC+XD)/2
ax2.text(XJ1, 1.55,
         'Reaction 1  (desired)\n'
         r'$A + B \rightarrow C$' + '\n'
         r'$r_1 = k_1(T)\,C_A C_B$' + '\n'
         r'$E_{a1} = 104.2\ \mathrm{kJ/mol}$',
         ha='center', va='center', fontsize=9.5, color='#1B5E20',
         linespacing=1.6,
         bbox=dict(fc='#F1F8E9', ec='#81C784',
                   boxstyle='round,pad=0.35', linewidth=1.4))
ax2.text(XJ2, 1.55,
         'Reaction 2  (side)\n'
         r'$A + C \rightarrow D$' + '\n'
         r'$r_2 = k_2(T)\,C_A C_C$' + '\n'
         r'$E_{a2} = 146.7\ \mathrm{kJ/mol}$',
         ha='center', va='center', fontsize=9.5, color='#4A148C',
         linespacing=1.6,
         bbox=dict(fc='#F3E5F5', ec='#CE93D8',
                   boxstyle='round,pad=0.35', linewidth=1.4))
for xj, clr in [(XJ1, '#81C784'), (XJ2, '#CE93D8')]:
    ax2.plot([xj, xj], [2.18, Y_SP-0.05], ls='--', lw=1.1, color=clr, zorder=2)

plt.tight_layout()
plt.savefig("memo4_fig2_pathway.png", dpi=180, bbox_inches='tight')
plt.show()
plt.close()
print("Fig 2 saved → memo4_fig2_pathway.png")

# =============================================================================
# 8. SELECTIVITY VS TEMPERATURE → FIGURE 3
#    Hardcoded set: 600, 620, 626, 650, 670 K (matches submitted Table 2)
# =============================================================================
T_set = [600.0, 620.0, 626.0, 650.0, 670.0]   # K

def state_at_W(W, T):
    sol = solve_ivp(lambda w, s: odes(w, s, T),
                    t_span=(0, W), y0=state0,
                    method='LSODA', rtol=1e-8, atol=1e-11)
    return sol.y[:, -1]

def W_for_X(T, X_t):
    """Bisection: find W such that X_A = X_t at temperature T."""
    def f(W):
        FA, _, _, _, _ = state_at_W(W, T)
        return (FA0 - FA)/FA0 - X_t
    return brentq(f, 100.0, 5e5, xtol=1.0)

print("\nRunning selectivity scan over 5 temperatures...")
results = []
for T in T_set:
    W_req = W_for_X(T, X_target)
    FA, FB, FC, FD, y_end = state_at_W(W_req, T)
    delta_A = FA0 - FA
    XA      = delta_A / FA0
    SC      = FC / delta_A          # selectivity to cumene
    SD      = FD / delta_A          # selectivity to DIPB (per A consumed)
    YC      = FC / FA0              # yield of cumene
    P_end   = y_end * P0_bar
    results.append({'T': T, 'W': W_req, 'XA': XA,
                    'SC': SC, 'SD': SD, 'YC': YC, 'P_end': P_end})

# ---- Print summary table ----------------------------------------------------
print()
print("="*82)
print("  Temp(K)   W (kg)      X_A      S_C       S_D       Y_C      P_exit(bar)")
print("-"*82)
for r in results:
    print(f"  {r['T']:>5.0f}    {r['W']:>9.1f}   {r['XA']:>6.4f}   "
          f"{r['SC']:>6.4f}   {r['SD']:>6.4f}   {r['YC']:>6.4f}   "
          f"{r['P_end']:>6.2f}")
print("="*82)

# Sanity check: S_C + 2·S_D should equal 1 (mole balance on propylene)
print("\nMole-balance check  (should equal 1.0):  S_C + 2·S_D")
for r in results:
    print(f"  T = {r['T']:.0f} K:  {r['SC'] + 2*r['SD']:.4f}")

# ---- Figure 3: Selectivity & Catalyst Requirement ---------------------------
T_v  = [r['T']     for r in results]
SC_v = [r['SC']    for r in results]
SD_v = [r['SD']    for r in results]
YC_v = [r['YC']    for r in results]
W_v  = [r['W']/1000 for r in results]

fig3, (axL, axR) = plt.subplots(1, 2, figsize=(15, 6.5))

# Left: Selectivity & Yield
axL.plot(T_v, SC_v, 'o-',  color='#1f77b4', lw=2.5, ms=9,
         label='Selectivity to Cumene  (S_C)')
axL.plot(T_v, SD_v, 's-',  color='#d62728', lw=2.5, ms=9,
         label='Selectivity to DIPB  (S_D)')
axL.plot(T_v, YC_v, 'd--', color='#2ca02c', lw=2.0, ms=8,
         label='Yield of Cumene  (Y_C)')
for T, sc in zip(T_v, SC_v):
    axL.annotate(f'{sc:.3f}', xy=(T, sc), xytext=(0, 8),
                 textcoords='offset points', ha='center',
                 fontsize=8.5, color='#1f77b4', fontweight='bold')
axL.set_xlabel("Temperature (K)", fontsize=13)
axL.set_ylabel("Selectivity / Yield", fontsize=13)
axL.set_title(f"Selectivity vs Temperature  (X_A = {X_target:.2f})",
              fontsize=12, fontweight='bold')
axL.set_xticks(T_v); axL.set_ylim(0, 1.05)
axL.grid(True, alpha=0.3, ls='--'); axL.legend(fontsize=10, loc='center right')
axL.tick_params(labelsize=11)

# Right: Required catalyst weight
bar_colors = ['#90CAF9', '#A5D6A7', '#FFE082', '#FFCC80', '#EF9A9A']
bars = axR.bar(T_v, W_v, color=bar_colors, edgecolor='#444',
               linewidth=1.1, width=8, zorder=3)
for bar, wv in zip(bars, W_v):
    axR.text(bar.get_x() + bar.get_width()/2, wv + max(W_v)*0.02,
             f'{wv:.1f} t', ha='center', fontweight='bold',
             fontsize=10, color='#333')
axR.axhline(W_design/1000, ls='--', lw=2.0, color='red', alpha=0.85,
            label=f'Memo 3 design W = {W_design/1000:.1f} t')
axR.set_xlabel("Temperature (K)", fontsize=13)
axR.set_ylabel("Required Catalyst Weight  (tonnes)", fontsize=13)
axR.set_title("Catalyst Requirement vs Temperature",
              fontsize=12, fontweight='bold')
axR.set_xticks(T_v); axR.set_ylim(0, max(W_v)*1.20)
axR.grid(True, alpha=0.3, ls='--', axis='y'); axR.legend(fontsize=10)
axR.tick_params(labelsize=11)

fig3.suptitle(
    "Memo 4 — Selectivity & Catalyst Analysis  |  Cumene Production\n"
    "CHPE4512  |  SQU  |  Group 03  |  Section 02",
    fontsize=12.5, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig("memo4_fig3_selectivity_T.png", dpi=180, bbox_inches='tight')
plt.show()
plt.close()
print("Fig 3 saved → memo4_fig3_selectivity_T.png")
print("\nAll deliverables complete — Memo 4.")
