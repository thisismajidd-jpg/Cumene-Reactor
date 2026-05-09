# =============================================================================
# COMBINED: MEMO 1 (STOICHIOMETRY) + MEMO 2 (ISOTHERMAL PBR DESIGN)
# Cumene Production  —  CHPE4512 | Sultan Qaboos University | Group 03
# =============================================================================
# UNIT SYSTEM: kg · s · kmol
#   Molar flows    → kmol/s
#   Mass flows     → kg/s
#   Concentrations → kmol/m³
#   Catalyst wt    → kg_cat
#   Reactor vol    → m³
# =============================================================================

import csv
import numpy as np
from scipy.integrate import solve_ivp, odeint
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

# =============================================================================
# CHEMICAL DATABASE  [kg/kmol]
# =============================================================================

CHEM_DB = {
    "methane":16.043,"ch4":16.043,"ethane":30.069,"c2h6":30.069,
    "propane":44.097,"c3h8":44.097,"butane":58.123,"n-butane":58.123,
    "c4h10":58.123,"isobutane":58.123,"pentane":72.150,"n-pentane":72.150,
    "c5h12":72.150,"hexane":86.177,"n-hexane":86.177,"c6h14":86.177,
    "heptane":100.203,"n-heptane":100.203,"octane":114.230,"n-octane":114.230,
    "ethylene":28.054,"ethene":28.054,"c2h4":28.054,
    "propylene":42.081,"propene":42.081,"c3h6":42.081,
    "1-butene":56.108,"butene":56.108,"c4h8":56.108,
    "isobutylene":56.108,"isobutene":56.108,"1-pentene":70.134,
    "acetylene":26.038,"ethyne":26.038,"c2h2":26.038,
    "benzene":78.114,"c6h6":78.114,"toluene":92.141,"methylbenzene":92.141,
    "c7h8":92.141,"xylene":106.167,"o-xylene":106.167,"m-xylene":106.167,
    "p-xylene":106.167,"c8h10":106.167,"styrene":104.152,
    "cumene":120.195,"isopropylbenzene":120.195,"c9h12":120.195,
    "ethylbenzene":106.167,"naphthalene":128.174,
    "dipb":162.276,"diisopropylbenzene":162.276,
    "methanol":32.042,"ch3oh":32.042,"ethanol":46.069,"c2h5oh":46.069,
    "propanol":60.096,"1-propanol":60.096,"isopropanol":60.096,
    "2-propanol":60.096,"butanol":74.123,"1-butanol":74.123,
    "phenol":94.113,"c6h5oh":94.113,
    "acetone":58.080,"propanone":58.080,"c3h6o":58.080,
    "mek":72.107,"formaldehyde":30.026,"ch2o":30.026,
    "acetaldehyde":44.053,"acetic acid":60.052,"ethanoic acid":60.052,
    "ch3cooh":60.052,"formic acid":46.026,
    "hydrogen":2.016,"h2":2.016,"oxygen":32.000,"o2":32.000,
    "nitrogen":28.014,"n2":28.014,"carbon monoxide":28.010,"co":28.010,
    "carbon dioxide":44.010,"co2":44.010,"water":18.015,"h2o":18.015,
    "steam":18.015,"ammonia":17.031,"nh3":17.031,
    "hydrogen sulfide":34.081,"h2s":34.081,"sulfur dioxide":64.066,
    "so2":64.066,"chlorine":70.906,"cl2":70.906,
    "hydrochloric acid":36.461,"hcl":36.461,"nitric oxide":30.006,
    "no":30.006,"nitrogen dioxide":46.006,"no2":46.006,
    "sulfuric acid":98.079,"h2so4":98.079,"sodium hydroxide":40.000,
    "naoh":40.000,"cyclohexane":84.162,"c6h12":84.162,
    "methylcyclohexane":98.188,"isoprene":68.118,"butadiene":54.092,
    "1,3-butadiene":54.092,"vinyl chloride":62.499,"acrylonitrile":53.064,
    "caprolactam":113.160,"cumene hydroperoxide":152.194,"chp":152.194,
}

def lookup_mw(name):
    key = name.strip().lower()
    if key in CHEM_DB:
        return CHEM_DB[key], True
    return None, False

# =============================================================================
# SHARED HELPERS
# =============================================================================

def sep(char="─", width=68):
    print(char * width)

def get_float(prompt, min_val=None, max_val=None, default=None):
    while True:
        display = f"  {prompt}"
        if default is not None:
            display += f" [{default}]"
        display += ": "
        raw = input(display).strip()
        if raw == "" and default is not None:
            return float(default)
        try:
            value = float(raw)
            if min_val is not None and value < min_val:
                print(f"    Value must be >= {min_val}.")
                continue
            if max_val is not None and value > max_val:
                print(f"    Value must be <= {max_val}.")
                continue
            return value
        except ValueError:
            print("    Please enter a valid number.")

def get_int(prompt, min_val=1):
    while True:
        try:
            value = int(input(f"  {prompt}"))
            if value < min_val:
                print(f"    Value must be >= {min_val}.")
                continue
            return value
        except ValueError:
            print("    Please enter a whole number.")

def get_str(prompt, default=None):
    display = f"  {prompt}"
    if default is not None:
        display += f" [{default}]"
    display += ": "
    raw = input(display).strip()
    return raw if raw != "" else str(default)

def format_coeff(c):
    c = abs(c)
    if c == 1:
        return ""
    return str(int(c)) if c == int(c) else str(c)

def build_reaction_string(species_list, stoich, heat_sign):
    reactant_parts = []
    product_parts  = []
    for sp in species_list:
        c = stoich[sp]
        if c < 0:
            reactant_parts.append(f"{format_coeff(c)}{sp}")
        elif c > 0:
            product_parts.append(f"{format_coeff(c)}{sp}")
    lhs = " + ".join(reactant_parts)
    rhs = " + ".join(product_parts)
    if heat_sign == -1:
        rhs  += " + Heat"
        note  = "(exothermic — heat released)"
    else:
        lhs  += " + Heat"
        note  = "(endothermic — heat absorbed)"
    return f"  {lhs}  ──→  {rhs}", note

# =============================================================================
# ██╗  ██╗███████╗███╗   ███╗ ██████╗      ██╗
# ███╗ ██║██╔════╝████╗ ████║██╔═══██╗    ███║
# ██╔██╗██║█████╗  ██╔████╔██║██║   ██║     ██║
# ██║╚████║██╔══╝  ██║╚██╔╝██║██║   ██║     ██║
# ██║ ╚███║███████╗██║ ╚═╝ ██║╚██████╔╝     ██║
# STOICHIOMETRIC CALCULATOR
# =============================================================================

print()
sep("=")
print("   MEMO 1 — STOICHIOMETRIC CALCULATOR")
print("   CHPE4512 | Sultan Qaboos University | Group 03")
print("   Unit system: kg · s · kmol")
sep("=")
print()
print("  Select mode:")
print()
print("   [1]  Cumene Production  —  pre-loaded")
print("   [2]  New Reaction       —  enter from scratch")
print()

mode = get_int("Your choice (1 or 2): ", min_val=1)
while mode not in [1, 2]:
    mode = get_int("Please enter 1 or 2: ", min_val=1)

species_list = []
MW           = {}
stoich       = {}
is_inert     = {}
y_feed       = {}

# ── Mode 1: Cumene pre-loaded ─────────────────────────────────────────────────
if mode == 1:
    print()
    sep()
    print("  CUMENE PRODUCTION — PRE-LOADED DATA")
    print()
    cumene_species = [
        ("Propylene", -1,  0.475),
        ("Benzene",   -1,  0.500),
        ("Cumene",    +1,  0.000),
        ("Propane",    0,  0.025),
    ]
    for name, coeff, yf in cumene_species:
        mw, _ = lookup_mw(name)
        species_list.append(name)
        MW[name]       = mw
        stoich[name]   = coeff
        is_inert[name] = (coeff == 0)
        y_feed[name]   = yf
        role = "product" if coeff > 0 else ("inert" if coeff == 0 else "reactant")
        print(f"  {name:<14}  MW={mw} kg/kmol  coeff={coeff:+.0f}  y={yf}  ({role})")
    heat_sign = -1
    reaction_str, heat_note = build_reaction_string(species_list, stoich, heat_sign)
    print()
    print("  Reaction:")
    print(reaction_str)
    print(f"  {heat_note}")
    sep()
    reactants        = {sp: stoich[sp] for sp in species_list if stoich[sp] < 0}
    availability     = {sp: y_feed[sp] / abs(stoich[sp]) for sp in reactants if y_feed[sp] > 0}
    limiting_reagent = min(availability, key=lambda sp: availability[sp])
    a_coeff          = abs(stoich[limiting_reagent])
    print()
    print("  Limiting reagent check:")
    for sp in reactants:
        ratio = y_feed[sp] / abs(stoich[sp]) if y_feed[sp] > 0 else 0.0
        flag  = "  <- LIMITING REAGENT" if sp == limiting_reagent else ""
        print(f"    {sp:<14}  {y_feed[sp]:.4f} / {abs(stoich[sp]):.0f} = {ratio:.4f}{flag}")
    products    = {sp: stoich[sp] for sp in species_list if stoich[sp] > 0}
    main_product = max(products, key=lambda sp: products[sp])

