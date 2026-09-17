# 22 — Correlation Eye

## Claim to verify

The generated paired sample has the claimed correlation structure and the answer
matches the actual Pearson correlation used by the scorer.

## Current finding

The plan identifies a hard-mode rules/code mismatch: rules say outliers are planted,
but the code can draw zero outliers.

## Check

Compare `u.corr()` to `scipy.stats.pearsonr` on identical generated data, run at
least 10,000 samples/experiments for model moments, and verify hard mode always
contains the promised outlier count.

## Completed evidence — 2026-09-17

Status: 🔧 fixed. Hard mode now requests `1…cfg.outliers` leverage outliers rather
than the previous `0…cfg.outliers`, so every hard round satisfies its stated rule.

Across 10,000 datasets per variant, sample sizes and outlier counts stayed within
contract. The actual `u.corr()` result matched SciPy's Pearson correlation on 200
identical generated point clouds with maximum absolute error below `9e-16`.
Independent NumPy simulations reproduced the aggregate correlation mean and
variance for both variants.

Evidence commands:

```text
node verification/node/22_correlation_check.js
PYTHONPATH=verification python verification/python/tier2_stats/22_correlation_checks.py
```
