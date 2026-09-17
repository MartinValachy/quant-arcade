"""Exact 36-pairing checks for Dice Duel (game 06)."""

from __future__ import annotations

import json
import math
import subprocess
from fractions import Fraction
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "06_dice_duel_check.js"


def exact_beats(x: list[int], y: list[int]) -> Fraction:
    wins = sum(a > b for a in x for b in y)
    losses = sum(a < b for a in x for b in y)
    if wins + losses == 0:
        raise AssertionError("all-tie dice have no resolved duel probability")
    return Fraction(wins, wins + losses)


def check_matrix(record: dict) -> dict:
    dice = record["dice"]
    matrix = record["matrix"]
    for i, x in enumerate(dice):
        for j, y in enumerate(dice):
            if i == j:
                # Self-comparisons are never offered: a constant die would be
                # an unresolved all-tie duel and the shipped helper returns NaN.
                continue
            expected = exact_beats(x["f"], y["f"])
            actual = Fraction(float(matrix[i][j])).limit_denominator(1000)
            if actual != expected:
                raise AssertionError(f"{record}: matrix {i},{j}: {actual} != {expected}")
    return {"name": record["name"], "dice": len(dice), "pass": True}


def check_generated(rows: list[dict], label: str) -> dict:
    if len(rows) < MIN_DRAWS:
        raise AssertionError(f"{label}: only {len(rows)} accepted generated items")
    for row in rows:
        exact = [exact_beats(die["f"], row["dice"][row["oppIdx"]]["f"]) for die in row["dice"] if die is not row["dice"][row["oppIdx"]]]
        actual = [Fraction(float(value)).limit_denominator(1000) for value in row["probs"]]
        if actual != exact:
            raise AssertionError(f"{label}: generated probabilities differ from exact pair counts")
        if Fraction(float(row["best"])).limit_denominator(1000) != max(exact):
            raise AssertionError(f"{label}: best probability is not the maximum")
        if row["best"] < 0.5 or any(abs(float(p) - float(e)) > 1e-12 for p, e in zip(actual, exact)):
            raise AssertionError(f"{label}: invalid accepted item")
    return {"variant": label, "accepted": len(rows), "pass": True}


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    known_results = []
    for name, record in evidence["known"].items():
        known_results.append(check_matrix({"name": name, **record}))
    generated = [check_generated(evidence["standard"]["rows"], "standard"), check_generated(evidence["hard"]["rows"], "hard")]
    print(json.dumps({"game": 6, "target": evidence["target"], "knownSets": known_results,
                      "generated": generated, "attempts": {k: evidence[k]["attempts"] for k in ("standard", "hard")}, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
