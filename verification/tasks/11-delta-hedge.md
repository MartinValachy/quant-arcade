# 11 — Delta Hedge

## Claim to verify

The hedge answer neutralizes the generated portfolio beta within the stated
tolerance, and every random configuration is scorable.

## Current finding

The plan identifies a reachable division by zero when a short hedge has equal
weights: `netBeta` becomes `NaN` and the answer is unconditionally marked wrong.

## Check

Re-derive portfolio beta and the hedge target, run at least 10,000 generated
configurations per variant, force equal-weight short cases, and inspect tolerance
and sign handling.

## Completed evidence — 2026-09-17

Status: 🔧 fixed. `netBeta` could generate a short position with equal notionals,
making net equity zero and the answer/tolerance `NaN`/`Infinity`. The second
notional is now rerolled only in that invalid short case, preserving the intended
family while ensuring every emitted round is finite and scorable.

The real seven FAM generators were independently re-derived over 10,000 cases each:
`betaFut`, `minVar`, `optionDelta`, `pairs`, `netBeta`, `dv01`, and `crossFx` all
matched answer and tolerance exactly up to floating-point noise. A forced equal-
notional short case exercised the new guard and passed.

Evidence commands:

```text
node verification/node/11_delta_hedge_check.js
PYTHONPATH=verification python verification/python/tier1_pnl/11_delta_hedge_checks.py
```
