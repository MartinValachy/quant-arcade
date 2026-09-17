# 16 — Sequence Break

## Claim to verify

The missing term follows the generated recurrence or sequence rule exactly.

## Current finding

All 13 shipped sequence generators are correct within the live game's finite and
integer bounds.

## Check

`verification/node/16_sequences_check.js` called every shipped generator 10,000
times and recorded its actual parameter draws and terms 0–6. The Python check
independently rebuilt every recurrence, including sign changes, repeated values,
interleaving, and hard-mode families, for all 130,000 cases; it also applied the
live finite/integer/1e9 bounds.

## Expected outcome

✅ all generated families match independently.
