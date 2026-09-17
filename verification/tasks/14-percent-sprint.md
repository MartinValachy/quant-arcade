# 14 — Percentage Sprint

## Claim to verify

The percentage transformation answer is exact for the generated base, rate, and
direction, including the accepted precision.

## Current finding

All 10 shipped percentage families are correct. Zero-base cases are unreachable
under the source's positive base ranges, so no zero-denominator patch is needed.

## Check

`verification/node/14_percent_sprint_check.js` generated 10,000 cases for each
of the 10 families. The Python check independently recomputed every displayed
question and precision tolerance, including reverse moves, successive changes,
margin-on-sale-price, bps, and JavaScript-style rounding. All 100,000 cases
passed; zero-base reachability was explicitly checked from the generator bounds.

## Expected outcome

✅ independent arithmetic agrees; zero-base state documented as unreachable.
