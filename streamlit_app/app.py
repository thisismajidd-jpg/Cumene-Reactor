"""
Cumene Reactor — Interactive Streamlit App
CHPE4512 · Group 03 · SQU
Wraps the calibrated non-isothermal cumene reactor model from Memo 5.

Run locally:
    streamlit run streamlit_app/app.py

Deploy:
    Push to GitHub, then connect at https://share.streamlit.io and
    point it at streamlit_app/app.py.
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import streamlit as st
from scipy.integrate import solve_ivp
from scipy.optimize import brentq

# ============================================================
# 1. PARAMETERS  (LOCKED FROM MEMOS 1-4)
# ============================================================
F_A0_total = 27.75
F_B0_total = 30.75
F_I0_total = 1.46
X_target = 0.99

N_tubes = 4000
D_t = 0.0254
W_total = 44610.0
W_per_tube = W_total / N_tubes  # 11.1525 kg/tube

F_A0 = F_A0_total / N_tubes
F_B0 = F_B0_total / N_tubes
F_I0 = F_I0_total / N_tubes

rho_c = 1150.0
phi = 0.5
rho_b = rho_c * (1 - phi)
D_p = 0.005

P0 = 35.0e5
R = 8.314

Ea1 = 104200.0
Ea2 = 120200.0
A1_initial = 22.703
A2_initial = 14.11

dH1 = -99400.0
dH2 = -95300.0

CP_coeffs = {
    'A': (3.71, 234.6, -115.7, 22.0),
    'B': (-33.92, 474.0, -301.8, 71.3),
    'C': (-39.40, 636.0, -392.0, 92.7),
    'D': (-47.00, 830.0, -500.0, 118.0),
    'I': (-4.224, 306.3, -158.6, 32.1),
}

a_spec = 4.0 / D_t
ODE_KW = dict(method='LSODA', rtol=1e-9, atol=1e-12, dense_output=True)

T_INLET_DEFAULT = 628.15
TA_DEFAULT = 600.0
U_DEFAULT = 65.0

# ============================================================
# 2. SOLVER HELPERS
# ============================================================

def Cp(species, T):
    a, b, c, d = CP_coeffs[species]
    return a + b * T * 1e-3 + c * T**2 * 1e-6 + d * T**3 * 1e-9


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
    sumFCp = (F_A * Cp('A', T) + F_B * Cp('B', T) + F_C * Cp('C', T)
              + F_D * Cp('D', T) + F_I * Cp('I', T))
    dT = (Ua_per_kg * (Ta - T) + r1 * (-dH1) + r2 * (-dH2)) / sumFCp
    return [-(r1 + r2), -r1, r1 - r2, r2, 0.0, dT]


def rhs_iso(W, y, A1, A2, T_iso):
    F_A, F_B, F_C, F_D, F_I = y
    r1, r2 = rates(F_A, F_B, F_C, F_D, F_I, T_iso, A1, A2)
    return [-(r1 + r2), -r1, r1 - r2, r2, 0.0]


def solve_non_iso(A1, A2, U, Ta, T0, W_end=W_per_tube, n=600):
    W_eval = np.linspace(0, W_end, n)
    y0 = [F_A0, F_B0, 0.0, 0.0, F_I0, T0]
    return solve_ivp(rhs, (0, W_end), y0, args=(A1, A2, U, Ta),
                     t_eval=W_eval, **ODE_KW)


def solve_iso(A1, A2, T_iso, W_end=W_per_tube, n=600):
    W_eval = np.linspace(0, W_end, n)
    y0 = [F_A0, F_B0, 0.0, 0.0, F_I0]
    return solve_ivp(rhs_iso, (0, W_end), y0, args=(A1, A2, T_iso),
                     t_eval=W_eval, **ODE_KW)


# ============================================================
# 3. CALIBRATION  (cached so it runs once per session)
# ============================================================

@st.cache_data(show_spinner='Calibrating kinetics A₁, A₂…')
def calibrate(T_calib=T_INLET_DEFAULT):
    def res_A1(A1):
        sol = solve_iso(A1, 0.0, T_iso=T_calib)
        return (1 - sol.y[0, -1] / F_A0) - X_target

    A1 = brentq(res_A1, A1_initial * 0.1, A1_initial * 10.0, xtol=1e-8)

    def res_A2(A2):
        sol = solve_iso(A1, A2, T_iso=T_calib)
        F_A_end = sol.y[0, -1]
        F_C_end = sol.y[2, -1]
        S = F_C_end / (F_A0 - F_A_end)
        return S - 0.929

    A2 = brentq(res_A2, A2_initial * 0.05, A2_initial * 20.0, xtol=1e-8)
    return A1, A2


# ============================================================
# 4. STREAMLIT APP
# ============================================================

st.set_page_config(
    page_title='Cumene Reactor — ReactorIQ',
    page_icon='⚗️',
    layout='wide',
)

st.title('Cumene Reactor — Non-Isothermal Fixed Bed')
st.caption('CHPE4512 · Group 03 · SQU — Interactive Memo 5')

A1, A2 = calibrate()

# ---------- Sidebar controls ----------
with st.sidebar:
    st.header('Operating conditions')
    T_inlet = st.slider('T_inlet [K]', 580.0, 670.0, T_INLET_DEFAULT, 0.5,
                        help='Feed temperature at the bed inlet.')

    Ta_max = float(T_inlet - 0.5)
    Ta_default = min(TA_DEFAULT, Ta_max - 0.5)
    Ta = st.slider('T_coolant [K]', 540.0, Ta_max, Ta_default, 0.5,
                   help='Shell-side coolant temperature. Bounded below T_inlet.')

    U = st.slider('U [W/(m²·K)]', 10.0, 200.0, U_DEFAULT, 1.0,
                  help='Overall heat-transfer coefficient.')

    W_end = st.slider('Catalyst per tube [kg]', 1.0, 30.0,
                      float(W_per_tube), 0.1,
                      help=f'Memo 5 baseline = {W_per_tube:.3f} kg/tube.')

    st.markdown('---')
    st.subheader('Calibrated kinetics')
    st.markdown(f'**A₁** = `{A1:.4f}`')
    st.markdown(f'**A₂** = `{A2:.4f}`')
    st.caption(f'Locked at X = {X_target:.2f}, S = 0.929')

    st.markdown('---')
    st.subheader('Constants (from Memos 1-4)')
    st.markdown(
        f'- Tubes: **{N_tubes}**  \n'
        f'- D_tube: **{D_t*1000:.1f} mm**  \n'
        f'- ρ_b: **{rho_b:.1f} kg/m³**  \n'
        f'- P₀: **{P0/1e5:.1f} bar**'
    )

# ---------- Solve ----------
sol_ni = solve_non_iso(A1, A2, U=U, Ta=Ta, T0=T_inlet, W_end=W_end)
sol_is = solve_iso(A1, A2, T_iso=T_inlet, W_end=W_end)

W_ni = sol_ni.t
F_A_ni = sol_ni.y[0]
F_B_ni = sol_ni.y[1]
F_C_ni = sol_ni.y[2]
F_D_ni = sol_ni.y[3]
F_I_ni = sol_ni.y[4]
T_ni = sol_ni.y[5]

X_A_ni = 1 - F_A_ni / F_A0
denom = F_A0 - F_A_ni
safe = np.where(denom > 1e-12, denom, 1.0)
S_C_ni = np.where(denom > 1e-12, F_C_ni / safe, 0.0)
S_D_ni = np.where(denom > 1e-12, F_D_ni / safe, 0.0)

i_hot = int(np.argmax(T_ni))
W_hot = W_ni[i_hot]
T_hot = T_ni[i_hot]
pct_hot = 100.0 * W_hot / W_end

X_exit = X_A_ni[-1]
S_C_exit = S_C_ni[-1]
S_D_exit = S_D_ni[-1]
T_exit = T_ni[-1]
Y_C_exit = X_exit * S_C_exit

# ---------- KPIs ----------
c1, c2, c3, c4, c5 = st.columns(5)
c1.metric('Conversion X_A', f'{100*X_exit:.2f} %',
          delta=f'{100*(X_exit - X_target):+.2f} pp vs target')
c2.metric('Selectivity S_cumene', f'{100*S_C_exit:.2f} %')
c3.metric('Hotspot T', f'{T_hot:.1f} K',
          delta=f'{T_hot - T_inlet:+.1f} K')
c4.metric('Exit T', f'{T_exit:.1f} K')
c5.metric('Yield (X·S)', f'{100*Y_C_exit:.2f} %')

# ---------- Tabs ----------
tab_profiles, tab_matrix, tab_gain, tab_summary = st.tabs([
    'Profiles', 'Selectivity matrix', 'Reactor gain', 'Summary'
])

with tab_profiles:
    fig, axes = plt.subplots(1, 3, figsize=(18, 5.2))

    ax = axes[0]
    ax.plot(W_ni, T_ni, color='#C0392B', lw=2.2, label='Non-isothermal T(W)')
    ax.axhline(T_inlet, color='#2980B9', ls='--', lw=1.4,
               label=f'T_inlet = {T_inlet:.1f} K')
    ax.axhline(Ta, color='gray', ls=':', lw=1.3,
               label=f'T_coolant = {Ta:.1f} K')
    ax.plot(W_hot, T_hot, 'o', mfc='gold', mec='black', ms=11, zorder=5,
            label=f'Hotspot {T_hot:.1f} K @ {pct_hot:.1f}%')
    ax.set_xlabel('W [kg / tube]')
    ax.set_ylabel('T [K]')
    ax.set_title('Axial temperature profile')
    ax.grid(alpha=0.3)
    ax.legend(fontsize=9)

    ax = axes[1]
    ax.plot(W_ni, 100 * X_A_ni, color='#C0392B', lw=2.0, label='Non-isothermal')
    iso_X = 1 - sol_is.y[0] / F_A0
    ax.plot(sol_is.t, 100 * iso_X, color='#2980B9', ls='--', lw=1.8,
            label='Isothermal')
    ax.axhline(99.0, color='black', ls=':', lw=1.0, label='99 % target')
    ax.set_xlabel('W [kg/tube]')
    ax.set_ylabel('Conversion X_A [%]')
    ax.set_title('Propylene conversion')
    ax.set_ylim(0, 105)
    ax.grid(alpha=0.3)
    ax.legend(fontsize=9, loc='lower right')

    ax = axes[2]
    ax.plot(W_ni, 100 * S_C_ni, color='green', lw=2.0, label='S_cumene')
    ax.plot(W_ni, 100 * S_D_ni, color='red', lw=2.0, label='S_DIPB')
    ax.axvline(W_hot, color='gold', ls='--', lw=1.4)
    ax.set_xlabel('W [kg/tube]')
    ax.set_ylabel('Cumulative selectivity [%]')
    ax.set_title('Selectivity profiles')
    ax.set_ylim(0, 105)
    ax.grid(alpha=0.3)
    ax.legend(fontsize=9)

    fig.tight_layout()
    st.pyplot(fig)

    with st.expander('Molar flow profiles (per tube)'):
        fig2, ax = plt.subplots(figsize=(12, 5))
        ax.plot(W_ni, F_A_ni, label='F_A (propylene)')
        ax.plot(W_ni, F_B_ni, label='F_B (benzene)')
        ax.plot(W_ni, F_C_ni, label='F_C (cumene)')
        ax.plot(W_ni, F_D_ni, label='F_D (DIPB)')
        ax.plot(W_ni, F_I_ni, label='F_I (propane)')
        ax.set_xlabel('W [kg/tube]')
        ax.set_ylabel('Molar flow [mol/s per tube]')
        ax.grid(alpha=0.3)
        ax.legend(fontsize=10)
        fig2.tight_layout()
        st.pyplot(fig2)


with tab_matrix:
    st.markdown(
        'Sweeps **T_inlet × T_coolant** at U = 65 W/(m²·K). '
        'Mirrors Table 1 / Figure 3 from Memo 5.'
    )
    if st.button('Compute selectivity matrix', key='matrix_btn'):
        T_inlet_grid = [600.0, 620.0, 640.0, 660.0]
        Ta_grid = [560.0, 580.0, 600.0, 620.0]
        prog = st.progress(0.0)
        rows = []
        n_total = len(T_inlet_grid) * len(Ta_grid)
        k = 0
        for Ti in T_inlet_grid:
            for Ta_ in Ta_grid:
                s = solve_non_iso(A1, A2, U=65.0, Ta=Ta_, T0=Ti)
                F_A_e, _, F_C_e, F_D_e, _, _ = s.y[:, -1]
                X = 1 - F_A_e / F_A0
                d = F_A0 - F_A_e
                SC = F_C_e / d if d > 1e-12 else 0.0
                SD = F_D_e / d if d > 1e-12 else 0.0
                rows.append({
                    'T_inlet [K]': Ti,
                    'T_coolant [K]': Ta_,
                    'T_hotspot [K]': float(np.max(s.y[5])),
                    'X_A': X,
                    'S_cumene': SC,
                    'S_DIPB': SD,
                    'Yield_C': X * SC,
                })
                k += 1
                prog.progress(k / n_total)
        prog.empty()
        df = pd.DataFrame(rows)
        st.dataframe(df.style.format({
            'X_A': '{:.4f}', 'S_cumene': '{:.4f}', 'S_DIPB': '{:.4f}',
            'Yield_C': '{:.4f}', 'T_hotspot [K]': '{:.2f}',
        }), use_container_width=True)

        fig, axes = plt.subplots(1, 2, figsize=(16, 5))
        ax = axes[0]
        for Ti in T_inlet_grid:
            sub = df[df['T_inlet [K]'] == Ti]
            ax.plot(sub['T_coolant [K]'], 100 * sub['S_cumene'],
                    marker='o', label=f'T_inlet = {Ti:.0f} K')
        ax.set_xlabel('T_coolant [K]')
        ax.set_ylabel('S_cumene [%]')
        ax.set_title('Cumene selectivity vs coolant temperature')
        ax.grid(alpha=0.3)
        ax.legend()

        ax = axes[1]
        for Ti in T_inlet_grid:
            sub = df[df['T_inlet [K]'] == Ti]
            ax.plot(sub['T_coolant [K]'], sub['T_hotspot [K]'],
                    marker='s', label=f'T_inlet = {Ti:.0f} K')
        ax.set_xlabel('T_coolant [K]')
        ax.set_ylabel('T_hotspot [K]')
        ax.set_title('Hotspot vs coolant temperature')
        ax.grid(alpha=0.3)
        ax.legend()
        fig.tight_layout()
        st.pyplot(fig)

        st.download_button(
            'Download CSV', df.to_csv(index=False).encode(),
            file_name='selectivity_matrix.csv', mime='text/csv',
        )


with tab_gain:
    st.markdown(
        'Reactor gain = ΔT_hotspot / ΔT_coolant (1 K perturbation). '
        '**Gain < 2 → stable** (Froment criterion). Mirrors Table 2 / Figure 4.'
    )
    if st.button('Compute gain map', key='gain_btn'):
        T_inlet_grid = [600.0, 620.0, 640.0, 660.0]
        Ta_grid = [560.0, 580.0, 600.0, 620.0]
        gain = np.zeros((len(T_inlet_grid), len(Ta_grid)))
        prog = st.progress(0.0)
        n_total = len(T_inlet_grid) * len(Ta_grid)
        k = 0
        for i, Ti in enumerate(T_inlet_grid):
            for j, Ta_ in enumerate(Ta_grid):
                s0 = solve_non_iso(A1, A2, U=65.0, Ta=Ta_, T0=Ti)
                s1 = solve_non_iso(A1, A2, U=65.0, Ta=Ta_ + 1.0, T0=Ti)
                gain[i, j] = float(np.max(s1.y[5])) - float(np.max(s0.y[5]))
                k += 1
                prog.progress(k / n_total)
        prog.empty()

        fig, ax = plt.subplots(figsize=(10, 6))
        cmap = plt.cm.RdYlGn_r
        vmax = max(2.5, float(np.max(gain)))
        im = ax.imshow(gain, cmap=cmap, vmin=0, vmax=vmax,
                       aspect='auto', origin='lower')
        ax.set_xticks(range(len(Ta_grid)))
        ax.set_yticks(range(len(T_inlet_grid)))
        ax.set_xticklabels([f'{t:.0f}' for t in Ta_grid])
        ax.set_yticklabels([f'{t:.0f}' for t in T_inlet_grid])
        ax.set_xlabel('T_coolant [K]')
        ax.set_ylabel('T_inlet [K]')
        ax.set_title('Reactor gain map  (Gain < 2 → STABLE)')
        for i in range(len(T_inlet_grid)):
            for j in range(len(Ta_grid)):
                ax.text(j, i, f'{gain[i, j]:.2f}', ha='center', va='center',
                        fontweight='bold')
        cbar = fig.colorbar(im, ax=ax)
        cbar.set_label('Gain [K/K]')
        cbar.ax.axhline(2.0, color='black', lw=1.5)
        fig.tight_layout()
        st.pyplot(fig)

        df_g = pd.DataFrame([
            {'T_inlet [K]': Ti, 'T_coolant [K]': Ta_,
             'Gain': gain[i, j], 'Stable': bool(gain[i, j] < 2.0)}
            for i, Ti in enumerate(T_inlet_grid)
            for j, Ta_ in enumerate(Ta_grid)
        ])
        st.dataframe(df_g.style.format({'Gain': '{:.3f}'}),
                     use_container_width=True)


with tab_summary:
    st.subheader('Current operating point')
    summary = pd.DataFrame([
        ('A₁ (calibrated)', f'{A1:.4f}'),
        ('A₂ (calibrated)', f'{A2:.4f}'),
        ('T_inlet', f'{T_inlet:.2f} K'),
        ('T_coolant', f'{Ta:.2f} K'),
        ('U', f'{U:.1f} W/(m²·K)'),
        ('W per tube', f'{W_end:.4f} kg'),
        ('T_hotspot', f'{T_hot:.2f} K'),
        ('W at hotspot', f'{W_hot:.4f} kg ({pct_hot:.2f}%)'),
        ('Conversion X_A', f'{X_exit:.4f}'),
        ('Selectivity S_cumene', f'{S_C_exit:.4f}'),
        ('Selectivity S_DIPB', f'{S_D_exit:.4f}'),
        ('Yield_C (X·S)', f'{Y_C_exit:.4f}'),
        ('Exit T', f'{T_exit:.2f} K'),
    ], columns=['Quantity', 'Value'])
    st.dataframe(summary, use_container_width=True, hide_index=True)

    st.subheader('Trajectory')
    traj = pd.DataFrame({
        'W [kg]': W_ni,
        'T [K]': T_ni,
        'X_A': X_A_ni,
        'F_A': F_A_ni,
        'F_C': F_C_ni,
        'F_D': F_D_ni,
        'S_cumene': S_C_ni,
        'S_DIPB': S_D_ni,
    })
    st.download_button(
        'Download trajectory CSV',
        traj.to_csv(index=False).encode(),
        file_name='trajectory.csv', mime='text/csv',
    )
    st.dataframe(traj.head(20), use_container_width=True)
    st.caption(f'Showing first 20 of {len(traj)} rows. Download full CSV above.')
