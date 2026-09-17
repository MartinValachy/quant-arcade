"""Independent finite-support verification for game 07.

The JavaScript evidence runner calls the real shipped BANK/pickoff functions. This
file reconstructs all eight distributions from their mathematical definitions and
checks moments and expected pickoff loss independently.
"""

from __future__ import annotations

import json
import math
import subprocess
from collections import Counter
from pathlib import Path

import numpy as np

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "07_market_maker_check.js"


def convolution(values: list[tuple[float, float]], n: int) -> list[tuple[float, float]]:
    out = [(0.0, 1.0)]
    for _ in range(n):
        merged: dict[float, float] = {}
        for x, px in out:
            for y, py in values:
                merged[x + y] = merged.get(x + y, 0.0) + px * py
        out = sorted(merged.items())
    return out


def finite_support(family: int, calls: list[dict]) -> list[tuple[float, float]]:
    ints = [c["value"] for c in calls if c["method"] == "int"]
    picks = [c["value"] for c in calls if c["method"] == "pick"]
    if family == 0:
        n, m = ints[0], picks[0]
        return [(x * m, p) for x, p in convolution([(float(i), 1 / 6) for i in range(1, 7)], n)]
    if family == 1:
        n, m = ints[0], picks[0]
        return [(k * m, math.comb(n, k) / 2**n) for k in range(n + 1)]
    if family == 2:
        n, m = ints[0], picks[0]
        return [(j * m, (j**n - (j - 1) ** n) / 6**n) for j in range(1, 7)]
    if family == 3:
        m = picks[0]
        counts = Counter(a * b for a in range(1, 7) for b in range(1, 7))
        return sorted((product * m, count / 36) for product, count in counts.items())
    if family == 4:
        n, m = ints[0], picks[0]
        return [(x * m, p) for x, p in convolution([(float(i), 1 / 13) for i in range(1, 14)], n)]
    if family == 5:
        m = picks[0]
        counts = Counter(abs(a - b) for a in range(1, 7) for b in range(1, 7))
        return sorted((20 + difference * m, count / 36) for difference, count in counts.items())
    if family == 6:
        m = picks[0]
        high = sum(1 for a in range(1, 7) for b in range(1, 7) for c in range(1, 7) if a + b + c > 10)
        p = high / 216
        return [(5 * m, 1 - p), (20 * m, p)]
    if family == 7:
        n, m = ints[0], picks[0]
        return [(30 + k * m, math.comb(n, k) / 3**n * 2 ** (n - k)) for k in range(n + 1)]
    raise ValueError(family)


def moments(support: list[tuple[float, float]]) -> tuple[float, float]:
    mean = sum(x * p for x, p in support)
    variance = sum(p * (x - mean) ** 2 for x, p in support)
    return mean, variance


def loss(x: float, ask: float, bid: float) -> float:
    if x > ask:
        return x - ask
    if x < bid:
        return bid - x
    return 0.0


def check_family(record: dict) -> dict:
    support = finite_support(record["family"], record["configCalls"])
    theory_mean, theory_variance = moments(support)
    sample = np.asarray(record["samples"], dtype=float)
    if sample.size != 6000:
        raise AssertionError(f"family {record['family']}: shipped bank size is {sample.size}, not 6000")
    if record["family"] in (0, 1, 2, 3, 4, 5, 6, 7):
        if abs(record["ev"] - float(np.mean(sample))) > 1e-9:
            raise AssertionError(f"family {record['family']}: shipped EV is not its sample mean")
        if abs(record["sd"] - float(np.std(sample, ddof=1))) > 1e-9:
            raise AssertionError(f"family {record['family']}: shipped SD is not sample SD")

    mean_se = math.sqrt(theory_variance / MIN_DRAWS)
    if abs(record["drawMean"] - theory_mean) > 5 * mean_se:
        raise AssertionError(f"family {record['family']}: 10k draw mean misses theory")
    rel_var_error = abs(record["drawVariance"] - theory_variance) / theory_variance
    if rel_var_error > 0.10:
        raise AssertionError(f"family {record['family']}: 10k draw variance error {rel_var_error:.3%}")

    rows = []
    for row in record["pickoff"]:
        theoretical_losses = np.asarray([loss(x, row["ask"], row["bid"]) for x, _ in support])
        probabilities = np.asarray([p for _, p in support])
        expected = float(np.dot(theoretical_losses, probabilities))
        variance = float(np.dot((theoretical_losses - expected) ** 2, probabilities))
        sample_rederived = float(np.mean([loss(x, row["ask"], row["bid"]) for x in sample]))
        sample_se = math.sqrt(variance / sample.size)
        if abs(row["pickoff"] - sample_rederived) > 1e-9:
            raise AssertionError(f"family {record['family']}: JS/Python finite-sample pickoff mismatch")
        if abs(row["pickoff"] - expected) > 5 * sample_se + 1e-9:
            raise AssertionError(f"family {record['family']}: pickoff misses theoretical expectation")
        rows.append({
            "multiplier": row["multiplier"],
            "theoretical": expected,
            "sample": row["pickoff"],
            "sample_se_bound": 5 * sample_se,
        })
    return {
        "family": record["family"],
        "configCalls": record["configCalls"],
        "desc": record["desc"],
        "theoreticalMean": theory_mean,
        "theoreticalVariance": theory_variance,
        "generatorMean": record["drawMean"],
        "generatorVariance": record["drawVariance"],
        "pickoff": rows,
        "pass": True,
    }


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    if evidence["n"] < MIN_DRAWS:
        raise AssertionError("Node evidence runner did not use at least 10,000 draws")
    results = [check_family(record) for record in evidence["families"]]
    print(json.dumps({"game": 7, "drawsPerFamily": evidence["n"], "families": results, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
