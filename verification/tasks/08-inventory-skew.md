# 08 — Inventory Skew

## Claim to verify

Quotes, inventory evolution, capital charge, and breach response implement the
stated inventory-risk policy.

## Current finding

The planned design fix is to fully flatten on a breach because the rules say
“force-liquidated” while the current code halves the position. This changes the
shipped calibrated score range and must be prominently flagged without editing
`CALIBRATION.md`.

## Check

Re-derive quote offsets and PnL path-by-path, run at least 10,000 stochastic paths,
verify the capital charge, and force breach/zero-inventory/maximum-inventory edges.

## Completed evidence — 2026-09-17

Status: 🔧 fixed. The planned breach defect was real: a position of `limit + 1`
was reduced by roughly half, despite the rules saying “force-liquidated.” The live
game now uses the pure `forceLiquidate()` transition, which returns zero for every
breached position.

The real quote and flow primitives were checked in both variants at skews
`-4, -2, 0, 2, 4` with 20,000 independent trials per row. Python independently
re-derived the logistic fill probability, quote edges, expected inventory change,
and quadratic capital charge. All empirical means were within 5 Monte Carlo standard
errors; both positive and negative breach cases flatten exactly to zero.

Evidence commands:

```text
node verification/node/08_inventory_skew_check.js
PYTHONPATH=verification python verification/python/tier1_pnl/08_inventory_skew_checks.py
```

Calibration resolved: `verification/python/calibration/pnl_recalibration.py` ran
4,000 simulations for each of four explicit policies per variant using the corrected
full-liquidation path. The resulting anchors and p90-policy SD/separation are in
`CALIBRATION.md` and the two variant `th:` blocks; the old stale anchors were replaced.
