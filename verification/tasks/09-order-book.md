# 09 — Order Book Reader

## Claim to verify

Mid, depth, sweep quantity, and imbalance answers match the generated book and
displayed rounding rules.

## Current finding

Both planned Tier 3 issues were real and are fixed. Imbalance now includes an
explicit TIE choice when top-level bid and ask size aggregates match. Numeric
distractor padding now deduplicates on the exact displayed label and has a
deterministic completion path.

## Check

`verification/node/09_order_book_check.js` generated 10,000 books per variant and
cycled through every configured query family. The Python check independently
re-derived all answers, confirmed 40,000 four-label numeric sets had no display
collision, and forced an exact imbalance tie.

## Expected outcome

🔧 verified after tie-break and filler-deduplication fixes.
