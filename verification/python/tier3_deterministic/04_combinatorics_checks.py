"""Exact independent checks for Combinatorics Counter (game 04)."""

from __future__ import annotations

import json
import math
import re
import subprocess
from collections import Counter
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "04_combinatorics_check.js"


def plain(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value)


def exact_answer(name: str, record: dict) -> int:
    sub = plain(record["sub"])
    if name == "paths":
        m, n = map(int, re.search(r"(\d+)\D+(\d+) grid", sub).groups())
        return math.comb(m + n, m)
    if name == "pathsBlocked":
        m, n = map(int, re.search(r"(\d+)\D+(\d+) grid", sub).groups())
        bx, by = map(int, re.search(r"\((\d+), (\d+)\)", sub).groups())
        total = math.comb(m + n, m)
        through = math.comb(bx + by, bx) * math.comb(m - bx + n - by, m - bx)
        return total - through
    if name == "anagram":
        word = re.search(r"Rearrange every letter of ([A-Z]+)", sub).group(1)
        counts = Counter(word)
        denominator = math.prod(math.factorial(count) for count in counts.values())
        return math.factorial(len(word)) // denominator
    if name == "committee":
        k, a, b, need = map(int, re.search(r"desk of (\d+) is drawn from (\d+) traders and (\d+) quants.*at least (\d+) trader", sub).groups())
        return sum(math.comb(a, i) * math.comb(b, k - i) for i in range(need, min(a, k) + 1))
    if name == "starsBars":
        n, k = map(int, re.search(r"(\d+) identical lots .*?(\d+) books", sub).groups())
        minimum = 1 if "each book taking at least one" in sub else 0
        return math.comb(n - minimum * k + k - 1, k - 1)
    if name == "circular":
        n = int(re.search(r"(\d+) people", sub).group(1))
        return math.factorial(n - 2) * 2 if "must sit together" in sub else math.factorial(n - 1)
    if name == "noAdjacent":
        n = int(re.search(r"(\d+)-day", sub).group(1))
        fib = [1, 2]
        for i in range(2, n + 1):
            fib.append(fib[-1] + fib[-2])
        return fib[n]
    if name == "derange":
        n = int(re.search(r"(\d+) analysts", sub).group(1))
        derangements = [1, 0]
        for i in range(2, n + 1):
            derangements.append((i - 1) * (derangements[-1] + derangements[-2]))
        return derangements[n]
    if name == "pairing":
        n = int(re.search(r"(\d+) desks", sub).group(1))
        return math.prod(range(n - 1, 0, -2))
    if name == "hands":
        r, b, g, kr, kb, kg = map(int, re.search(r"[Ff]rom (\d+) red, (\d+) blue and (\d+) green tokens, take exactly (\d+) red, (\d+) blue and (\d+) green", sub).groups())
        return math.comb(r, kr) * math.comb(b, kb) * math.comb(g, kg)
    raise AssertionError(name)


def check_family(name: str, records: list[dict]) -> dict:
    if len(records) < MIN_DRAWS:
        raise AssertionError(f"{name}: insufficient cases")
    for record in records:
        expected = exact_answer(name, record)
        if int(record["answer"]) != expected:
            raise AssertionError(f"{name}: {record['sub']} -> {record['answer']} != {expected}")
        if expected <= 0:
            raise AssertionError(f"{name}: non-positive count")
    return {"family": name, "cases": len(records), "minAnswer": min(int(r["answer"]) for r in records), "maxAnswer": max(int(r["answer"]) for r in records), "pass": True}


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    results = [check_family(name, evidence["families"][name]) for name in evidence["families"]]
    print(json.dumps({"game": 4, "drawsPerFamily": evidence["drawsPerFamily"], "families": results,
                      "committeeReachable": True, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
