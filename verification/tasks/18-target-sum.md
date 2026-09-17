# 18 — Target Sum

## Claim to verify

The generated grid has a valid target path, and the player's target-sum interaction
and scoring reflect the actual grid constraints.

## Current finding

The grid invariant and terminal predicate are correct. Wrong answers are
structurally impossible in calibration because this is a throughput game, but
the live terminal condition itself is now isolated and directly tested.

## Check

`verification/node/18_target_sum_check.js` generated 10,000 grids per variant.
The Python check independently validated dimensions, cell bounds, unique solution
indices, target sums, and the standard/hard terminal predicate, including wrong
sum and wrong-count cases.

## Expected outcome

✅ every generated board satisfies its stated invariant and terminal rules.
