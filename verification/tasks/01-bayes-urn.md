# 01 — Bayesian Urn

## Claim to verify

The displayed posterior probability follows Bayes' rule for the selected urn,
prior, and observed draw sequence.

## Current finding

The plan reports the posterior core as correct. The distractor-filler loop still
needs a bounded retry guard as defensive hardening.

## Check

Re-derive the likelihood ratio exactly, generate at least 10,000 random urn/draw
paths independently in Python, and compare the posterior and answer options with
the shipped generator. Exercise equal priors, all-red/all-blue observations, and
the filler-loop bound.

## Completed evidence — 2026-09-17

Status: 🔧 hardening applied; posterior ✅. The posterior and prior-free likelihood
calculation were independently re-derived with exact `Fraction` arithmetic and
matched the real generator over 10,000 cases per variant to at most `3.33e-16`.
Four explicit edge cases covered equal/skewed priors and all-red/all-blue sequences.

The distractor filler loop is now bounded at 200 attempts and has a deterministic
fallback. A hostile deterministic RNG that repeatedly returned colliding candidates
still produced exactly four valid, distinct answer choices.

Evidence commands:

```text
node verification/node/01_bayes_urn_check.js
PYTHONPATH=verification python verification/python/tier2_stats/01_bayes_urn_checks.py
```
