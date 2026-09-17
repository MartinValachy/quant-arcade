# 12 — Winner's Curse

## Claim to verify

The slider's bid/estimate score reflects expected value after selection and its
bounds include the true useful decision range.

## Current finding

The plan requests a Tier 1 review and a Monte Carlo estimate of how often the
slider bounds `[mySig - 3.2sd, mySig + 0.6sd]` exclude the true optimal bid.

## Check

Re-derive the conditional-value mechanism and score, run at least 10,000 trials,
quantify bound exclusion, and test zero/large signal and variance edges.

## Completed evidence — 2026-09-17

Status: ✅ mechanics verified; bounds limitation documented. The real round generator
and profit/scoring functions were checked over 20,000 rounds per variant. An
independent NumPy simulation of the same common-value, noisy-signal, cautious-rival
model reproduced the bound-exclusion rate.

For the explicit stress definition “hindsight-optimal integer bid under the realized
`V` and top rival bid,” the slider excluded a profitable optimum in:

- Standard: 10.61% of profitable-optimum rounds; 7.33% upper-bound and 3.28%
  lower-bound exclusions; mean forgone profit 0.42.
- Hard: 10.81%; 8.90% upper-bound and 1.91% lower-bound exclusions; mean forgone
  profit 0.67.

The slider interval was always valid and the profit/scoring formula matched. This is
a product-design limitation, not a silent mechanics correction. The plan explicitly
allows quantifying it without changing the bounds; widening them would require a
separate game-design and calibration decision.

Evidence commands:

```text
node verification/node/12_winners_curse_check.js
PYTHONPATH=verification python verification/python/tier1_pnl/12_winners_curse_checks.py
```
