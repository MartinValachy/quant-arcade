# 20 — Regime Shift

## Claim to verify

The pre/post regime process, changepoint indexing, and normal-noise model match the
displayed timeline and answer scoring.

## Current finding

The plan reports the tick/`tau` off-by-one convention as internally consistent.

## Check

Run at least 10,000 sequences per variant, compare regime means/variances and the
changepoint convention to an independent model, and test changepoints at both ends.

## Completed evidence — 2026-09-17

Status: ✅ clean. The actual round generator was exercised over 20,000 rounds per
variant. Changepoints stayed in the configured `[floor(.45L), floor(.72L))`
interval, volatility shifts matched the 40% Bernoulli model, and drift signs were
valid.

The exact convention is explicit and verified: increment `i = tau` is pre-change;
increment `i = tau + 1` is the first post-change observation. At a fixed generated
round, 20,000 pre/post normal increments matched the corresponding theoretical
means and variances, including both drift and volatility regimes.

Evidence commands:

```text
node verification/node/20_regime_shift_check.js
PYTHONPATH=verification python verification/python/tier2_stats/20_regime_shift_checks.py
```
