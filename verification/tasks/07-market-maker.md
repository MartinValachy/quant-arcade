# 07 — Quote the Market

## Claim to verify

Quote acceptance, fills, and realized market-maker PnL follow the displayed market
model and inventory/risk rules.

## Current finding

The plan requests a Tier 1 PnL review and a Python re-derivation of `pickoff()`'s
tail expectation over the eight-instrument bank.

## Check

Export the real generator/logic, run at least 10,000 stochastic trials per relevant
variant, re-derive fill probabilities, fair values, and PnL independently, and
Monte Carlo the pickoff tail expectation. Inspect spread, inventory, and all RNG
bounds.

## Completed evidence — 2026-09-17

Status: ✅ clean. The real shipped `BANK` and `pickoff` functions were exported
through a browser-no-op CommonJS guard only. The Node evidence runner exercised all
eight instrument families with 6,000 samples per bank and 10,000 fresh draws per
family. Python independently reconstructed the finite supports for dice sums,
binomial heads, maxima, dice products, card-rank sums, absolute differences,
thresholded dice totals, and high-face counts.

Checks passed:

- every generated bank had the intended 6,000 observations;
- generator mean and variance matched the independently derived theoretical values;
- every 10,000-draw empirical mean was within 5 Monte Carlo standard errors;
- every empirical variance was within 10% of theory;
- Python's independent sample `pickoff()` matched the shipped function exactly;
- each of three quote widths per family matched the exact theoretical tail-loss
  expectation within the 5-standard-error bound;
- all configuration RNG bounds were valid and all eight families had positive
  variance, so the quote-width denominator is non-degenerate.

Evidence commands:

```text
node verification/node/07_market_maker_check.js
PYTHONPATH=verification python verification/python/tier1_pnl/07_market_maker_checks.py
```

No mechanics or calibration values required changing. The only game-file change is
the planned verification export; no UI, `app.js`, `index.html`, or `CALIBRATION.md`
content was changed.
