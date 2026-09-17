"""Independent Bernoulli/binomial checks for game 19."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

import numpy as np

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "19_biased_coin_check.js"


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    checked = []
    for index, result in enumerate(evidence["results"]):
        n = result["n"]
        cfg = result["cfg"]
        if n < MIN_DRAWS or result["badRounds"]:
            raise AssertionError(f"{result['variant']}: invalid generated rounds")
        expected_target = n / cfg["coins"]
        target_error = max(abs(count - expected_target) for count in result["targets"])
        target_se = math.sqrt(n * (1 / cfg["coins"]) * (1 - 1 / cfg["coins"]))
        if target_error > 5 * target_se:
            raise AssertionError(f"{result['variant']}: target selection is not uniform")
        if result["positive"] + result["negative"] != n:
            raise AssertionError(f"{result['variant']}: bias sign count mismatch")
        if result["minAbs"] < cfg["bias"][0] or result["maxAbs"] > cfg["bias"][1]:
            raise AssertionError(f"{result['variant']}: bias magnitude outside configured range")
        # Independent Monte Carlo for each fixed biased Bernoulli probability.
        fixed_checks = []
        for fixed_index, row in enumerate(result["fixed"]):
            p = row["p"]
            rng = np.random.default_rng(1900000 + int(round((p - 0.5) * 1000)) + (100000 if result["variant"] == "hard" else 0) + 3000)
            sample = rng.binomial(1, p, n)
            mean = float(np.mean(sample))
            variance = float(np.var(sample, ddof=1))
            mean_se = math.sqrt(p * (1 - p) / n)
            if abs(row["mean"] - p) > 5 * mean_se:
                raise AssertionError(f"{result['variant']} p={p}: JS mean misses theory")
            if abs(mean - p) > 5 * mean_se:
                raise AssertionError(f"{result['variant']} p={p}: Python mean misses theory")
            if abs(variance - p * (1 - p)) > 0.05:
                raise AssertionError(f"{result['variant']} p={p}: Python variance misses theory")
            fixed_checks.append({"p": p, "js_mean": row["mean"], "theory_mean": p, "python_variance": variance})
        checked.append({
            "variant": result["variant"],
            "rounds": n,
            "target_counts": result["targets"],
            "max_target_count_error": target_error,
            "bias_abs_range": [result["minAbs"], result["maxAbs"]],
            "fixed_bernoulli_checks": fixed_checks,
            "pass": True,
        })
    print(json.dumps({"game": 19, "variants": checked, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
