# 13 — 80 in 8

## Claim to verify

The generated arithmetic expression has the displayed exact answer and obeys the
intended integer/rounding rules.

## Current finding

The generator and scoring metadata are correct.

## Check

`verification/node/13_arithmetic_check.js` generated 10,000 cases for every kind
in both configured variants (190,000 total). The Python check independently
evaluated each displayed expression, including negative operations, precedence,
fractions, squares, and decimals; it also verified integer versus decimal
metadata and the shipped 0.005 decimal tolerance.

## Expected outcome

✅ independent evaluation and scoring metadata agree for every generated case.
