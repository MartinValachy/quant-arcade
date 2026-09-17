# 02 — Fair Value Sprint

## Claim to verify

The correct answer is the exact expected value of the generated payoff or lottery.

## Current finding

The generator and EV arithmetic are correct. A numerical-boundary defect was
found and fixed in the scoring helper: an exactly ±2% quote could cross the
PASS boundary because of floating-point representation. The helper now uses a
small comparison tolerance, preserving the rule that only a quote more than
2% away is BUY or SELL.

## Check

`verification/node/02_ev_sprint_check.js` generated 10,000 questions per
variant from the shipped banks. `verification/python/tier3_deterministic/02_ev_sprint_checks.py`
reconstructed every serialized probability as a rational, verified exact mass
1, re-summed all 612,000+ outcome rows, and checked all 8 standard and 9 hard
families. It also exercised the exact ±2% quote boundaries.

## Expected outcome

🔧 verified; deterministic evidence passed after the boundary fix.