# ── Mode 2: New reaction ──────────────────────────────────────────────────────
else:
    print()
    sep()
    print("  STEP 1: DEFINE YOUR SPECIES")
    print()
    n_species = get_int("How many species (including inerts)? ", min_val=2)
    print()
    for i in range(n_species):
        print(f"  --- Species {i+1} ---")
        name = input("  Name: ").strip()
        mw, found = lookup_mw(name)
        if found:
            print(f"  MW of {name} auto-identified: {mw} kg/kmol")
        else:
            print(f"  '{name}' not in database.")
            mw = get_float(f"Enter MW of {name} [kg/kmol]", min_val=0.001)
        coeff = get_float(f"Stoichiometric coefficient of {name}")
        species_list.append(name)
        MW[name]       = mw
        stoich[name]   = coeff
        is_inert[name] = (coeff == 0)
        print()
    reactants = {sp: stoich[sp] for sp in species_list if stoich[sp] < 0}
    sep()
    print()
    print("  REACTION MODEL")
    heat_choice = get_int("Exothermic=1  Endothermic=2: ", min_val=1)
    while heat_choice not in [1, 2]:
        heat_choice = get_int("Enter 1 or 2: ", min_val=1)
    heat_sign = -1 if heat_choice == 1 else +1
    reaction_str, heat_note = build_reaction_string(species_list, stoich, heat_sign)
    print()
    print("  Reaction:")
    print(reaction_str)
    print(f"  {heat_note}")
    sep()
    products     = {sp: stoich[sp] for sp in species_list if stoich[sp] > 0}
    main_product = max(products, key=lambda sp: products[sp])
    print()
    print("  STEP 2: FEED MOLE FRACTIONS")
    print()
    y_total = 0.0
    for sp in species_list:
        if stoich[sp] > 0:
            y_feed[sp] = 0.0
            print(f"  {sp} -> product, y=0.0 (auto)")
        else:
            y = get_float(f"y_{sp}", min_val=0.0, max_val=1.0)
            y_feed[sp]  = y
            y_total    += y
    if abs(y_total - 1.0) > 0.01:
        print(f"  Warning: fractions sum to {y_total:.4f}, not 1.0")
    availability     = {sp: y_feed[sp] / abs(stoich[sp]) for sp in reactants if y_feed[sp] > 0}
    limiting_reagent = min(availability, key=lambda sp: availability[sp])
    a_coeff          = abs(stoich[limiting_reagent])
    print()
    print("  Limiting reagent check:")
    for sp in reactants:
        ratio = y_feed[sp] / abs(stoich[sp]) if y_feed[sp] > 0 else 0.0
        flag  = "  <- LIMITING REAGENT" if sp == limiting_reagent else ""
        print(f"    {sp:<14}  {y_feed[sp]:.4f} / {abs(stoich[sp]):.0f} = {ratio:.4f}{flag}")

# ── Shared: production target & conversion ────────────────────────────────────
print()
sep()
print()
print("  PRODUCTION TARGET")
print()
production_tons_year = get_float("Annual production of product [ton/year]", min_val=1)
operating_weeks      = get_float("Operating weeks per year", min_val=1, max_val=52)

print()
sep()
print()
print("  CONVERSION LEVELS")
print()
X_design = get_float("Design conversion of limiting reagent (0 to 1)", min_val=0.001, max_val=0.9999)
print()
n_conv = get_int("How many conversion levels for comparison table? ", min_val=1)
X_list = []
for i in range(n_conv):
    xv = get_float(f"Conversion level {i+1} (0 to 1)", min_val=0.001, max_val=0.9999)
    X_list.append(xv)

# ── Calculation engine ────────────────────────────────────────────────────────
seconds_per_year = operating_weeks * 7.0 * 24.0 * 3600.0
MW_product       = MW[main_product]
c_coeff          = abs(stoich[main_product])
F_product_target = (production_tons_year * 1000.0) / (MW_product * seconds_per_year)
FA0_calc         = F_product_target / ((c_coeff / a_coeff) * X_design)

y_A_val = y_feed[limiting_reagent]
F0 = {}
for sp in species_list:
    if stoich[sp] > 0:
        F0[sp] = 0.0
    else:
        F0[sp] = FA0_calc * (y_feed[sp] / y_A_val) if y_A_val > 0 else 0.0

FT0 = sum(F0.values())

def calculate_flows(X_val):
    result = {}
    for sp in species_list:
        inlet  = F0[sp]
        change = 0.0 if is_inert[sp] else (stoich[sp] / a_coeff) * FA0_calc * X_val
        outlet = max(inlet + change, 0.0)
        result[sp] = {"inlet": inlet, "change": change, "outlet": outlet}
    FT_out = sum(result[sp]["outlet"] for sp in species_list)
    FT_chg = sum(result[sp]["change"] for sp in species_list)
    result["__FT__"] = {"inlet": FT0, "change": FT_chg, "outlet": FT_out}
    return result

flows    = calculate_flows(X_design)
FT_out   = flows["__FT__"]["outlet"]
mass_in  = {sp: F0[sp]              * MW[sp] for sp in species_list}
mass_out = {sp: flows[sp]["outlet"] * MW[sp] for sp in species_list}
MT_in    = sum(mass_in.values())
MT_out   = sum(mass_out.values())

# ── Output tables ─────────────────────────────────────────────────────────────
col = 14
print()
sep("=")
print("  MEMO 1 RESULTS")
sep("=")
print()
print("  Reaction:")
print(reaction_str)
print(f"  {heat_note}")
print()
print(f"  Limiting reagent : {limiting_reagent}  (X = {X_design*100:.1f}%)")
print(f"  FA0              : {FA0_calc:.6f} kmol/s")
print(f"  F_{main_product} target  : {F_product_target:.6f} kmol/s")
print()
sep()
print("  TABLE 1 — STOICHIOMETRIC TABLE [kmol/s]")
sep()
print(f"  {'Species':<{col}} {'Inlet':>15} {'Change':>16} {'Outlet':>16}")
print("  " + "-"*52)
for sp in species_list:
    r = flows[sp]
    print(f"  {sp:<{col}} {r['inlet']:>15.6f} {r['change']:>16.6f} {r['outlet']:>16.6f}")
tot = flows["__FT__"]
print("  " + "-"*52)
print(f"  {'TOTAL':<{col}} {tot['inlet']:>15.6f} {tot['change']:>16.6f} {tot['outlet']:>16.6f}")
sep()
print()
sep()
print("  TABLE 2 — MOLE FRACTIONS [-]")
sep()
print(f"  {'Species':<{col}} {'Inlet y_i':>14} {'Outlet y_i':>14}")
print("  " + "-"*44)
for sp in species_list:
    yi_in  = (F0[sp]              / FT0)    * 100 if FT0    > 0 else 0.0
    yi_out = (flows[sp]["outlet"] / FT_out) * 100 if FT_out > 0 else 0.0
    print(f"  {sp:<{col}} {yi_in:>13.2f}%  {yi_out:>13.2f}%")
sep()
print()
sep()
print("  TABLE 3 — MASS FLOWS [kg/s]")
sep()
print(f"  {'Species':<{col}} {'MW':>13} {'In (kg/s)':>11} {'Out (kg/s)':>11} {'w_in':>8} {'w_out':>8}")
print("  " + "-"*60)
for sp in species_list:
    wi_in  = (mass_in[sp]  / MT_in)  * 100 if MT_in  > 0 else 0.0
    wi_out = (mass_out[sp] / MT_out) * 100 if MT_out > 0 else 0.0
    print(f"  {sp:<{col}} {MW[sp]:>13.3f} {mass_in[sp]:>11.6f} {mass_out[sp]:>11.6f} {wi_in:>7.2f}% {wi_out:>7.2f}%")
print("  " + "-"*60)
print(f"  {'TOTAL':<{col}} {'':>13} {MT_in:>11.6f} {MT_out:>11.6f}")
sep()
print(f"\n  Mass balance:  In={MT_in:.8f}  Out={MT_out:.8f}  Diff={abs(MT_in-MT_out):.2e} kg/s")
print()
sep()
print("  TABLE 4 — COMPARISON AT MULTIPLE CONVERSIONS [kmol/s]")
sep()
hdr = f"  {'X':>5}"
for sp in species_list:
    hdr += f"  {sp[:8]:>12}"
hdr += f"  {'y_'+main_product[:5]:>9}"
print(hdr)
print("  " + "-"*(8 + 14*len(species_list) + 12))
comparison_rows = []
for xv in sorted(X_list):
    f  = calculate_flows(xv)
    ft = f["__FT__"]["outlet"]
    row_vals = {"Conversion (-)": xv}
    line = f"  {xv:>5.2f}"
    for sp in species_list:
        val = f[sp]["outlet"]
        line += f"  {val:>12.6f}"
        row_vals[f"F_{sp} (kmol/s)"] = round(val, 6)
    y_prod = (f[main_product]["outlet"] / ft * 100) if ft > 0 else 0.0
    line  += f"  {y_prod:>8.2f}%"
    row_vals[f"y_{main_product} (%)"] = round(y_prod, 2)
    print(line)
    comparison_rows.append(row_vals)
