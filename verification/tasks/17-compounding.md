# 17 — Compounding Desk

## Claim to verify

The answer uses the stated compounding, discounting, or perpetuity convention for
the generated cash flows.

## Current finding

All 12 shipped families are correct. The perpetuity family is reachable, but its
singular `r = g` state is unreachable because the configured discount rates are
at least 4% and growth rates at most 3%; no defensive patch is needed.

## Check

`verification/node/17_compounding_check.js` generated 10,000 cases for each of
the 12 families. The Python check independently re-derived every displayed
formula and tolerance, including continuous compounding, CAGR, square-root-of-
time scaling, and recovery asymmetry. It also confirmed that zero rates, period
one, and `r = g` perpetuity states are outside the shipped RNG ranges.

## Expected outcome

✅ independent formulas and tolerances agree; singular perpetuity state documented
as unreachable.
