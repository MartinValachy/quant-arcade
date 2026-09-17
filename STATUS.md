# Quant Arcade logic-verification status

The 24-game validity and accuracy review is complete. Rows are updated only after
the actual shipped logic has been checked against an independent derivation.

| # | Game | Status | Evidence / note |
|---:|---|:---:|---|
| 01 | Bayesian Urn | 🔧 | [Python derivation](verification/python/tier2_stats/01_bayes_urn_checks.py) and [Node evidence runner](verification/node/01_bayes_urn_check.js): 10,000 cases/variant matched exact Bayes calculations; bounded and hardened distractor filler. |
| 02 | Fair Value Sprint | 🔧 | Exact EV and quote-boundary checks passed; ±2% floating-point boundary fixed |
| 03 | Conditional Traps | 🔧 | 70,000 exact-family checks and 20,000 build checks passed; answer filler fallback fixed |
| 04 | Combinatorics Counter | ✅ | 100,000 exact checks across all 10 shipped families; committee confirmed reachable |
| 05 | Pattern Race | 🔧 | 40,000 exact Conway/wait checks plus forced retry-exhaustion fallbacks passed |
| 06 | Dice Duel | ✅ | Known-set and 20,000 generated-item exact 36-pairing checks passed |
| 07 | Quote the Market | ✅ | [Python derivation](verification/python/tier1_pnl/07_market_maker_checks.py) and [Node evidence runner](verification/node/07_market_maker_check.js): all 8 families, 10,000 draws/family, exact `pickoff()` tail-loss agreement. |
| 08 | Inventory Skew | ✅ | Mechanics and 20,000-trial checks passed; corrected four-policy/4,000-run calibration anchors recorded |
| 09 | Order Book Reader | 🔧 | 20,000-book arithmetic checks and 40,000 option-label checks passed; tie/filler fixes applied |
| 10 | Toxic Flow | ✅ | Mechanics and 20,000-trade checks passed; corrected four-policy/4,000-run calibration anchors recorded |
| 11 | Delta Hedge | 🔧 | [Python derivation](verification/python/tier1_pnl/11_delta_hedge_checks.py) and [Node evidence runner](verification/node/11_delta_hedge_check.js): 10,000 cases per family; all seven formulas/tolerances matched. Fixed equal-notional short `netBeta` zero denominator. |
| 12 | Winner's Curse | ✅ | [Python derivation](verification/python/tier1_pnl/12_winners_curse_checks.py) and [Node evidence runner](verification/node/12_winners_curse_check.js): 20,000 rounds/variant; mechanics passed. Bounds excluded the hindsight-optimal profitable bid in 10.61% standard and 10.81% hard rounds; documented as a design limitation, not silently changed. |
| 13 | 80 in 8 | ✅ | 190,000 independent expression and scoring-metadata checks passed |
| 14 | Percentage Sprint | ✅ | 100,000 independent family/rounding checks passed; zero-base state unreachable |
| 15 | Fermi Desk | ✅ | 22 targets and 440,000 independent range/scoring checks passed |
| 16 | Sequence Break | ✅ | 130,000 independent recurrence and bound checks passed |
| 17 | Compounding Desk | ✅ | 120,000 independent formula/tolerance checks passed; only r=g perpetuity state unreachable |
| 18 | Target Sum | ✅ | 20,000 grid invariants and terminal-condition checks passed |
| 19 | Spot the Bias | ✅ | [Python derivation](verification/python/tier2_stats/19_biased_coin_checks.py) and [Node evidence runner](verification/node/19_biased_coin_check.js): 20,000 rounds/variant and positive/negative Bernoulli checks passed. |
| 20 | Regime Shift | ✅ | [Python derivation](verification/python/tier2_stats/20_regime_shift_checks.py) and [Node evidence runner](verification/node/20_regime_shift_check.js): 20,000 rounds/variant; changepoint boundary and pre/post normal moments passed. |
| 21 | The Estimator | 🔧 | [Python derivation](verification/python/tier2_stats/21_param_estimate_checks.py) and [Node evidence runner](verification/node/21_param_estimate_check.js): six families × 10,000 cases matched; tank/uniform SEs fixed, `sd` approximation error quantified at 2.66–6.14%. |
| 22 | Correlation Eye | 🔧 | [Python derivation](verification/python/tier2_stats/22_correlation_checks.py) and [Node evidence runner](verification/node/22_correlation_check.js): 10,000 datasets/variant; SciPy Pearson agreement below `9e-16`; hard mode now forces 1–2 outliers. |
| 23 | Drift Hunt | 🔧 | 30,000 normal-path checks and non-unit-sigma z checks passed; display formula fixed |
| 24 | Kelly Sizing | 🔧 | [Python derivation](verification/python/tier1_pnl/24_kelly_checks.py) and [Node evidence runner](verification/node/24_kelly_check.js): 10,000 50-block paths per variant/policy; floor/ruin results matched independent simulation. Corrected stale rules text from 8 to 6 bets. |

## Calibration and scope notes

Game 07 required no mechanics fix, so its calibrated thresholds were left untouched.

### Calibration resolution

Games 08 and 10 were recalibrated after their mechanics fixes. The policy
definitions, 4,000-run sample size, corrected anchors, SDs, and separations are
recorded in `CALIBRATION.md` and reproduced by
`verification/python/calibration/pnl_recalibration.py`. `app.js` and `index.html`
remain unchanged.

Stage 3 is complete, one game at a time. Final consolidation, browser smoke, and
repository diff review passed before the release commit.
