# Quant Arcade verification

This directory contains the independent evidence for the logic review described in
[`VERIFICATION_PLAN.md`](../VERIFICATION_PLAN.md). The review is intentionally staged:
Stage 0 builds the harness and checks shared math; later stages review one game at a
time in the plan's risk order.

## Method

For each game, the shipped generator is the system under test. Its logic is exported
only through a browser-no-op CommonJS guard when that game reaches its review stage.
The Node harness then calls that real generator. Python is an independent
re-derivation of the theoretical mechanism, not a copy of the JavaScript source.

Probabilistic checks report at least 10,000 draws, empirical moments, and the
theoretical comparison. Deterministic checks use exact arithmetic where practical.
Edge cases cover RNG bounds, ties, zero denominators, and degenerate configurations.

## Layout

- `tasks/` — one review card per game.
- `node/shim.js` — browser-global shim and ordered core loading.
- `node/run_generator.js` — generic runner for an exported game generator.
- `python/common/mc.py` — inspectable Monte Carlo summaries and tolerances.
- `python/common/normal_checks.py` — Stage 0 cross-check against `scipy.stats.norm`.
- `browser_smoke.py` — Chromium smoke test for all 24 registered games.
- `requirements.txt` — Python packages used by the checks.

## Commands

From the repository root:

```text
python verification/python/common/normal_checks.py
node verification/node/run_generator.js js/games/NN-name.js EXPORTED_FN SEED N
python verification/browser_smoke.py  # with a local server on 127.0.0.1:8765
```

The game runner is dormant until the game under review has its additive export shim.
The staged review is complete only after the evidence checks, browser smoke test,
and final diff review pass. `app.js` and `index.html` are protected files; calibration
thresholds may be changed only when a corrected mechanic is accompanied by a recorded
recalibration method and reproducible output.