sep()

# ── CSV export (Memo 1) ───────────────────────────────────────────────────────
csv_file = "memo1_stoichiometry_results.csv"
with open(csv_file, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["MEMO 1 — STOICHIOMETRIC RESULTS"])
    w.writerow(["Reaction", reaction_str.strip()])
    w.writerow(["Heat", heat_note])
    w.writerow(["Production [ton/year]", production_tons_year])
    w.writerow(["Weeks/year", operating_weeks])
    w.writerow(["Design X", X_design])
    w.writerow(["Limiting Reagent", limiting_reagent])
    w.writerow([])
    w.writerow(["TABLE 1"])
    w.writerow(["Species","Inlet (kmol/s)","Change (kmol/s)","Outlet (kmol/s)"])
    for sp in species_list:
        r = flows[sp]
        w.writerow([sp, round(r["inlet"],6), round(r["change"],6), round(r["outlet"],6)])
    w.writerow(["TOTAL", round(tot["inlet"],6), round(tot["change"],6), round(tot["outlet"],6)])
    w.writerow([])
    w.writerow(["TABLE 4"])
    if comparison_rows:
        w.writerow(list(comparison_rows[0].keys()))
        for row in comparison_rows:
            w.writerow(list(row.values()))
print(f"\n  CSV saved -> {csv_file}")

# =============================================================================
# TRANSITION TO MEMO 2
# =============================================================================

print()
sep("=")
print("   MEMO 1 COMPLETE")
sep("=")
print()
print("  The following parameters from Memo 1 will be passed")
print("  automatically to the Memo 2 PBR design:")
print()
print(f"    Product        : {main_product}")
print(f"    Reaction       : {reaction_str.strip()}")
print(f"    FA0            : {FA0_calc:.6f} kmol/s")
print(f"    y_A (limiting) : {y_A_val:.4f}  ({limiting_reagent})")
second_reactant = [sp for sp in reactants if sp != limiting_reagent]
y_B_val  = y_feed[second_reactant[0]] if second_reactant else 0.0
thetaB   = y_B_val / y_A_val if y_A_val > 0 else 1.0
delta    = sum(stoich[sp] for sp in species_list if not is_inert[sp]) / a_coeff
eps_val  = y_A_val * delta
print(f"    y_B (other)    : {y_B_val:.4f}  ({second_reactant[0] if second_reactant else 'N/A'})")
print(f"    thetaB (B/A)   : {thetaB:.5f}")
print(f"    delta          : {delta:.4f}")
print(f"    epsilon        : {eps_val:.4f}")
print()

cont = input("  Continue to Memo 2 — PBR Design? (y/n): ").strip().lower()
if cont != 'y':
    print()
    print("  Exiting after Memo 1. Goodbye!")
    exit()

# =============================================================================
# ██╗  ██╗███████╗███╗   ███╗ ██████╗     ██████╗
# ███╗ ██║██╔════╝████╗ ████║██╔═══██╗        ██╔╝
# ██╔██╗██║█████╗  ██╔████╔██║██║   ██║       ██╔╝
# ██║╚████║██╔══╝  ██║╚██╔╝██║██║   ██║      ██╔╝
# ██║ ╚███║███████╗██║ ╚═╝ ██║╚██████╔╝      ██║
# PBR ISOTHERMAL REACTOR DESIGN
# =============================================================================

print()
sep("=")
print("   MEMO 2 — ISOTHERMAL PBR DESIGN")
print("   Only kinetic & reactor parameters needed")
print("   (reaction data carried over from Memo 1)")
sep("=")

# ── Kinetics ──────────────────────────────────────────────────────────────────
print()
print("  ── Kinetic Parameters ──────────────────────────────────")
print("  (k0 units: m6/(kmol·kg_cat·s)  |  Ea units: J/mol)")
k0_pbr = get_float("k0  pre-exponential factor", min_val=0, default=2.8e4)
Ea_pbr = get_float("Ea  activation energy [J/mol]", min_val=0, default=104174.0)

# ── Operating conditions ──────────────────────────────────────────────────────
print()
print("  ── Operating Conditions ────────────────────────────────")
P_bar      = get_float("P    pressure [bar]", min_val=0, default=35.0)
T_inlet_C  = get_float("T_inlet  inlet temperature for CA0 [C]", default=325.0)

# ── Catalyst & target ─────────────────────────────────────────────────────────
print()
print("  ── Catalyst & Target ───────────────────────────────────")
rho_bulk   = get_float("rho_bulk  catalyst bulk density [kg/m3]", min_val=0, default=1150.0)
X_target   = get_float("X_target  target conversion [0-1]", min_val=0.001, max_val=0.9999, default=X_design)
W_max_kg   = get_float("W_max     max catalyst weight to simulate [kg]", min_val=1, default=200000.0)

# ── Temperatures ──────────────────────────────────────────────────────────────
print()
print("  ── Design Temperature ───────────────────────────────────")
T_design_C = get_float("T_design  selected design temperature [C]", default=355.0)

# =============================================================================
# DERIVED PARAMETERS  (auto-calculated from Memo 1 outputs)
# =============================================================================

R_gas    = 8.314
Rg       = 8314.0
P_pa     = P_bar * 100000.0
T_inK    = T_inlet_C + 273.15
CA0      = y_A_val * P_pa / (Rg * T_inK)

T_list_C = [T_design_C - 20, T_design_C - 10, T_design_C,
            T_design_C + 10, T_design_C + 20]
T_surf_min = T_design_C - 40
T_surf_max = T_design_C + 40
T_list_K = [T + 273.15 for T in T_list_C]
colors   = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f']

print()
sep("=")
print(f"  MEMO 2 PARAMETERS  |  {main_product} Production")
sep("=")
print(f"  From Memo 1:")
print(f"    FA0      = {FA0_calc:.6f} kmol/s")
print(f"    thetaB   = {thetaB:.5f}")
print(f"    epsilon  = {eps_val:.4f}")
print(f"  Computed:")
print(f"    CA0      = {CA0:.5f} kmol/m3  (at {P_bar} bar, {T_inlet_C} C)")
print(f"  From user:")
print(f"    Ea       = {Ea_pbr/1000:.3f} kJ/mol")
print(f"    k0       = {k0_pbr:.4e} m6/(kmol·kg_cat·s)")
print(f"    rho_bulk = {rho_bulk} kg/m3")
print(f"    X_target = {X_target}")

# =============================================================================
# ODE
# =============================================================================

def k_arrhenius(T_K):
    return k0_pbr * np.exp(-Ea_pbr / (R_gas * T_K))

def dXdW(W, X, T_K):
    d  = 1.0 + eps_val * X[0]
    CA = max(CA0 * (1.0 - X[0])      / d, 0.0)
    CB = max(CA0 * (thetaB - X[0])   / d, 0.0)
    return [k_arrhenius(T_K) * CA * CB / FA0_calc]

# =============================================================================
# SECTION 1 — FIVE TEMPERATURES
# =============================================================================

W_eval       = np.linspace(0, W_max_kg, 3000)
results      = {}
summary_rows = []

print()
sep()
print("  SECTION 1 — RESULTS AT FIVE TEMPERATURES")
sep()
print(f"  {'T (C)':>8}  {'k(T)':>12}  {'W_target (kg)':>15}  {'V (m3)':>10}")
print("  " + "─"*50)

for T_C, T_K in zip(T_list_C, T_list_K):
    sol = solve_ivp(
        fun    = lambda W, X: dXdW(W, X, T_K),
        t_span = (0.0, W_max_kg),
        y0     = [0.0],
        t_eval = W_eval,
        method = 'RK45', rtol=1e-8, atol=1e-10
    )
    W_arr = sol.t
    X_arr = np.clip(sol.y[0], 0.0, 1.0)
    idx = np.searchsorted(X_arr, X_target)
    if idx > 0 and idx < len(W_arr):
        w1, w2 = W_arr[idx-1], W_arr[idx]
        x1, x2 = X_arr[idx-1], X_arr[idx]
        W_tgt  = w1 + (X_target - x1) * (w2 - w1) / (x2 - x1)
    else:
        W_tgt = W_arr[-1]
    V_tgt = W_tgt / rho_bulk
    k_val = k_arrhenius(T_K)
    results[T_C] = {'W': W_arr, 'X': X_arr, 'W_target': W_tgt, 'V_target': V_tgt}
    print(f"  {T_C:>8}  {k_val:>12.4e}  {W_tgt:>15,.0f}  {V_tgt:>10.2f}")
    summary_rows.append({
        'T (C)': T_C, 'T (K)': round(T_K, 2),
        'k': round(k_val, 8),
        'W_target (kg)': round(W_tgt, 0),
        'V_reactor (m3)': round(V_tgt, 3),
    })

print("  " + "─"*50)
T_des_closest = min(T_list_C, key=lambda t: abs(t - T_design_C))
W_design      = results[T_des_closest]['W_target']
V_design      = results[T_des_closest]['V_target']
print(f"\n  Design temperature : {T_des_closest} C")
print(f"  W at X={X_target}      : {W_design:,.0f} kg")
print(f"  Reactor volume    : {V_design:.2f} m3")

