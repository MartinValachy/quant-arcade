"""Exact Conway leading-number checks for Pattern Race (game 05)."""

from __future__ import annotations

import json
import math
import subprocess
from fractions import Fraction
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "05_pattern_race_check.js"


def leading(x: str, y: str) -> int:
    return sum(2 ** (k - 1) for k in range(1, min(len(x), len(y)) + 1) if x[-k:] == y[:k])


def first_probability(a: str, b: str) -> Fraction:
    odds_a = leading(b, b) - leading(b, a)
    odds_b = leading(a, a) - leading(a, b)
    return Fraction(odds_a, odds_a + odds_b)


def check_pairs(rows: list[dict], label: str, min_edge: float) -> dict:
    if len(rows) < MIN_DRAWS:
        raise AssertionError(f"{label}: insufficient pairs")
    max_error = 0.0
    for row in rows:
        a, b = row["A"], row["B"]
        if a == b:
            raise AssertionError(f"{label}: identical pair survived: {a}")
        expected = first_probability(a, b)
        actual = Fraction(float(row["pA"])).limit_denominator(1000000)
        if actual != expected:
            raise AssertionError(f"{label}: {a}/{b}: {actual} != {expected}")
        if abs(float(expected) - 0.5) < min_edge:
            raise AssertionError(f"{label}: insufficient edge for {a}/{b}")
        max_error = max(max_error, abs(float(expected) - float(row["pA"])))
    return {"group": label, "cases": len(rows), "maxFloatRoundingError": max_error, "pass": True}


def check_waits(rows: list[dict], label: str) -> dict:
    if len(rows) < MIN_DRAWS:
        raise AssertionError(f"{label}: insufficient waiting-time cases")
    for row in rows:
        expected = 2 * leading(row["pattern"], row["pattern"])
        if row["wait"] != expected:
            raise AssertionError(f"{label}: {row['pattern']}: {row['wait']} != {expected}")
    return {"group": label, "cases": len(rows), "pass": True}


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    forced = [evidence["forced3"], evidence["forced4"]]
    if any(item["same"] or item["edge"] < threshold for item, threshold in zip(forced, (0.08, 0.05))):
        raise AssertionError(f"fallback failed: {forced}")
    print(json.dumps({
        "game": 5,
        "drawsPerGroup": evidence["drawsPerGroup"],
        "pairs": [check_pairs(evidence["pairs3"], "length-3", 0.08), check_pairs(evidence["pairs4"], "length-4", 0.05)],
        "waitingTimes": [check_waits(evidence["waits3"], "length-3"), check_waits(evidence["waits4"], "length-4")],
        "forcedFallbacks": forced,
        "pass": True,
    }, indent=2))


if __name__ == "__main__":
    main()
