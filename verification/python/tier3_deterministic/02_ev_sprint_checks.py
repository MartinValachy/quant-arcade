"""Independent exact-support checks for Fair Value Sprint (game 02)."""

from __future__ import annotations

import json
import math
import re
import subprocess
from collections import Counter
from fractions import Fraction
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "02_ev_sprint_check.js"


def exact_probability(value: float) -> Fraction:
    """Recover the simple rational probability serialized by JavaScript."""
    return Fraction(value).limit_denominator(1000000)


def check_records(records: list[dict], label: str) -> dict:
    if len(records) < MIN_DRAWS:
        raise AssertionError(f"{label}: only {len(records)} generated questions")

    descriptions = Counter(re.sub(r"\d+", "{n}", record["desc"]) for record in records)
    expected_families = 8 if label == "standard" else 9
    if len(descriptions) != expected_families:
        raise AssertionError(f"{label}: reached {len(descriptions)} families, expected {expected_families}")

    max_ev_error = 0.0
    min_mass = math.inf
    max_mass_error = 0.0
    total_outcomes = 0
    for record in records:
        outcomes = record["outcomes"]
        if not outcomes:
            raise AssertionError(f"{label}: empty outcome list")
        probabilities = [exact_probability(float(outcome["p"])) for outcome in outcomes]
        mass = sum(probabilities, Fraction(0))
        if mass != 1:
            raise AssertionError(f"{label}: probability mass is {mass} for {record['desc']}")
        if any(p < 0 for p in probabilities):
            raise AssertionError(f"{label}: negative probability")
        if any(not math.isfinite(float(outcome["v"])) for outcome in outcomes):
            raise AssertionError(f"{label}: non-finite payoff")
        exact_ev = sum((p * int(outcome["v"]) for p, outcome in zip(probabilities, outcomes)), Fraction(0))
        error = abs(float(exact_ev) - float(record["fair"]))
        max_ev_error = max(max_ev_error, error)
        total_outcomes += len(outcomes)
        min_mass = min(min_mass, float(mass))
        max_mass_error = max(max_mass_error, abs(float(mass) - 1.0))

    return {
        "variant": label,
        "questions": len(records),
        "families": len(descriptions),
        "totalOutcomes": total_outcomes,
        "minProbabilityMass": min_mass,
        "maxMassError": max_mass_error,
        "maxExactEvError": max_ev_error,
        "pass": max_ev_error < 1e-9 and max_mass_error == 0.0,
    }


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    standard = check_records(evidence["standard"], "standard")
    hard = check_records(evidence["hard"], "hard")
    boundary = evidence["quoteBoundary"]
    if any(row["actual"] != row["truth"] for row in boundary):
        raise AssertionError(f"quote threshold mismatch: {boundary}")
    print(json.dumps({
        "game": 2,
        "drawsPerVariant": evidence["drawsPerVariant"],
        "variants": [standard, hard],
        "quoteBoundary": boundary,
        "pass": True,
    }, indent=2))


if __name__ == "__main__":
    main()
