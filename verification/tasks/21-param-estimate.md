# 21 — The Estimator

## Claim to verify

The estimator and its standard-error/tolerance band are mathematically correct for
each generated distribution family.

## Current finding

The plan identifies mismatched `se` formulas for `tank` and `unif`; `sd` uses a
small-sample approximation that must be quantified rather than silently rewritten.

## Check

Re-derive MVUE estimators and exact sampling variances, run at least 10,000 draws per
family/configuration, compare empirical variance to the theoretical result, and
record the small-n `sd` approximation error.

## Completed evidence — 2026-09-17

Status: 🔧 fixed and quantified. The tank estimator now uses
`SE = sqrt((N+1)(N−k)/(k(k+2)))`, the exact variance of
`m(k+1)/k − 1` for a without-replacement sample. The uniform-bound estimator now
uses `SE = θ/sqrt(n(n+2))`, the exact variance of `M(n+1)/n` for `U[0,θ]`.

All six actual FAM families matched independent formulas over 10,000 cases each.
Independent Monte Carlo also matched tank and uniform theoretical SEs across
multiple `(N,k)` and `(θ,n)` configurations.

The normal sample-SD family retains its simple `σ/sqrt(2n)` approximation. For
`n=6…14`, independent exact chi-square calculations and 20,000-draw simulations
show it understates the exact finite-sample SE by 2.66% to 6.14%. This is recorded
as a known approximation, not silently rewritten.

Evidence commands:

```text
node verification/node/21_param_estimate_check.js
PYTHONPATH=verification python verification/python/tier2_stats/21_param_estimate_checks.py
```
