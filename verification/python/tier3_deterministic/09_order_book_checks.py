"""Independent order-book arithmetic and display-collision checks for game 09."""

from __future__ import annotations

import json
import re
import subprocess
from collections import Counter
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "09_order_book_check.js"


def sweep(levels: list[dict], qty: int) -> tuple[float, int]:
    left, cost, depth = qty, 0.0, 0
    for level in levels:
        take = min(left, level["s"])
        cost += take * level["p"]
        left -= take
        depth += 1
        if left <= 0:
            break
    if left > 0:
        raise AssertionError("insufficient sweep depth")
    return cost / qty, depth


def expected(row: dict) -> tuple[float | int, str | None]:
    name, book, spec = row["name"], row["book"], row["spec"]
    if name == "mid":
        return book["mid"], None
    if name == "bestSize":
        side = "bids" if "best bid" in spec["q"] else "asks"
        return book[side][0]["s"], None
    if name == "imbalance":
        k = int(re.search(r"top (\d+) levels", spec["q"]).group(1))
        bid = sum(level["s"] for level in book["bids"][:k])
        ask = sum(level["s"] for level in book["asks"][:k])
        return ("BIDS" if bid > ask else "ASKS" if ask > bid else "TIE"), "choice"
    if name == "micro":
        bid, ask = book["bids"][0], book["asks"][0]
        return (bid["p"] * ask["s"] + ask["p"] * bid["s"]) / (bid["s"] + ask["s"]), None
    if name in ("sweepQ", "depth"):
        qty = int(re.search(r"(?:of |)(\d+)(?:-lot| lots)", spec["q"]).group(1))
        buy = "market BUY" in spec["q"] or "market buy" in spec["q"]
        levels = book["asks"] if buy else book["bids"]
        vwap, depth = sweep(levels, qty)
        return (vwap if name == "sweepQ" else depth), None
    if name == "total":
        side = "bids" if "BIDS" in spec["q"] else "asks"
        return sum(level["s"] for level in book[side]), None
    raise AssertionError(name)


def check(rows: list[dict], label: str) -> dict:
    if len(rows) < MIN_DRAWS:
        raise AssertionError(f"{label}: insufficient books")
    counts = Counter(row["name"] for row in rows)
    if len(counts) < 5:
        raise AssertionError(f"{label}: not all query families reached: {counts}")
    max_error = 0.0
    for row in rows:
        answer, kind = expected(row)
        if kind == "choice":
            correct = [choice["label"] for choice in row["spec"]["choices"] if choice["correct"]]
            if correct != [answer]:
                raise AssertionError(f"{label}: imbalance choice {correct} != {[answer]}")
            if len(correct) != 1 or len(row["spec"]["choices"]) != 3:
                raise AssertionError(f"{label}: malformed imbalance tie-break choices")
        else:
            actual = float(row["spec"]["a"])
            max_error = max(max_error, abs(actual - float(answer)))
            if abs(actual - float(answer)) > 1e-9:
                raise AssertionError(f"{label}/{row['name']}: {actual} != {answer}")
            labels = row["labels"]
            if labels is None or len(labels) != 4 or len(set(labels)) != 4:
                raise AssertionError(f"{label}/{row['name']}: displayed option collision {labels}")
    return {"variant": label, "books": len(rows), "queryCounts": counts, "maxAnswerError": max_error, "pass": True}


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    tie_correct = [choice["label"] for choice in evidence["tie"]["choices"] if choice["correct"]]
    if tie_correct != ["TIE"]:
        raise AssertionError(f"forced equal-imbalance tie failed: {evidence['tie']}")
    print(json.dumps({"game": 9, "drawsPerVariant": evidence["drawsPerVariant"],
                      "variants": [check(evidence["standard"], "standard"), check(evidence["hard"], "hard")],
                      "forcedTie": tie_correct, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
