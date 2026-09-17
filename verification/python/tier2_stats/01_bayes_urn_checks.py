"""Independent exact Bayes-rule verification for game 01."""

from __future__ import annotations

import json
import subprocess
from fractions import Fraction
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "01_bayes_urn_check.js"


def posterior(a: dict, b: dict, prior: float, seq: list[str]) -> float:
    pa = Fraction(a["r"], a["r"] + a["b"])
    pb = Fraction(b["r"], b["r"] + b["b"])
    la = Fraction(1)
    lb = Fraction(1)
    for draw in seq:
        if draw == "R":
            la *= pa
            lb *= pb
        else:
            la *= 1 - pa
            lb *= 1 - pb
    prior_f = Fraction(str(prior))
    result = prior_f * la / (prior_f * la + (1 - prior_f) * lb)
    return float(result)


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    checked = []
    for result in evidence["results"]:
        if result["n"] < MIN_DRAWS:
            raise AssertionError(f"{result['variant']}: fewer than 10,000 cases")
        max_error = 0.0
        max_no_prior_error = 0.0
        min_options = 99
        bad_option_sets = 0
        for item in result["records"]:
            expected = posterior(item["A"], item["B"], item["priorA"], item["seq"])
            no_prior = posterior(item["A"], item["B"], 0.5, item["seq"])
            max_error = max(max_error, abs(item["post"] - expected))
            max_no_prior_error = max(max_no_prior_error, abs(item["noPrior"] - no_prior))
            min_options = min(min_options, len(item["opts"]))
            correct = sum(abs(option - item["post"]) < 1e-12 for option in item["opts"])
            if len(item["opts"]) != 4 or correct != 1 or not all(0 < option < 1 for option in item["opts"]):
                bad_option_sets += 1
        if max_error > 2e-12 or max_no_prior_error > 2e-12 or bad_option_sets:
            raise AssertionError(f"{result['variant']}: posterior/options mismatch")
        checked.append({
            "variant": result["variant"],
            "cases": result["n"],
            "max_posterior_error": max_error,
            "max_no_prior_error": max_no_prior_error,
            "minimum_option_count": min_options,
            "bad_option_sets": bad_option_sets,
            "pass": True,
        })

    for edge in evidence["edgeCases"]:
        expected = posterior(edge["A"], edge["B"], edge["prior"], edge["seq"])
        if abs(edge["post"] - expected) > 2e-12:
            raise AssertionError("edge-case posterior mismatch")
    if not evidence["boundedFiller"] or evidence["hostile"]["optionCount"] != 4:
        raise AssertionError("filler loop is not bounded/scorable under hostile RNG")
    print(json.dumps({
        "game": 1,
        "variants": checked,
        "edge_cases": len(evidence["edgeCases"]),
        "hostile_filler_options": evidence["hostile"]["optionCount"],
        "pass": True,
    }, indent=2))


if __name__ == "__main__":
    main()
