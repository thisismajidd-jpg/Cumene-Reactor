"""
Memo 5 — Non-Isothermal Fixed-Bed Cumene Reactor with Heat Transfer
CHPE4512 | Group 03 | SQU
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.integrate import solve_ivp
from scipy.optimize import brentq

# ============================================================
# 1. PARAMETERS (LOCKED FROM MEMOS 1-4)
# ============================================================

# Feed (Memo 1) — total plant basis
F_A0_total = 27.75   # mol/s propylene (A, limiting)
F_B0_total = 30.75   # mol/s benzene (B)
F_I0_total = 1.46    # mol/s propane (inert)
X_target   = 0.99

# Reactor geometry (Memo 3)
N_tubes    = 4000
D_t        = 0.0254          # m (1 inch)
W_total    = 44610.0         # kg total catalyst
W_per_tube = W_total / N_tubes   # 11.1525 kg/tube

# Per-tube feed
F_A0 = F_A0_total / N_tubes
F_B0 = F_B0_total / N_tubes
F_I0 = F_I0_total / N_tubes

# Catalyst & bed (Memo 2)
rho_c = 1150.0
phi   = 0.5
rho_b = rho_c * (1 - phi)    # 575 kg/m^3 BULK density
D_p   = 0.005

# Operating conditions
P0      = 35.0e5             # Pa
T_inlet = 628.15             # K
R       = 8.314

# Kinetics (Memo 4)
Ea1 = 104200.0
Ea2 = 120200.0
A1_initial = 22.703
A2_initial = 14.11

# Heats of reaction
dH1 = -99400.0
dH2 = -95300.0

# Heat capacity polynomial coefficients
# Cp(T) = a + b*T*1e-3 + c*T^2*1e-6 + d*T^3*1e-9
CP_coeffs = {
    'A': (  3.71,  234.6, -115.7,  22.0),
    'B': (-33.92,  474.0, -301.8,  71.3),
    'C': (-39.40,  636.0, -392.0,  92.7),
    'D': (-47.00,  830.0, -500.0, 118.0),
    'I': ( -4.224, 306.3, -158.6,  32.1),
}

# Heat transfer
U_baseline  = 65.0
Ta_baseline = 600.0
a_spec      = 4.0 / D_t      # m^2/m^3

# ODE tolerances
ODE_KW = dict(method='LSODA', rtol=1e-9, atol=1e-12, dense_output=True)

# ============================================================
# 2. HELPER FUNCTIONS
# ============================================================

def Cp(species, T):
    a, b, c, d = CP_coeffs[species]
    return a + b*T*1e-3 + c*T**2*1e-6 + d*T**3*1e-9

def rates(F_A, F_B, F_C, F_D, F_I, T, A1, A2):
    F_T = F_A + F_B + F_C + F_D + F_I
    C_total = P0 / (R * T)
    C_A = C_total * F_A / F_T
    C_B = C_total * F_B / F_T
    C_C = C_total * F_C / F_T
    k1 = A1 * np.exp(-Ea1 / (R * T))
    k2 = A2 * np.exp(-Ea2 / (R * T))
    r1 = k1 * C_A * C_B
    r2 = k2 * C_A * C_C
    return r1, r2

def rhs(W, y, A1, A2, U, Ta):
    F_A, F_B, F_C, F_D, F_I, T = y
    r1, r2 = rates(F_A, F_B, F_C, F_D, F_I, T, A1, A2)
    Ua_per_kg = U * a_spec / rho_b
    sumFCp = (F_A*Cp('A',T) + F_B*Cp('B',T) + F_C*Cp('C',T)
              + F_D*Cp('D',T) + F_I*Cp('I',T))
    dT = (Ua_per_kg*(Ta - T) + r1*(-dH1) + r2*(-dH2)) / sumFCp
    return [-(r1 + r2), -r1, r1 - r2, r2, 0.0, dT]

def rhs_iso(W, y, A1, A2, T_iso):
    F_A, F_B, F_C, F_D, F_I = y
    r1, r2 = rates(F_A, F_B, F_C, F_D, F_I, T_iso, A1, A2)
    return [-(r1 + r2), -r1, r1 - r2, r2, 0.0]

def y0_non_iso(T0=T_inlet):
    return [F_A0, F_B0, 0.0, 0.0, F_I0, T0]

def y0_iso():
    return [F_A0, F_B0, 0.0, 0.0, F_I0]

def solve_non_iso(A1, A2, U=U_baseline, Ta=Ta_baseline, T0=T_inlet,
                  W_end=W_per_tube, n=600):
    W_eval = np.linspace(0, W_end, n)
    sol = solve_ivp(rhs, (0, W_end), y0_non_iso(T0),
                    args=(A1, A2, U, Ta), t_eval=W_eval, **ODE_KW)
    return sol

def solve_iso(A1, A2, T_iso=T_inlet, W_end=W_per_tube, n=600):
    W_eval = np.linspace(0, W_end, n)
    sol = solve_ivp(rhs_iso, (0, W_end), y0_iso(),
                    args=(A1, A2, T_iso), t_eval=W_eval, **ODE_KW)
    return sol

# ============================================================
# 3. CALIBRATION OF A1 AND A2
# ============================================================

def calibrate_A1(A1_guess):
    def residual(A1):
        sol = solve_iso(A1, 0.0)        # only reaction 1 active
        X_exit = 1 - sol.y[0, -1] / F_A0
        return X_exit - X_target
    return brentq(residual, A1_guess*0.1, A1_guess*10.0, xtol=1e-8)

def calibrate_A2(A1, A2_guess):
    def residual(A2):
        sol = solve_iso(A1, A2)
        F_A_end = sol.y[0, -1]
        F_C_end = sol.y[2, -1]
        S = F_C_end / (F_A0 - F_A_end)
        return S - 0.929
    return brentq(residual, A2_guess*0.05, A2_guess*20.0, xtol=1e-8)

print("="*60)
print("CALIBRATION")
print("="*60)
A1 = calibrate_A1(A1_initial)
A2 = calibrate_A2(A1, A2_initial)

# Verify
sol_cal = solve_iso(A1, A2)
X_cal = 1 - sol_cal.y[0, -1] / F_A0
S_cal = sol_cal.y[2, -1] / (F_A0 - sol_cal.y[0, -1])
print(f"A1 = {A1:.4f}   A2 = {A2:.4f}")
print(f"Calibration check: X_A = {X_cal:.4f} (target 0.99), "
      f"S_cumene = {S_cal:.4f} (target 0.929)")

# ============================================================
# 4. BASELINE NON-ISOTHERMAL RUN
# ============================================================

sol_ni  = solve_non_iso(A1, A2, U=U_baseline, Ta=Ta_baseline)
sol_is  = solve_iso(A1, A2, T_iso=T_inlet)

W_ni    = sol_ni.t
F_A_ni  = sol_ni.y[0]
F_B_ni  = sol_ni.y[1]
F_C_ni  = sol_ni.y[2]
F_D_ni  = sol_ni.y[3]
F_I_ni  = sol_ni.y[4]
T_ni    = sol_ni.y[5]

X_A_ni  = 1 - F_A_ni / F_A0
with np.errstate(invalid='ignore', divide='ignore'):
    denom   = F_A0 - F_A_ni
    S_C_ni  = np.where(denom > 1e-12, F_C_ni / np.where(denom > 1e-12, denom, 1.0), 0.0)
    S_D_ni  = np.where(denom > 1e-12, F_D_ni / np.where(denom > 1e-12, denom, 1.0), 0.0)

i_hot   = int(np.argmax(T_ni))
W_hot   = W_ni[i_hot]
T_hot   = T_ni[i_hot]
pct_hot = 100.0 * W_hot / W_per_tube

X_A_iso = 1 - sol_is.y[0] / F_A0

# ============================================================
# 5. DELIVERABLE 1 — TEMPERATURE PROFILE (Figure 1)
# ============================================================

fig1, ax = plt.subplots(figsize=(12, 6))
ax.plot(W_ni, T_ni, color='#C0392B', lw=2.2, label='Non-isothermal T(W)')
ax.axhline(T_inlet, color='#2980B9', ls='--', lw=1.6,
           label=f'Isothermal (T = {T_inlet:.2f} K)')
ax.axhline(Ta_baseline, color='gray', ls=':', lw=1.4,
           label=f'T_coolant = {Ta_baseline:.0f} K')
ax.plot(W_hot, T_hot, 'o', mfc='gold', mec='black', ms=11, zorder=5,
        label=f'Hotspot: {T_hot:.2f} K @ {W_hot:.3f} kg ({pct_hot:.1f}%)')
ax.annotate(f'Hotspot\n{T_hot:.2f} K\n{W_hot:.3f} kg ({pct_hot:.1f}%)',
            xy=(W_hot, T_hot), xytext=(W_hot+1.2, T_hot+1.0),
            fontsize=11, arrowprops=dict(arrowstyle='->', color='black'))
ax.set_xlabel('W [kg / tube]', fontsize=13)
ax.set_ylabel('T [K]', fontsize=13)
ax.set_title('Axial Temperature Profile — Non-Isothermal vs Isothermal', fontsize=14)
ax.tick_params(labelsize=11)
ax.grid(alpha=0.3)
ax.legend(fontsize=11)
fig1.tight_layout()
fig1.savefig('fig1_temperature_profile.png', dpi=160)

# ============================================================
# 6. DELIVERABLE 2 — FLOWS, CONVERSION, SELECTIVITY (Figure 2)
# ============================================================

fig2, axes = plt.subplots(1, 3, figsize=(18, 5.5))

ax = axes[0]
ax.plot(W_ni, F_A_ni, label='F_A (propylene)')
ax.plot(W_ni, F_B_ni, label='F_B (benzene)')
ax.plot(W_ni, F_C_ni, label='F_C (cumene)')
ax.plot(W_ni, F_D_ni, label='F_D (DIPB)')
ax.plot(W_ni, F_I_ni, label='F_I (propane)')
ax.set_xlabel('W [kg/tube]', fontsize=13)
ax.set_ylabel('Molar flow [mol/s per tube]', fontsize=13)
ax.set_title('Molar Flow Profiles', fontsize=14)
ax.tick_params(labelsize=11)
ax.grid(alpha=0.3)
ax.legend(fontsize=10)

ax = axes[1]
ax.plot(W_ni, 100*X_A_ni, color='#C0392B', lw=2.0, label='Non-isothermal')
ax.plot(sol_is.t, 100*X_A_iso, color='#2980B9', ls='--', lw=1.8, label='Isothermal')
ax.axhline(99.0, color='black', ls=':', lw=1.2, label='99% target')
ax.set_xlabel('W [kg/tube]', fontsize=13)
ax.set_ylabel('Conversion X_A [%]', fontsize=13)
ax.set_title('Propylene Conversion', fontsize=14)
ax.set_ylim(0, 105)
ax.set_yticks(np.arange(0, 105.1, 10))
ax.tick_params(labelsize=11)
ax.grid(alpha=0.3)
ax.legend(fontsize=11, loc='lower right')

ax = axes[2]
ax.plot(W_ni, 100*S_C_ni, color='green', lw=2.0, label='S_cumene')
ax.plot(W_ni, 100*S_D_ni, color='red',   lw=2.0, label='S_DIPB')
ax.axvline(W_hot, color='gold', ls='--', lw=1.6,
           label=f'Hotspot @ {W_hot:.3f} kg')
ax.set_xlabel('W [kg/tube]', fontsize=13)
ax.set_ylabel('Cumulative selectivity [%]', fontsize=13)
ax.set_title('Selectivity Profiles', fontsize=14)
ax.set_ylim(0, 105)
ax.tick_params(labelsize=11)
ax.grid(alpha=0.3)
ax.legend(fontsize=11)

fig2.tight_layout()
fig2.savefig('fig2_flows_conversion_selectivity.png', dpi=160)

# ============================================================
# 7. DELIVERABLE 3 — SELECTIVITY MATRIX (Figure 3, Table 1)
# ============================================================

T_inlet_grid = [600.0, 620.0, 640.0, 660.0]
Ta_grid      = [560.0, 580.0, 600.0, 620.0]

rows = []
for Ti in T_inlet_grid:
    for Ta in Ta_grid:
        s = solve_non_iso(A1, A2, U=U_baseline, Ta=Ta, T0=Ti)
        F_A_e, _, F_C_e, F_D_e, _, _ = s.y[:, -1]
        X = 1 - F_A_e/F_A0
        SC = F_C_e / (F_A0 - F_A_e) if (F_A0 - F_A_e) > 1e-12 else 0.0
        SD = F_D_e / (F_A0 - F_A_e) if (F_A0 - F_A_e) > 1e-12 else 0.0
        Y_C = X * SC
        rows.append({
            'T_inlet [K]':  Ti,
            'T_coolant [K]': Ta,
            'T_hotspot [K]': float(np.max(s.y[5])),
            'X_A':           X,
            'S_cumene':      SC,
            'S_DIPB':        SD,
            'Yield_C':       Y_C,
        })

df_sel = pd.DataFrame(rows)
df_sel.to_csv('table1_selectivity_matrix.csv', index=False)

fig3, axes = plt.subplots(1, 2, figsize=(18, 5.5))
ax = axes[0]
for Ti in T_inlet_grid:
    sub = df_sel[df_sel['T_inlet [K]'] == Ti]
    ax.plot(sub['T_coolant [K]'], 100*sub['S_cumene'], marker='o',
            label=f'T_inlet = {Ti:.0f} K')
ax.set_xlabel('T_coolant [K]', fontsize=13)
ax.set_ylabel('S_cumene [%]', fontsize=13)
ax.set_title('Cumene Selectivity vs Coolant Temperature', fontsize=14)
ax.tick_params(labelsize=11)
ax.grid(alpha=0.3)
ax.legend(fontsize=11)

ax = axes[1]
for Ti in T_inlet_grid:
    sub = df_sel[df_sel['T_inlet [K]'] == Ti]
    ax.plot(sub['T_coolant [K]'], sub['T_hotspot [K]'], marker='s',
            label=f'T_inlet = {Ti:.0f} K')
ax.set_xlabel('T_coolant [K]', fontsize=13)
ax.set_ylabel('T_hotspot [K]', fontsize=13)
ax.set_title('Hotspot Temperature vs Coolant Temperature', fontsize=14)
ax.tick_params(labelsize=11)
ax.grid(alpha=0.3)
ax.legend(fontsize=11)

fig3.tight_layout()
fig3.savefig('fig3_selectivity_matrix.png', dpi=160)

# ============================================================
# 8. DELIVERABLE 4 — REACTOR GAIN MAP (Figure 4, Table 2)
# ============================================================

gain_matrix = np.zeros((len(T_inlet_grid), len(Ta_grid)))
hotspot_matrix = np.zeros_like(gain_matrix)

for i, Ti in enumerate(T_inlet_grid):
    for j, Ta in enumerate(Ta_grid):
        s0 = solve_non_iso(A1, A2, U=U_baseline, Ta=Ta,    T0=Ti)
        s1 = solve_non_iso(A1, A2, U=U_baseline, Ta=Ta+1., T0=Ti)
        Th0 = float(np.max(s0.y[5]))
        Th1 = float(np.max(s1.y[5]))
        gain_matrix[i, j]    = Th1 - Th0
        hotspot_matrix[i, j] = Th0

gain_rows = []
for i, Ti in enumerate(T_inlet_grid):
    for j, Ta in enumerate(Ta_grid):
        gain_rows.append({
            'T_inlet [K]':   Ti,
            'T_coolant [K]': Ta,
            'T_hotspot [K]': hotspot_matrix[i, j],
            'Gain':          gain_matrix[i, j],
            'Stable':        gain_matrix[i, j] < 2.0,
        })
df_gain = pd.DataFrame(gain_rows)
df_gain.to_csv('table2_reactor_gain_map.csv', index=False)

fig4, ax = plt.subplots(figsize=(12, 6))
cmap = plt.cm.RdYlGn_r
vmax = max(2.5, float(np.max(gain_matrix)))
im = ax.imshow(gain_matrix, cmap=cmap, vmin=0, vmax=vmax,
               aspect='auto', origin='lower')
ax.set_xticks(range(len(Ta_grid)))
ax.set_yticks(range(len(T_inlet_grid)))
ax.set_xticklabels([f'{t:.0f}' for t in Ta_grid])
ax.set_yticklabels([f'{t:.0f}' for t in T_inlet_grid])
ax.set_xlabel('T_coolant [K]', fontsize=13)
ax.set_ylabel('T_inlet [K]', fontsize=13)
ax.set_title('Reactor Gain Map  (Gain < 2 → STABLE)', fontsize=14)
ax.tick_params(labelsize=11)

for i in range(len(T_inlet_grid)):
    for j in range(len(Ta_grid)):
        v = gain_matrix[i, j]
        ax.text(j, i, f'{v:.2f}', ha='center', va='center',
                color='black', fontsize=11, fontweight='bold')

cbar = fig4.colorbar(im, ax=ax)
cbar.set_label('Gain [K/K]', fontsize=12)
cbar.ax.axhline(2.0, color='black', lw=1.8)
cbar.ax.text(0.5, 2.0, ' Gain = 2', va='center', fontsize=10)

fig4.tight_layout()
fig4.savefig('fig4_reactor_gain_map.png', dpi=160)

# ============================================================
# 9. SUMMARY TABLE
# ============================================================

F_A_e, F_B_e, F_C_e, F_D_e, F_I_e, T_e = sol_ni.y[:, -1]
X_exit  = 1 - F_A_e / F_A0
S_C_exit = F_C_e / (F_A0 - F_A_e)
S_D_exit = F_D_e / (F_A0 - F_A_e)
Y_C_exit = X_exit * S_C_exit

s_plus = solve_non_iso(A1, A2, U=U_baseline, Ta=Ta_baseline+1.0)
gain_baseline = float(np.max(s_plus.y[5])) - T_hot

print("\n" + "="*60)
print("BASELINE SUMMARY  (T_inlet=628.15 K, Ta=600 K, U=65 W/m²K)")
print("="*60)
summary = [
    ('A1 (calibrated)',          f'{A1:.4f}'),
    ('A2 (calibrated)',          f'{A2:.4f}'),
    ('T_hotspot',                f'{T_hot:.2f} K'),
    ('W at hotspot',             f'{W_hot:.4f} kg ({pct_hot:.2f}% of bed)'),
    ('Conversion X_A (exit)',    f'{X_exit:.4f}'),
    ('Selectivity S_cumene',     f'{S_C_exit:.4f}'),
    ('Selectivity S_DIPB',       f'{S_D_exit:.4f}'),
    ('Yield_C (X*S)',            f'{Y_C_exit:.4f}'),
    ('Reactor Gain',             f'{gain_baseline:.3f}  ({"STABLE" if gain_baseline<2 else "UNSTABLE"})'),
    ('Exit T',                   f'{T_e:.2f} K'),
]
for k, v in summary:
    print(f'  {k:<28s} : {v}')

print("\nFiles written:")
for f in ('fig1_temperature_profile.png',
          'fig2_flows_conversion_selectivity.png',
          'fig3_selectivity_matrix.png',
          'fig4_reactor_gain_map.png',
          'table1_selectivity_matrix.csv',
          'table2_reactor_gain_map.csv'):
    print(f'  - {f}')

plt.show()
