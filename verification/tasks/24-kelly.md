# 24 — Kelly Sizing

## Claim to verify

Bankroll updates, Kelly fraction, trap filtering, and ruin/floor handling implement
the displayed sizing rule and PnL model.

## Current finding

The plan requests Tier 1 review and a Monte Carlo quantification of the interaction
between the mid-block floor-at-1 rule and ruin-at-25 behavior.

Additional finding: the rules text said “block of 8 identical bets,” while the
shipped configuration and implementation use `reps: 6`. This was a stale user-facing
mechanics description, not a scoring discrepancy.

## Check

Re-derive the Kelly fraction and bankroll transition, run at least 10,000 paths per
variant/policy, quantify floor/ruin edge frequencies, and test zero-edge and full-
Kelly boundaries.

## Completed evidence — 2026-09-17

Status: 🔧 verified, with the stale rules text corrected from 8 to 6 bets. The
actual six-bet block, Kelly fraction `f* = p − q/b`, per-bet floor at 1, and
post-block ruin threshold at 25 were independently re-derived.

Across 10,000 independent 50-block paths per variant and policy, Node and Python
agreed on the floor/ruin interaction. Representative Node results:

- Kelly policy: floor touched in 0.0002% of standard blocks and 0.0004% of hard
  blocks; ruin reached in 0.86% and 0.78% of paths respectively.
- Double-Kelly policy: floor touched in 33.56% standard and 25.31% hard blocks;
  every path eventually reached ruin.
- Full-fraction policy: floor touched in 90.21% standard and 94.73% hard blocks;
  every path eventually reached ruin.
- Zero-fraction policy: neither floor nor ruin was reached.

All generated bets were finite, negative-edge bets had non-positive Kelly size, and
the scoring terms matched the independent formula.

Evidence commands:

```text
node verification/node/24_kelly_check.js
PYTHONPATH=verification python verification/python/tier1_pnl/24_kelly_checks.py
```
