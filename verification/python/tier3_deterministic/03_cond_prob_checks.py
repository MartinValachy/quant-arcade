"""Exact independent re-derivation for Conditional Traps (game 03)."""

from __future__ import annotations

import json
import math
import re
import subprocess
from fractions import Fraction
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "03_cond_prob_check.js"


def n_choose_k(n: int, k: int) -> int:
    return math.comb(n, k)


def exact_dice(n: int, threshold: int) -> Fraction:
    total = 6**n
    conditioning = 0
    joint = 0
    if n == 2:
        states = ((a, b) for a in range(1, 7) for b in range(1, 7))
    else:
        states = ((a, b, c) for a in range(1, 7) for b in range(1, 7) for c in range(1, 7))
    for state in states:
        if sum(state) >= threshold:
            conditioning += 1
            if 6 in state:
                joint += 1
    return Fraction(joint, conditioning)


def exact_from_record(name: str, record: dict) -> Fraction:
    q = record["q"]
    sub = re.sub(r"<[^>]+>", "", record["sub"])
    calls = record["calls"]
    if name == "test":
        picks = [Fraction(str(call["value"])) for call in calls if call["method"] == "pick"]
        prev, sensitivity, specificity = picks[:3]
        return prev * sensitivity / (prev * sensitivity + (1 - prev) * (1 - specificity))
    if name == "dice":
        n = int(re.search(r"(\d+) fair dice", sub).group(1))
        threshold = int(re.search(r"sum\D+(\d+)", q).group(1))
        return exact_dice(n, threshold)
    if name == "coins":
        n = int(re.search(r"(\d+) fair coins", sub).group(1))
        target, minimum = map(int, re.search(r"(\d+) heads \|\D+(\d+) head", q).groups())
        conditioning = sum(math.comb(n, k) for k in range(minimum, n + 1))
        joint = sum(math.comb(n, k) for k in range(target, n + 1))
        return Fraction(joint, conditioning)
    if name == "family":
        n = int(re.search(r"all (\d+) are boys", q).group(1))
        return Fraction(1, 2**n - 1)
    if name == "cards":
        if "second card is a heart" in q:
            return Fraction(12, 51)
        if "both are aces" in q:
            both = Fraction(n_choose_k(4, 2), n_choose_k(52, 2))
            at_least_one = 1 - Fraction(n_choose_k(48, 2), n_choose_k(52, 2))
            return both / at_least_one
        k = int(re.search(r"all (\d+) are hearts", q).group(1))
        return Fraction(n_choose_k(13, k), n_choose_k(52, k)) / Fraction(1, 4)
    if name == "monty":
        n, opened = map(int, re.search(r"(\d+) doors.*opens (\d+) other", sub).groups())
        return Fraction(n - 1, n) / (n - 1 - opened)
    if name == "reversal":
        red, blue = map(int, re.search(r"(\d+) red.*(\d+) blue", sub).groups())
        return Fraction(red - 1, red + blue - 1)
    raise AssertionError(name)


def check_family(name: str, records: list[dict]) -> dict:
    if len(records) < MIN_DRAWS:
        raise AssertionError(f"{name}: insufficient generated cases")
    max_error = 0.0
    for record in records:
        expected = exact_from_record(name, record)
        actual = Fraction(float(record["p"])).limit_denominator(10**9)
        if actual != expected:
            raise AssertionError(f"{name}: {record['q']} -> {actual} != {expected}")
        max_error = max(max_error, abs(float(expected) - float(record["p"])))
    return {"family": name, "cases": len(records), "maxFloatRoundingError": max_error, "pass": True}


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    results = [check_family(name, evidence["families"][name]) for name in evidence["families"]]
    for mode in ("standardBuild", "hardBuild"):
        build = evidence[mode]
        if build["draws"] < MIN_DRAWS or build["minOptions"] != 4:
            raise AssertionError(f"{mode}: malformed answer set evidence {build}")
    print(json.dumps({
        "game": 3,
        "drawsPerFamily": evidence["drawsPerFamily"],
        "families": results,
        "buildChecks": {mode: evidence[mode] for mode in ("standardBuild", "hardBuild")},
        "pass": True,
    }, indent=2))


if __name__ == "__main__":
    main()
