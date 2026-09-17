# 04 — Combinatorics Counter

## Claim to verify

The answer is the exact count for the generated combinatorial object.

## Current finding

All 10 families present in the shipped `FAM` table are correct. The plan's note
that the `committee` family is unreachable does not match the current source:
its configured RNG ranges generate valid committee questions routinely. No
defensive patch is justified.

## Check

`verification/node/04_combinatorics_check.js` generated each of the 10 shipped
families 10,000 times. The Python check independently re-derived every answer
with `math.comb`, factorials, derangements, Fibonacci recurrence, stars-and-bars,
and double factorials; all 100,000 cases passed with positive integer answers.
Committee was directly exercised and confirmed reachable.

## Expected outcome

✅ verified; document that the committee family is reachable in the current
source, contrary to the plan note.
