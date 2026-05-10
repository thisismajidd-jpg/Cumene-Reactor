# Cumene Reactor — Streamlit App

Interactive non-isothermal cumene reactor model. Wraps the calibrated solver
from `Codes/Cumene Reactor Final.py` (Memo 5) in a Streamlit UI with sliders
for `T_inlet`, `T_coolant`, `U`, and `W`.

## Run locally

```bash
pip install -r streamlit_app/requirements.txt
streamlit run streamlit_app/app.py
```

App opens at <http://localhost:8501>.

## Deploy to Streamlit Community Cloud (free)

1. Push this repo to GitHub.
2. Go to <https://share.streamlit.io>, sign in with GitHub.
3. Click **New app**, pick your repo + branch.
4. Set **Main file path** to `streamlit_app/app.py`.
5. Click **Deploy**. Done — public URL in ~2 min.

## What's inside

- **Profiles tab** — temperature, conversion, selectivity profiles + molar flows.
- **Selectivity matrix** — sweeps `T_inlet × T_coolant` (Memo 5 Table 1 / Fig. 3).
- **Reactor gain** — Froment stability map (Memo 5 Table 2 / Fig. 4).
- **Summary** — exit-state table + trajectory CSV download.

## Calibration

`A₁` and `A₂` are calibrated once per session against the Memo 5 targets
(X = 0.99, S = 0.929) at the baseline inlet temperature. Cached via
`@st.cache_data` so they don't re-run on every slider tick.