# =============================================================================
# SECTION 1 PLOT
# =============================================================================

fig, ax = plt.subplots(figsize=(11, 6.5))
for i, T_C in enumerate(T_list_C):
    r = results[T_C]
    ax.plot(r['W']/1000, r['X'], color=colors[i], lw=2.3, label=f'T = {T_C} C')
    ax.plot(r['W_target']/1000, X_target, 'o', color=colors[i], markersize=9, zorder=5)
    ax.annotate(f"  {r['W_target']/1000:.1f} t",
                xy=(r['W_target']/1000, X_target),
                fontsize=8.5, color=colors[i], va='center')
ax.axhline(y=X_target, color='black', ls='--', lw=1.4, label=f'Target  X = {X_target:.2f}')
ax.set_xlabel("Catalyst Weight,  W  [tonnes]", fontsize=13)
ax.set_ylabel("Conversion,  X  [-]",           fontsize=13)
ax.set_title(
    f"Isothermal PBR Design — {main_product} Production\n"
    "Conversion vs Catalyst Weight at Five Temperatures",
    fontsize=14, fontweight='bold', pad=12)
ax.set_xlim(0, W_max_kg/1000)
ax.set_ylim(0, 1.05)
ax.set_yticks(np.arange(0, 1.1, 0.1))
ax.grid(True, alpha=0.3)
ax.legend(fontsize=11, loc='lower right')
plt.tight_layout()
plt.savefig("memo2_section1_XvsW.png", dpi=160, bbox_inches='tight')
plt.show()
plt.close()
print("\n  Plot saved -> memo2_section1_XvsW.png")

# =============================================================================
# SECTION 2 — 3D SURFACE
# =============================================================================

print()
sep()
print("  SECTION 2 — COMPUTING 3D SENSITIVITY SURFACE ...")
sep()

T_C_surf = np.linspace(T_surf_min, T_surf_max, 50)
T_K_surf = T_C_surf + 273.15
W_surf   = np.linspace(0, W_max_kg, 60)
X_grid   = np.zeros((len(T_K_surf), len(W_surf)))

for i, T_K in enumerate(T_K_surf):
    sol = solve_ivp(
        fun    = lambda W, X: dXdW(W, X, T_K),
        t_span = (0.0, W_surf[-1]),
        y0     = [0.0],
        t_eval = W_surf,
        method = 'RK45', rtol=1e-8, atol=1e-10
    )
    X_grid[i, :] = np.clip(sol.y[0], 0.0, 1.0)

print("  Surface computed.")

i_dp = np.argmin(np.abs(T_C_surf - T_design_C))
idx  = np.searchsorted(X_grid[i_dp, :], X_target)
if idx > 0 and idx < len(W_surf):
    w1, w2 = W_surf[idx-1], W_surf[idx]
    x1, x2 = X_grid[i_dp, idx-1], X_grid[i_dp, idx]
    W_dp   = w1 + (X_target - x1) * (w2 - w1) / (x2 - x1)
else:
    W_dp = W_surf[-1]

W_mesh, T_mesh = np.meshgrid(W_surf/1000, T_C_surf)
X_mesh = X_grid

fig3d = plt.figure(figsize=(13, 8))
ax3d  = fig3d.add_subplot(111, projection='3d')
surf3d = ax3d.plot_surface(W_mesh, T_mesh, X_mesh,
                            cmap='plasma', alpha=0.88, linewidth=0, antialiased=True)
cbar = fig3d.colorbar(surf3d, ax=ax3d, shrink=0.45, aspect=12, pad=0.08)
cbar.set_label("Conversion  X  [-]", fontsize=11)

W_pl, T_pl = np.meshgrid([W_surf[0]/1000, W_surf[-1]/1000],
                          [T_C_surf[0],    T_C_surf[-1]])
ax3d.plot_surface(W_pl, T_pl, np.full_like(W_pl, X_target), color='cyan', alpha=0.18)
ax3d.plot_wireframe(W_pl, T_pl, np.full_like(W_pl, X_target), color='cyan', lw=0.8, alpha=0.5)

ax3d.scatter(W_dp/1000, T_design_C, X_target, color='red', s=130, zorder=10)
ax3d.text(W_dp/1000+2, T_design_C+3, X_target+0.02,
          f"  T={T_design_C:.0f}C\n  W={W_dp/1000:.1f} t\n  X={X_target}",
          fontsize=9, color='red', fontweight='bold')

ax3d.contourf(W_mesh, T_mesh, X_mesh, zdir='z', offset=-0.02,
              levels=15, cmap='plasma', alpha=0.22)
ax3d.set_xlabel("Catalyst Weight  W  [t]", fontsize=11, labelpad=10)
ax3d.set_ylabel("Temperature  T  [C]",     fontsize=11, labelpad=10)
ax3d.set_zlabel("Conversion  X  [-]",      fontsize=11, labelpad=8)
ax3d.set_title(
    f"3D Sensitivity — {main_product} Production (Isothermal PBR)\n"
    "Conversion as a Function of Temperature & Catalyst Weight",
    fontsize=13, fontweight='bold', pad=15)
ax3d.set_zlim(-0.02, 1.06)
ax3d.set_zticks(np.arange(0, 1.1, 0.1))
ax3d.view_init(elev=25, azim=-55)
fig3d.text(0.5, 0.01,
    f"Figure: Conversion surface — {main_product} PBR.  "
    f"T: {T_C_surf[0]:.0f}-{T_C_surf[-1]:.0f} C.  W: 0-{W_surf[-1]/1000:.0f} t.  "
    f"Cyan = X={X_target} target.  Red = design point ({T_design_C:.0f}C, {W_dp/1000:.1f} t).",
    ha='center', fontsize=8, style='italic', color='#444')
plt.tight_layout()
plt.savefig("memo2_section2_3Dsurface.png", dpi=180, bbox_inches='tight')
plt.show()
plt.close()
print("  Plot saved -> memo2_section2_3Dsurface.png")

# =============================================================================
# CSV EXPORT (Memo 2)
# =============================================================================

