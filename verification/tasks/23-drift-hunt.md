# 23 — Drift Hunt

## Claim to verify

The generated normal process and displayed z-score use the stated drift `mu`,
volatility `sigma`, and sample length.

## Current finding

The planned display-only formula fix was required. The displayed theoretical z is
now `mu * sqrt(n) / sigma`, so the formula remains correct if a future variant
uses non-unit volatility.

## Check

`verification/node/23_drift_hunt_check.js` generated 10,000 paths for each shipped
configuration plus a non-unit-sigma configuration. The Python check compared means
and variances to theory and directly checked the corrected z formula at three
parameter combinations.

## Expected outcome

🔧 verified after adding `/cfg.sigma` to the displayed theoretical z formula.
