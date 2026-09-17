# 15 — Fermi Desk

## Claim to verify

The generated order-of-magnitude estimate and tolerance scoring match the question
assumptions shown to the player.

## Current finding

The fixed target bank, slider range, and piecewise log-score function are correct.

## Check

`verification/node/15_fermi_check.js` checked all 22 fixed targets and generated
10,000 slider ranges per question for both variants. The Python check independently
matched every target, confirmed the target lies strictly inside the eight-decade
range, checked the 2.4–5.6 decade offset bounds, and matched the full/partial/zero
score boundaries.

## Expected outcome

✅ displayed targets, slider bounds, and scoring agree independently.
