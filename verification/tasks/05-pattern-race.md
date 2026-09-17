# 05 — Pattern Race

## Claim to verify

The first-occurrence race probability for the generated binary patterns is correct.

## Current finding

The planned defensive fallback was required and has been added. After the
bounded retry loop, the generator now deterministically selects an opponent
with sufficient Conway edge, preventing identical patterns and `0/0` scoring.

## Check

`verification/node/05_pattern_race_check.js` generated 10,000 pairs and 10,000
waiting-time patterns at each length. The Python check independently re-derived
all Conway probabilities and waiting times exactly, then forced retry exhaustion
with constant RNGs at both lengths. All 40,000 generated cases and both forced
fallbacks passed.

## Expected outcome

🔧 verified after adding the planned bounded-retry fallback.