with open("memo2_pbr_results.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow([f"MEMO 2 — ISOTHERMAL PBR DESIGN — {main_product}"])
    w.writerow(["Reaction", reaction_str.strip()])
    w.writerow(["FA0 (kmol/s)", round(FA0_calc, 6)])
    w.writerow(["CA0 (kmol/m3)", round(CA0, 5)])
    w.writerow(["epsilon", round(eps_val, 4)])
    w.writerow(["thetaB", round(thetaB, 5)])
    w.writerow(["k0", k0_pbr])
    w.writerow(["Ea (J/mol)", Ea_pbr])
    w.writerow(["rho_bulk (kg/m3)", rho_bulk])
    w.writerow(["X_target", X_target])
    w.writerow([])
    w.writerow(["SECTION 1"])
    w.writerow(["T (C)", "T (K)", "k(T)", "W_target (kg)", "V_reactor (m3)"])
    for row in summary_rows:
        w.writerow(list(row.values()))
    w.writerow([])
    w.writerow(["SECTION 2: SURFACE DATA — X [-]"])
    w.writerow(["T\\W(t)"] + [f"{wi/1000:.1f}" for wi in W_surf])
    for i, T_C in enumerate(T_C_surf):
        w.writerow([f"{T_C:.1f}"] + [f"{X_grid[i,j]:.4f}" for j in range(len(W_surf))])

print("  CSV saved -> memo2_pbr_results.csv")


# =============================================================================
# ███╗   ███╗███████╗███╗   ███╗ ██████╗     ██████╗
# ████╗ ████║██╔════╝████╗ ████║██╔═══██╗        ██╔╝
# ██╔████╔██║█████╗  ██╔████╔██║██║   ██║        ██╔╝
# ██║╚██╔╝██║██╔══╝  ██║╚██╔╝██║██║   ██║       ██╔╝
# ██║ ╚═╝ ██║███████╗██║ ╚═╝ ██║╚██████╔╝       ██║
# PRESSURE DROP AND REACTOR CONFIGURATION
# =============================================================================

print()
sep("=")
print("   MEMO 2 + MEMO 3 COMPLETE — Continuing to Memo 3 ...")
sep("=")
print()

cont3 = input("  Continue to Memo 3 — Pressure Drop & Reactor Configuration? (y/n): ").strip().lower()
if cont3 != 'y':
    print()
    print("  Exiting after Memo 2. Goodbye!")
    exit()

# =============================================================================
# MEMO 3 — BRIDGE: MAP VARIABLE NAMES FROM MEMO 1+2
# =============================================================================
# Variables carried over automatically:
#   FA0_calc  → FA0        (total molar flow of limiting reagent)
#   k0_pbr    → k0         (pre-exponential factor)
#   Ea_pbr    → Ea         (activation energy)
#   eps_val   → eps        (epsilon = yA0 * delta)
#   R_gas     → R          (gas constant)
#   W_design  → W_total    (total catalyst weight from Memo 2 design)
#   V_design  → V_total    (total reactor volume from Memo 2 design)
#   MT_in     → mdot       (total mass flow rate)
#   CA0, thetaB, X_target, P_bar, T_design_C, T_list_C  → same names
# =============================================================================

FA0     = FA0_calc
k0      = k0_pbr
Ea      = Ea_pbr
eps     = eps_val
R       = R_gas
W_total = W_design
V_total = V_design
mdot    = MT_in    # total mass flow [kg/s]
# P0 already defined as P_pa in Memo 2; redefine for Memo 3 consistency
P0      = P_bar * 101325.0

# =============================================================================
# MEMO 3 — ADDITIONAL USER INPUTS (not needed in Memo 1+2)
# =============================================================================

print()
sep("=")
print("   MEMO 3 — PRESSURE DROP & REACTOR CONFIGURATION")
print("   CHPE4512 | Sultan Qaboos University | Group 03")
print("   Parameters from Memo 1+2 carried over automatically.")
print("   Press Enter to keep default values shown in [ ]")
sep("=")

print("\n── Fluid & Catalyst Properties (Ergun equation) ────────────")
rho0     = get_float("rho0   inlet gas density       [kg/m3]",  default=44.4216)
rho_c    = get_float("rho_c  catalyst particle density [kg/m3]", default=1150.0)
phi      = get_float("phi    bed void fraction        [-]",      default=0.5)
Dp       = get_float("Dp     particle diameter        [m]",      default=0.005)
mu       = get_float("mu     gas viscosity            [kg/(m·s)]", default=1.76e-5)

print("\n── Multi-tube Configuration ─────────────────────────────────")
nt_raw_opt = input("  nt     number of tubes (design) [800]: ").strip()
opt_nt = int(nt_raw_opt) if nt_raw_opt else 800
Dt_1in   = get_float("Dt     tube diameter             [m]",     default=0.0254)

# Derived Memo 3 parameters
rho_bulk = rho_c * (1 - phi)
T_K      = T_design_C + 273.15
k_T      = k0 * np.exp(-Ea / (R * T_K))
Ac_1in   = np.pi / 4 * Dt_1in**2
T5_list  = T_list_C

# Auto-generate nt lists around opt_nt with ±500 steps
nt_list1_inp = list(dict.fromkeys([max(100, opt_nt - 1500), max(200, opt_nt - 1000),
                                    max(300, opt_nt - 500),  opt_nt,
                                    opt_nt + 500,            opt_nt + 1000]))
nt_list2_inp = [max(100, opt_nt - 1000), max(100, opt_nt - 500),
                opt_nt,  opt_nt + 500,   opt_nt + 1000]

print()
sep("=")
print(f"  MEMO 3 PARAMETERS CONFIRMED")
sep("=")
print(f"  Carried from Memo 1+2:")
print(f"    FA0      = {FA0:.6f} kmol/s")
print(f"    CA0      = {CA0:.5f} kmol/m3")
print(f"    W_total  = {W_total:,.0f} kg   V_total = {V_total:.2f} m3")
print(f"    k0       = {k0:.4e}   Ea = {Ea/1000:.3f} kJ/mol")
print(f"    eps      = {eps:.4f}   thetaB = {thetaB:.5f}")
print(f"  New for Memo 3:")
print(f"    rho0     = {rho0} kg/m3    rho_bulk = {rho_bulk} kg/m3")
print(f"    phi      = {phi}          Dp = {Dp*1000:.1f} mm")
print(f"    mu       = {mu:.2e} kg/(m·s)")
print(f"    mdot     = {mdot:.5f} kg/s")
print(f"    opt_nt   = {opt_nt}       Dt_1in = {Dt_1in*100:.2f} cm")
print(f"  Auto-generated:")
print(f"    Temperatures   : {T5_list}")
print(f"    Surface range  : {T_surf_min} – {T_surf_max} °C")
print(f"    nt_list Task1  : {nt_list1_inp}")
print(f"    nt_list Task2  : {nt_list2_inp}")



# =============================================================================
# CORE FUNCTIONS
# =============================================================================

def reactor_geometry(V, LD_ratio, n_tubes=1):
    """
    Compute geometry for given volume, L/D ratio and number of tubes.
    V = n_tubes * (pi/4) * D^2 * L   where L = LD_ratio * D
    Returns: D [m], L [m], Ac [m²]  (per tube)
    """
    D  = (4 * V / (n_tubes * np.pi * LD_ratio)) ** (1/3)
    L  = LD_ratio * D
    Ac = np.pi / 4 * D**2
    return D, L, Ac


def ergun_parameters(G, Dp_p, mu_g, phi_b, rho0_g, rho_bulk_b, P0_in, Ac_tube):
    """
    Compute Ergun pressure drop parameters.
    beta0 [Pa/m]: pressure gradient at inlet conditions
    alpha [1/kg]: Fogler weight-based pressure parameter
    
    Ergun equation (Fogler Eq. 5-24):
    -dP/dz = G(1-phi)/(rho0·Dp·phi³) × [150(1-phi)mu/Dp + 1.75G]
    
    Weight basis (Fogler Eq. 5-28):
    dy/dW = -alpha/(2y) × (FT/FT0)   where y = P/P0
    alpha  = 2·beta0 / (P0·rho_bulk·Ac)
    """
    beta0 = (G * (1 - phi_b)) / (rho0_g * Dp_p * phi_b**3) * (
             150 * (1 - phi_b) * mu_g / Dp_p + 1.75 * G)
    alpha = 2 * beta0 / (P0_in * rho_bulk_b * Ac_tube)
    return beta0, alpha


def solve_pbr(W_max, FA0_t, alpha, k_val=None, CA0_in=None,
              thetaB_in=None, eps_in=None, n_pts=2000):
    """
    Solve coupled mole balance + Ergun ODEs for isothermal PBR.

    ODEs:
      dX/dW = k · CA · CB / FA0
      dy/dW = -alpha/(2y) · (1 + eps·X)     [isothermal, Fogler Eq.5-28]

    Concentrations include pressure correction:
      CA = CA0·(1-X)/(1+eps·X)·y
      CB = CA0·(tB-X)/(1+eps·X)·y

    Returns W_arr, X_arr, y_arr
    """
    if k_val   is None: k_val   = k_T
    if CA0_in  is None: CA0_in  = CA0
    if thetaB_in is None: thetaB_in = thetaB
    if eps_in  is None: eps_in  = eps

    def odes(W, state):
        X, y = state
        y = max(y, 1e-8)
        X = min(X, 0.9999)
        d  = 1.0 + eps_in * X
        if abs(d) < 1e-10: d = 1e-10
        CA = max(CA0_in * (1.0 - X) / d * y, 0.0)
        CB = max(CA0_in * (thetaB_in - X) / d * y, 0.0)
        rA = k_val * CA * CB
        dXdW = rA / FA0_t
        dydW = -alpha / (2.0 * y) * (1.0 + eps_in * X)
        return [dXdW, dydW]

    W_eval = np.linspace(0, W_max, n_pts)
    try:
        sol = solve_ivp(
            odes, (0, W_max), [0.0, 1.0],
            t_eval=W_eval, method='RK45',
            rtol=1e-7, atol=1e-9,
            dense_output=False
        )
        W_arr = sol.t
        X_arr = np.clip(sol.y[0], 0.0, 1.0)
        y_arr = np.clip(sol.y[1], 0.0, 1.0)
    except Exception:
        W_arr = W_eval
        X_arr = np.zeros_like(W_eval)
        y_arr = np.zeros_like(W_eval)
    return W_arr, X_arr, y_arr


def find_W_at_X(W_arr, X_arr, X_tgt):
    """Interpolate W at X = X_tgt."""
    idx = np.searchsorted(X_arr, X_tgt)
    if idx > 0 and idx < len(W_arr):
        w1, w2 = W_arr[idx-1], W_arr[idx]
        x1, x2 = X_arr[idx-1], X_arr[idx]
        return w1 + (X_tgt - x1) * (w2 - w1) / (x2 - x1)
    return W_arr[-1]

# PART 1 — SINGLE PIPE REACTOR OPTIMIZATION
# =============================================================================

print("\n" + "=" * 68)
print("  PART 1 — SINGLE PIPE REACTOR OPTIMIZATION")
print("=" * 68)
print("\n  Hint: Start L/D=5, check y>0.9 and D<8m")
print(f"\n  {'L/D':>5}  {'D (m)':>8}  {'L (m)':>8}  {'G (kg/m²s)':>11}"
      f"  {'beta0':>10}  {'alpha':>11}  {'y_out':>8}  {'ΔP (Pa)':>10}  {'ΔP/P0 %':>8}  OK?")
print("  " + "─" * 96)

LD_try   = [5, 4, 3, 2, 1, 0.5]
res_p1   = []

for LD in LD_try:
    D, L, Ac      = reactor_geometry(V_total, LD, n_tubes=1)
    G             = mdot / Ac
    beta0, alpha  = ergun_parameters(G, Dp, mu, phi, rho0, rho_bulk, P0, Ac)
    _, X_a, y_a   = solve_pbr(W_total, FA0, alpha)
    y_out         = y_a[-1]
    dP            = (1 - y_out) * P0
    ok            = "✔" if (y_out >= 0.9 and D <= 8.0) else "✗"
    print(f"  {LD:>5.1f}  {D:>8.3f}  {L:>8.3f}  {G:>11.4f}  "
          f"{beta0:>10.3f}  {alpha:>11.4e}  {y_out:>8.5f}  "
          f"{dP:>10.1f}  {dP/P0*100:>8.4f}  {ok}")
    res_p1.append(dict(LD=LD, D=D, L=L, Ac=Ac, G=G,
                       beta0=beta0, alpha=alpha,
                       y_out=y_out, dP=dP, X_out=X_a[-1]))

# Select design point (y>=0.9, D<=8m)
r_des    = next((r for r in res_p1 if r['y_out'] >= 0.9 and r['D'] <= 8.0), res_p1[0])
LD_des   = r_des['LD']
D_des    = r_des['D']
L_des    = r_des['L']
Ac_des   = r_des['Ac']
alpha_des= r_des['alpha']

print(f"\n  --> Selected: L/D={LD_des}, D={D_des:.3f} m, L={L_des:.3f} m")
print(f"      y_out = {r_des['y_out']:.6f}   ΔP = {r_des['dP']:.2f} Pa"
      f"  ({r_des['dP']/P0*100:.4f}% of P0)")

# Part 1 plot: X vs W for 5 temperatures
T5_C    = T5_list
colors5 = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f']

print("\n  Generating Part 1 plot ...")
fig1, ax1a = plt.subplots(figsize=(10, 6))

for i, T_C in enumerate(T5_C):
    k_i = k0 * np.exp(-Ea / (R * (T_C + 273.15)))
    W_i, X_i, y_i = solve_pbr(W_total, FA0, alpha_des, k_val=k_i)

    ax1a.plot(W_i/1000, X_i, color=colors5[i], lw=2.2, label=f'T = {T_C} °C')

    W_tgt = find_W_at_X(W_i, X_i, X_target)
    if W_tgt < W_total:
        ax1a.plot(W_tgt/1000, X_target, 'o', color=colors5[i], ms=8, zorder=5)

ax1a.axhline(X_target, color='black', ls='--', lw=1.3, label=f'Target X={X_target}')
ax1a.set_xlabel('Catalyst Weight  W  [tonnes]', fontsize=13)
ax1a.set_ylabel('Conversion  X  [-]', fontsize=13)
ax1a.set_title(f'Conversion vs Catalyst Weight (Single Pipe)\n'
               f'L/D={LD_des}, D={D_des:.2f} m, L={L_des:.2f} m',
               fontsize=13, fontweight='bold')
ax1a.set_ylim(0, 1.05)
ax1a.set_yticks(np.arange(0, 1.1, 0.1))
ax1a.tick_params(axis='both', labelsize=12)
ax1a.legend(fontsize=11, loc='lower right')
ax1a.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('memo3_part1_single_pipe.png', dpi=160, bbox_inches='tight')
plt.show()
plt.close()
print("  Saved: memo3_part1_single_pipe.png")

# ── Part 1 comparison plot: With ΔP vs Without ΔP at design temperature ───────
k_des = k0 * np.exp(-Ea / (R * T_K))

# With ΔP — Ergun (alpha from design L/D)
W_eval_c = np.linspace(0, W_total, 3000)
W_dp, X_dp, y_dp = solve_pbr(W_total, FA0, alpha_des, k_val=k_des)

# Without ΔP — ideal PBR (alpha = 0, y = 1 everywhere)
W_nd, X_nd, _ = solve_pbr(W_total, FA0, 0.0, k_val=k_des)

# Find W at X_target for each case
W99_dp = find_W_at_X(W_dp, X_dp, X_target)
W99_nd = find_W_at_X(W_nd, X_nd, X_target)
dX_loss = (X_nd[-1] - X_dp[-1]) * 100   # conversion lost due to ΔP [%]

fig_c, ax_c = plt.subplots(figsize=(10, 6))

ax_c.plot(W_dp/1000, X_dp*100, color='#e15759', lw=2.5, label='With ΔP  (Ergun equation)')
ax_c.plot(W_nd/1000, X_nd*100, color='#4e79a7', lw=2.5, ls='--', label='Without ΔP  (ideal PBR)')
ax_c.axhline(X_target*100, color='black', ls='--', lw=1.5, label=f'Target  X = {X_target*100:.0f}%')

# Shade the difference region
ax_c.fill_between(W_dp/1000, X_dp*100, X_nd*100,
                  color='#f28e2b', alpha=0.25,
                  label=f'ΔX = {dX_loss:.4f}%  (loss due to ΔP)')

ax_c.set_xlabel('Catalyst Weight  W  [×10³ kg]', fontsize=15)
ax_c.set_ylabel('Conversion  X  [%]',             fontsize=15)
ax_c.set_title(f'Conversion Comparison — With vs Without Pressure Drop\n'
               f'T = {T_design_C:.0f} °C  |  L/D = {LD_des}  |  D = {D_des:.2f} m  |  L = {L_des:.2f} m',
               fontsize=13, fontweight='bold')
ax_c.set_xlim(0, W_total/1000)
ax_c.set_ylim(0, 105)
ax_c.tick_params(axis='both', labelsize=13)
ax_c.legend(fontsize=11, loc='lower right')
ax_c.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('memo3_part1_comparison.png', dpi=160, bbox_inches='tight')
plt.show()
plt.close()
print("  Saved: memo3_part1_comparison.png")



print("\n" + "=" * 68)
print("  PART 2 — MULTI-TUBE CONFIGURATION ANALYSIS")
print("=" * 68)

# Dt_1in and Ac_1in already defined from user input above

# ── Task 1: ΔP vs tube length — fixed Dt=1inch, one curve per nt ─────────────
# Physics: Dt=1in FIXED → G = (mdot/nt)/Ac_1in changes with nt
# For each nt: integrate ΔP along tube from z=0 to z=L_max=V/(nt·Ac_1in)
# Different nt → different G → different ΔP/dz → DIFFERENT curves
print("\n  Task 1: ΔP vs Tube Length (1-inch tubes, fixed Dt, one curve per nt)...")

nt_list1   = nt_list1_inp
colors_t1  = ['#e15759','#f28e2b','#4e79a7','#76b7b2','#59a14f','#b07aa1','#ff9da7','#9c755f'][:len(nt_list1)]
dP_curves  = {}   # dP_curves[nt] = (z_arr, dP_arr)

print(f"\n  {'nt':>6}  {'G (kg/m²s)':>12}  {'L_max (m)':>11}  {'ΔP_total (atm)':>16}")
print("  " + "─"*50)

for nt in nt_list1:
    G_tube   = (mdot / nt) / Ac_1in          # mass flux per tube [kg/(m²·s)]
    W_tube   = W_total / nt                   # catalyst weight per tube [kg]
    FA0_tube = FA0 / nt
    L_max    = V_total / (nt * Ac_1in)        # full tube length [m]

    _, alpha_t = ergun_parameters(G_tube, Dp, mu, phi, rho0, rho_bulk, P0, Ac_1in)

    # Solve ODE over W from 0 to W_tube, record y(W) profile
    n_pts  = 600
    W_eval = np.linspace(0, W_tube, n_pts)
    _, _, y_arr = solve_pbr(W_tube, FA0_tube, alpha_t, n_pts=n_pts)

    # Convert W → axial position z [m]:  W = rho_bulk * Ac_1in * z
    z_arr  = W_eval / (rho_bulk * Ac_1in)
    dP_arr = (1 - y_arr) * P0 / 101325        # [atm]

    dP_curves[nt] = (z_arr, dP_arr)
    print(f"  {nt:>6}  {G_tube:>12.3f}  {L_max:>11.2f}  {dP_arr[-1]:>16.4f}")

# Baseline uses user-supplied opt_nt
opt_L  = V_total / (opt_nt * Ac_1in)
G_opt  = (mdot / opt_nt) / Ac_1in
_, alpha_opt = ergun_parameters(G_opt, Dp, mu, phi, rho0, rho_bulk, P0, Ac_1in)
_, _, y_opt  = solve_pbr(W_total/opt_nt, FA0/opt_nt, alpha_opt, n_pts=500)
opt_dP = (1 - y_opt[-1]) * P0
print(f"\n  Baseline (1-inch, {opt_nt} tubes): L={opt_L:.2f} m, ΔP={opt_dP/101325:.4f} atm")

# ── Task 2: ΔP vs tube diameter (fixed nt, L adjusts, V constant) ─────────────
print("\n  Task 2: ΔP vs Tube Diameter (fixed nt, L adjusts, V constant)...")

nt_list2  = nt_list2_inp
Dt_range2 = np.linspace(0.019, 0.060, 60)
colors_t2 = ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#b07aa1','#ff9da7'][:len(nt_list2)]
dP_t2     = {nt: [] for nt in nt_list2}
L_t2      = {nt: [] for nt in nt_list2}

for nt in nt_list2:
    W_tube   = W_total / nt
    FA0_tube = FA0 / nt
    mdot_tube= mdot / nt
    for Dt in Dt_range2:
        Ac_t  = np.pi / 4 * Dt**2
        L_t   = V_total / (nt * Ac_t)
        G_t   = mdot_tube / Ac_t
        _, alpha_t = ergun_parameters(G_t, Dp, mu, phi, rho0, rho_bulk, P0, Ac_t)
        _, _, y_t  = solve_pbr(W_tube, FA0_tube, alpha_t, n_pts=400)
        dP_t2[nt].append(min((1 - y_t[-1]) * P0, 100*101325))
        L_t2[nt].append(L_t)

# ── Task 3: ΔP vs L, two particle sizes ──────────────────────────────────────
print("\n  Task 3: ΔP vs L — Dp=5mm vs Dp=10mm (1-inch tubes)...")

L_range  = np.linspace(5, 110, 70)
Dp_vals  = [Dp, Dp*2, Dp*3]   # base from user input; ×2 and ×3
dP_t3    = {dp: [] for dp in Dp_vals}

for dp in Dp_vals:
    for L_t in L_range:
        nt        = max(1, round(V_total / (Ac_1in * L_t)))
        FA0_t     = FA0 / nt
        mdot_t    = mdot / nt
        G_t       = mdot_t / Ac_1in
        W_t       = W_total / nt
        _, alpha_t = ergun_parameters(G_t, dp, mu, phi, rho0, rho_bulk, P0, Ac_1in)
        _, _, y_t  = solve_pbr(W_t, FA0_t, alpha_t, n_pts=400)
        dP_t3[dp].append((1 - y_t[-1]) * P0)

# ── Part 2 plots — 3 separate figures ────────────────────────────────────────
print("\n  Generating Part 2 plots ...")

dP_limit = 0.1 * P0 / 101325   # 3.5 atm

# ── Figure 1: Task 1 ──────────────────────────────────────────────────────────
fig_t1, ax_t1 = plt.subplots(figsize=(12, 6))
for k, nt in enumerate(nt_list1):
    z_arr, dP_arr = dP_curves[nt]
    ax_t1.plot(z_arr, dP_arr, color=colors_t1[k], lw=2.2,
               label=f'nt = {nt:,}  (L={z_arr[-1]:.0f} m, G={mdot/(nt*Ac_1in):.2f} kg/m²s)')
ax_t1.axhline(dP_limit, color='red', ls='--', lw=2.0,
              label=f'ΔP limit = {dP_limit:.1f} atm (10% P0)')
ax_t1.set_xlim(0, 150)
ax_t1.set_ylim(0, 15)
ax_t1.set_xlabel('Tube Length  L  [m]', fontsize=16)
ax_t1.set_ylabel('Pressure Drop  ΔP  [atm]', fontsize=16)
ax_t1.set_title('ΔP vs Tube Length  (1-inch tubes, Dt fixed)\n'
                'Each curve = fixed nt → different G → different ΔP profile',
                fontsize=14, fontweight='bold')
ax_t1.tick_params(axis='both', labelsize=13)
ax_t1.legend(fontsize=10, ncol=2, loc='upper left')
ax_t1.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('memo3_part2_task1.png', dpi=160, bbox_inches='tight')
plt.show(); plt.close()
print("  Saved: memo3_part2_task1.png")

# ── Figure 2: Task 2 ──────────────────────────────────────────────────────────
fig_t2, ax_t2 = plt.subplots(figsize=(10, 6))
for j, nt in enumerate(nt_list2):
    dP_arr = np.array(dP_t2[nt]) / 101325
    ax_t2.plot(Dt_range2*100, dP_arr, color=colors_t2[j], lw=2.2,
               label=f'nt = {nt:,}')
ax_t2.axhline(dP_limit, color='red', ls='--', lw=1.5, label=f'ΔP limit = {dP_limit:.1f} atm')
ax_t2.axvline(Dt_1in*100, color='gray', ls=':', lw=1.5, label=f'1-inch = {Dt_1in*100:.2f} cm')
ax_t2.set_xlim(Dt_range2[0]*100, Dt_range2[-1]*100)
ax_t2.set_ylim(0, 10)
ax_t2.set_xlabel('Tube Diameter  Dt  [cm]', fontsize=16)
ax_t2.set_ylabel('Pressure Drop  ΔP  [atm]', fontsize=16)
ax_t2.set_title('ΔP vs Tube Diameter\n'
                '(fixed nt, V & W constant, L & G adjust with Dt)',
                fontsize=14, fontweight='bold')
ax_t2.tick_params(axis='both', labelsize=13)
ax_t2.legend(fontsize=10, loc='upper right')
ax_t2.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('memo3_part2_task2.png', dpi=160, bbox_inches='tight')
plt.show(); plt.close()
print("  Saved: memo3_part2_task2.png")

# ── Figure 3: Task 3 ──────────────────────────────────────────────────────────
fig_t3, ax_t3 = plt.subplots(figsize=(10, 6))
clrs_t3 = ['#e15759', '#4e79a7', '#59a14f']
lbls_t3 = [f'Dp = {Dp*1000:.0f} mm (original)', f'Dp = {Dp*2000:.0f} mm (2×)', f'Dp = {Dp*3000:.0f} mm (3×)']
for dp, col, lbl in zip(Dp_vals, clrs_t3, lbls_t3):
    ax_t3.plot(L_range, np.array(dP_t3[dp])/101325, color=col, lw=2.2, label=lbl)
ax_t3.axhline(dP_limit, color='black', ls='--', lw=1.5, label=f'ΔP limit = {dP_limit:.1f} atm')
ax_t3.set_xlim(L_range[0], L_range[-1])
ax_t3.set_ylim(0, 10)
ax_t3.set_xlabel('Tube Length  L  [m]', fontsize=16)
ax_t3.set_ylabel('Pressure Drop  ΔP  [atm]', fontsize=16)
ax_t3.set_title('ΔP vs L — Particle Size Effect\n'
                '(1-inch tubes, nt = V/(Ac·L), V constant)',
                fontsize=14, fontweight='bold')
ax_t3.tick_params(axis='both', labelsize=13)
ax_t3.legend(fontsize=11)
ax_t3.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('memo3_part2_task3.png', dpi=160, bbox_inches='tight')
plt.show(); plt.close()
print("  Saved: memo3_part2_task3.png")



# =============================================================================
# PART 3 — SENSITIVITY ANALYSIS
# =============================================================================

print("\n" + "=" * 68)
print("  PART 3 — SENSITIVITY ANALYSIS")
print("=" * 68)

# Baseline: opt_nt tubes, 1-inch
FA0_base  = FA0 / opt_nt
mdot_base = mdot / opt_nt
G_base    = mdot_base / Ac_1in
W_base    = W_total / opt_nt
_, alpha_base = ergun_parameters(G_base, Dp, mu, phi, rho0, rho_bulk, P0, Ac_1in)

print(f"\n  Baseline: nt={opt_nt}, Dt=1\", G={G_base:.4f} kg/m²s, alpha={alpha_base:.4e}")

fig_s1, ax_s1 = plt.subplots(figsize=(10, 6))

# S1: Varying inlet pressure P0
P0_range = np.linspace(20, 50, 35) * 101325
dP_s1 = []
for P0_i in P0_range:
    rho0_i = rho0 * (P0_i / P0)
    _, al_i = ergun_parameters(G_base, Dp, mu, phi, rho0_i, rho_bulk, P0_i, Ac_1in)
    _, _, yi = solve_pbr(W_base, FA0_base, al_i, n_pts=300)
    dP_s1.append((1 - yi[-1]) * P0_i)

ax_s1.plot(P0_range/101325, np.array(dP_s1)/101325, 'b-o', ms=5, lw=2.2)
ax_s1.axvline(P0/101325, color='green', ls='--', lw=1.8, label=f'Design P0 = {P0/101325:.0f} atm')
ax_s1.set_xlabel('Inlet Pressure  P0  [atm]', fontsize=15)
ax_s1.set_ylabel('Pressure Drop  ΔP  [atm]', fontsize=15)
ax_s1.set_title('Effect of Inlet Pressure on ΔP', fontsize=14, fontweight='bold')
ax_s1.tick_params(axis='both', labelsize=13)
ax_s1.legend(fontsize=11); ax_s1.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('memo3_part3_s1.png', dpi=160, bbox_inches='tight')
plt.show(); plt.close()
print("  Saved: memo3_part3_s1.png")

# S2: Varying particle diameter Dp
Dp_range = np.linspace(1, 20, 40) * 1e-3
dP_s2 = []
for dp_i in Dp_range:
    _, al_i = ergun_parameters(G_base, dp_i, mu, phi, rho0, rho_bulk, P0, Ac_1in)
    _, _, yi = solve_pbr(W_base, FA0_base, al_i, n_pts=300)
    dP_s2.append((1 - yi[-1]) * P0)

fig_s2, ax_s2 = plt.subplots(figsize=(10, 6))
ax_s2.plot(Dp_range*1000, np.array(dP_s2)/101325, 'r-o', ms=5, lw=2.2)
ax_s2.axvline(Dp*1000,   color='green',  ls='--', lw=1.8, label=f'Design Dp = {Dp*1000:.0f} mm')
ax_s2.axvline(Dp*2*1000, color='orange', ls='--', lw=1.8, label=f'2×Dp = {Dp*2*1000:.0f} mm')
ax_s2.axhline(0.1*P0/101325, color='red', ls=':', lw=1.5, label='10% P0 limit')
ax_s2.set_xlabel('Particle Diameter  Dp  [mm]', fontsize=15)
ax_s2.set_ylabel('Pressure Drop  ΔP  [atm]', fontsize=15)
ax_s2.set_title('Effect of Particle Size on ΔP', fontsize=14, fontweight='bold')
ax_s2.tick_params(axis='both', labelsize=13)
ax_s2.legend(fontsize=11); ax_s2.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('memo3_part3_s2.png', dpi=160, bbox_inches='tight')
plt.show(); plt.close()
print("  Saved: memo3_part3_s2.png")

# S3: Varying void fraction phi
phi_range = np.linspace(0.3, 0.7, 40)
dP_s3 = []
for phi_i in phi_range:
    rb_i = rho_c * (1 - phi_i)
    _, al_i = ergun_parameters(G_base, Dp, mu, phi_i, rho0, rb_i, P0, Ac_1in)
    _, _, yi = solve_pbr(W_base, FA0_base, al_i, n_pts=300)
    dP_s3.append((1 - yi[-1]) * P0)

fig_s3, ax_s3 = plt.subplots(figsize=(10, 6))
ax_s3.plot(phi_range, np.array(dP_s3)/101325, 'g-o', ms=5, lw=2.2)
ax_s3.axvline(phi, color='green', ls='--', lw=1.8, label=f'Design phi = {phi}')
ax_s3.axhline(0.1*P0/101325, color='red', ls=':', lw=1.5, label='10% P0 limit')
ax_s3.set_xlabel('Void Fraction  phi  [-]', fontsize=15)
ax_s3.set_ylabel('Pressure Drop  ΔP  [atm]', fontsize=15)
ax_s3.set_title('Effect of Void Fraction on ΔP', fontsize=14, fontweight='bold')
ax_s3.tick_params(axis='both', labelsize=13)
ax_s3.legend(fontsize=11); ax_s3.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('memo3_part3_s3.png', dpi=160, bbox_inches='tight')
plt.show(); plt.close()
print("  Saved: memo3_part3_s3.png")

# S4: Varying L/D ratio — single pipe, V constant
LD_range_s4 = np.linspace(1, 50, 60)
dP_s4 = []; D_s4 = []; G_s4 = []; y_s4 = []

for ld in LD_range_s4:
    D_i, L_i, Ac_i = reactor_geometry(V_total, ld, n_tubes=1)
    G_i = mdot / Ac_i
    _, al_i = ergun_parameters(G_i, Dp, mu, phi, rho0, rho_bulk, P0, Ac_i)
    _, _, yi = solve_pbr(W_total, FA0, al_i, n_pts=300)
    dP_s4.append((1 - yi[-1]) * P0)
    D_s4.append(D_i)
    G_s4.append(G_i)
    y_s4.append(yi[-1])

dP_s4 = np.array(dP_s4)
D_s4  = np.array(D_s4)

fig_s4, ax_s4 = plt.subplots(figsize=(10, 6))
ax_s4.semilogy(LD_range_s4, dP_s4/101325, 'm-', lw=2.5,
               label='ΔP  (single pipe, V constant)')
ax_s4.axhline(0.1*P0/101325, color='red', ls='--', lw=1.8,
              label=f'ΔP limit = {0.1*P0/101325:.1f} atm (10% P0)')
ax_s4.axvline(LD_des, color='green', ls='--', lw=1.8,
              label=f'Design L/D = {LD_des}  (D = {D_des:.2f} m)')
ax_s4.set_xlabel('L/D Ratio  [-]', fontsize=16)
ax_s4.set_ylabel('Pressure Drop  ΔP  [atm]', fontsize=16)
ax_s4.set_title('ΔP vs L/D Ratio  (Single Pipe, V constant)\n'
                'Higher L/D → smaller D → higher G → higher ΔP',
                fontsize=14, fontweight='bold')
ax_s4.tick_params(axis='both', labelsize=13)
ax_s4.legend(fontsize=11, loc='upper left')
ax_s4.grid(True, alpha=0.3, which='both')
plt.tight_layout()
plt.savefig('memo3_part3_s4.png', dpi=160, bbox_inches='tight')
plt.show(); plt.close()
print("  Saved: memo3_part3_s4.png")




# =============================================================================
# PRINT SUMMARY
# =============================================================================

print("\n" + "=" * 68)
print("  DESIGN SUMMARY — MEMO 3")
print("=" * 68)
print(f"\n  PART 1 — Single Pipe:")
print(f"    L/D             : {LD_des}")
print(f"    Diameter D      : {D_des:.3f} m")
print(f"    Length L        : {L_des:.3f} m")
print(f"    G               : {r_des['G']:.4f} kg/(m²·s)")
print(f"    beta0           : {r_des['beta0']:.4f} Pa/m")
print(f"    alpha           : {alpha_des:.4e} kg⁻¹")
print(f"    y_exit          : {r_des['y_out']:.6f}")
print(f"    ΔP              : {r_des['dP']:.2f} Pa  ({r_des['dP']/P0*100:.5f}% of P0)")
print(f"    Comment: Very low ΔP for single large pipe — constraint is easily met")

print(f"\n  PART 2 — Multi-Tube (1-inch, Dt={Dt_1in*100:.2f} cm):")
print(f"    Minimum tubes   : {opt_nt}  (for y ≥ 0.9)")
print(f"    Tube length     : {opt_L:.3f} m")
print(f"    ΔP at min tubes : {opt_dP:,.0f} Pa  ({opt_dP/P0*100:.3f}% of P0)")
print(f"    Tubes at L_des  : {round(V_total/(Ac_1in*L_des)):,}")

print(f"\n  Conversion at design (T=355°C, with ΔP):")
_, X_fin, y_fin = solve_pbr(W_base, FA0_base, alpha_base)
print(f"    X_exit  = {X_fin[-1]:.5f}")
print(f"    y_exit  = {y_fin[-1]:.5f}")
print(f"    ΔP      = {(1-y_fin[-1])*P0:,.0f} Pa")

print("\n" + "=" * 68)
print("  ALL OUTPUTS COMPLETE")
print("=" * 68)


# =============================================================================
# CSV EXPORT
# =============================================================================

with open("memo3_results.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["MEMO 3 — PRESSURE DROP & REACTOR CONFIGURATION"])
    w.writerow(["Product: Cumene | CHPE4512 | Group 03"])
    w.writerow([])

    w.writerow(["PART 1 — Single Pipe Design"])
    w.writerow(["L/D","D (m)","L (m)","G (kg/m2s)",
                "beta0 (Pa/m)","alpha (1/kg)","y_out","dP (Pa)","dP/P0"])
    for r in res_p1:
        w.writerow([r['LD'], round(r['D'],4), round(r['L'],4),
                    round(r['G'],5), round(r['beta0'],4),
                    f"{r['alpha']:.4e}", round(r['y_out'],6),
                    round(r['dP'],2), round(r['dP']/P0,6)])

    w.writerow([])
    w.writerow(["PART 2 Task 1 — ΔP vs Tube Length (1-inch, fixed Dt, per nt)"])
    for nt in nt_list1:
        z_arr, dP_arr = dP_curves[nt]
        w.writerow([f"nt={nt}", f"G={mdot/(nt*Ac_1in):.3f} kg/m2s", f"L_max={z_arr[-1]:.2f} m"])
        w.writerow(["z (m)", "dP (atm)"])
        for i in range(len(z_arr)):
            w.writerow([round(z_arr[i],3), round(dP_arr[i],5)])

    w.writerow([])
    w.writerow(["PART 2 Task 2 — ΔP vs Tube Diameter (fixed nt, L adjusts, V const)"])
    for nt in nt_list2:
        w.writerow([f"nt={nt}"])
        w.writerow(["Dt (m)","Dt (cm)","L (m)","dP (Pa)","dP (atm)"])
        for i, dt in enumerate(Dt_range2):
            w.writerow([round(dt,4), round(dt*100,3), round(L_t2[nt][i],3),
                        round(dP_t2[nt][i],1), round(dP_t2[nt][i]/101325,5)])

    w.writerow([])
    w.writerow(["PART 2 Task 3 — ΔP vs L, particle size comparison (1-inch)"])
    w.writerow(["L (m)","dP Dp=5mm (Pa)","dP Dp=5mm (atm)",
                "dP Dp=10mm (Pa)","dP Dp=10mm (atm)"])
    for i, L_t in enumerate(L_range):
        w.writerow([round(L_t,2),
                    round(dP_t3[Dp][i],1), round(dP_t3[Dp][i]/101325,5),
                    round(dP_t3[Dp*2][i],1), round(dP_t3[Dp*2][i]/101325,5), round(dP_t3[Dp*3][i],1), round(dP_t3[Dp*3][i]/101325,5)])

print("\n  CSV saved: memo3_results.csv")

print()
sep("=")
print("  ALL DONE — MEMO 1 + MEMO 2 + MEMO 3 COMPLETE")
sep("=")
print()
