"""Fermi target-bank and logarithmic-slider checks for game 15."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "15_fermi_check.js"


REFERENCE = [
    3.156e7, 2.8e9, 100, 1.3e15, 6.4e5, 8.07e67, 2.5e22, 3.7e13, 2.6e10,
    2.18e14, 4.4e17, 9.1e6, 9e4, 1.1e5, 2.5e6, 5e5, 1e5, 5.3e6, 3.1e8,
    1.2e18, 4e6, 6.7e8,
]


def expected_score(error: float, full: float, tol: float) -> float:
    if error <= full:
        return 1.0
    return max(0.0, min(1.0, 1 - (error - full) / (tol - full)))


def check_variant(rows: list[dict], cfg: tuple[float, float]) -> dict:
    tol, full = cfg
    if len(rows) != len(REFERENCE):
        raise AssertionError("missing target questions")
    for row in rows:
        if not row["valid"] or row["minBelow"] < 2.4 or row["maxBelow"] > 5.6:
            raise AssertionError(f"invalid slider range: {row}")
        for sample in row["scoreSamples"]:
            expected = expected_score(sample["error"], full, tol)
            if abs(sample["score"] - expected) > 1e-12:
                raise AssertionError(f"score mismatch: {sample} vs {expected}")
    return {"questions": len(rows), "rangesPerQuestion": 10000, "pass": True}


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True, encoding="utf-8")
    evidence = json.loads(raw.stdout)
    if len(evidence["questions"]) != len(REFERENCE):
        raise AssertionError("unexpected Q-bank size")
    for item, expected in zip(evidence["questions"], REFERENCE):
        if not math.isclose(item["a"], expected, rel_tol=1e-15, abs_tol=0.0):
            raise AssertionError(f"target mismatch: {item['q']} -> {item['a']} != {expected}")
    variants = {
        "standard": check_variant(evidence["standard"], (1.2, 0.5)),
        "hard": check_variant(evidence["hard"], (0.6, 0.2)),
    }
    print(json.dumps({"game": 15, "questionBank": len(REFERENCE), "variants": variants, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
