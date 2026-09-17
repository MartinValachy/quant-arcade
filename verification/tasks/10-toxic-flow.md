# 10 — Toxic Flow

## Claim to verify

Counterparty toxicity learning and realized trade PnL are scored once and match the
stated informed-flow model.

## Current finding

The plan finds double scoring: `w.ask()` resolves through the engine and the game
also adds manual PnL. The planned fix adds `manual: true` support to `w.ask()` and
uses the single PnL score. This exposes the existing calibration anchors and must
be flagged; `CALIBRATION.md` remains unchanged.

## Check

Re-derive posterior updates and adverse-selection PnL, run at least 10,000 paths,
verify each accepted trade contributes once, and inspect no-trade and extreme-toxicity
edges.

## Completed evidence — 2026-09-17

Status: 🔧 fixed. The shipped game was double-scoring accepted trades: `w.ask()`
called the standard engine resolver and `explain()` also added realized PnL. The
widget now supports `manual: true`; Toxic Flow uses it, adds the PnL score once,
and calls `ctx.mark(real > 0)` so outcome statistics remain explicit.

The real trade mechanics were checked in both variants over 20,000 trades. Python
independently re-derived the exact clean/toxic composition, uniform edge model,
Bernoulli informed-flow mixture, realized PnL, side balance, toxicity bounds, and
single PnL score. All checks passed, including hard-mode drift bounds.

Evidence commands:

```text
node verification/node/10_toxic_flow_check.js
PYTHONPATH=verification python verification/python/tier1_pnl/10_toxic_flow_checks.py
```

Calibration resolved: `verification/python/calibration/pnl_recalibration.py` ran
4,000 simulations for each of four explicit policies per variant using the corrected
single realized-PnL award. The resulting anchors and p90-policy SD/separation are in
`CALIBRATION.md` and the two variant `th:` blocks; the old double-scoring anchors
were replaced.
