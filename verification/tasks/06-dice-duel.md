# 06 — Dice Duel

## Claim to verify

The chosen die is the one with the highest pairwise probability of rolling above
the opponent, with ties handled according to the game rule.

## Current finding

The mechanism is correct for every live pairing tested. A constant die against
itself has no resolved outcome under tie re-rolls and yields an undefined helper
value, but that self-comparison is never offered by the game.

## Check

`verification/node/06_dice_duel_check.js` checked every pair in the Efron, Miwin,
and Grime sets, then collected 10,000 accepted standard and 10,000 hard items.
The Python check re-derived each 36-pairing probability with exact fractions and
confirmed the selected maximum, including repeated faces and ordinary ties.

## Expected outcome

✅ exact pairwise dominance agrees for all live pairings and generated items.
