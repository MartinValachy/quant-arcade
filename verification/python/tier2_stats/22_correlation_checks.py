"""Independent Pearson-correlation and outlier checks for game 22."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

import numpy as np
from scipy.stats import pearsonr

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "22_correlation_check.js"


def independent_mean_r(cfg: dict, n: int, seed: int) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    values = []
    for _ in range(n):
        count = int(rng.integers(cfg["n"][0], cfg["n"][1] + 1))
        rho = float(np.floor(rng.uniform(-0.95, 0.95) * 100 + 0.5) / 100)
        outliers = int(rng.integers(1, cfg["outliers"] + 1)) if cfg["outliers"] else 0
        z1 = rng.normal(size=count)
        z2 = rng.normal(size=count)
        xs = z1.copy()
        ys = rho * z1 + math.sqrt(max(0, 1 - rho * rho)) * z2
        for _ in range(outliers):
            j = int(rng.integers(0, count))
            xs[j] = rng.normal() * 3.1
            ys[j] = rng.normal() * 3.1
        sx, sy = rng.uniform(0.4, 4), rng.uniform(0.4, 4)
        mx, my = rng.uniform(-40, 40), rng.uniform(-40, 40)
        xs = xs * sx + mx
        ys = ys * sy + my
        values.append(float(np.corrcoef(xs, ys)[0, 1]))
    return float(np.mean(values)), float(np.var(values, ddof=1))


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    exact_checked = 0
    max_pearson_error = 0.0
    for row in evidence["exact"]:
        scipy_r = float(pearsonr(row["xs"], row["ys"]).statistic)
        max_pearson_error = max(max_pearson_error, abs(row["r"] - scipy_r))
        exact_checked += 1
    if max_pearson_error > 1e-12:
        raise AssertionError(f"u.corr differs from scipy Pearson by {max_pearson_error}")

    checked = []
    for index, result in enumerate(evidence["results"]):
        if result["n"] < MIN_DRAWS or result["invalid"]:
            raise AssertionError(f"{result['variant']}: invalid generated sample")
        cfg = result["cfg"]
        expected_min_outliers = 0 if cfg["outliers"] == 0 else 1
        if result["minOutliers"] != expected_min_outliers or result["maxOutliers"] != cfg["outliers"]:
            raise AssertionError(f"{result['variant']}: outlier count violates contract")
        py_mean, py_var = independent_mean_r(cfg, result["n"], 2210000 + index * 100000)
        # Independent samples have sampling noise; compare the aggregate moments
        # with a deliberately conservative tolerance because rho is a mixture.
        if abs(result["meanR"] - py_mean) > 0.04:
            raise AssertionError(f"{result['variant']}: independent correlation mean differs")
        if abs(result["varianceR"] - py_var) > 0.04:
            raise AssertionError(f"{result['variant']}: independent correlation variance differs")
        checked.append({
            "variant": result["variant"],
            "experiments": result["n"],
            "sample_size_range": [result["minN"], result["maxN"]],
            "outlier_range": [result["minOutliers"], result["maxOutliers"]],
            "mean_r": result["meanR"],
            "variance_r": result["varianceR"],
            "independent_mean_r": py_mean,
            "independent_variance_r": py_var,
            "pass": True,
        })
    print(json.dumps({"game": 22, "exact_pearson_cases": exact_checked, "max_pearson_error": max_pearson_error, "variants": checked, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
