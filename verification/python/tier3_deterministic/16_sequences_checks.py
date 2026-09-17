"""Independent recurrence checks for Sequence Break (game 16)."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "16_sequences_check.js"
PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61]


def values(calls: list[dict], method: str) -> list:
    return [call["value"] for call in calls if call["method"] == method]


def expected(name: str, calls: list[dict]) -> list[int]:
    ints, picks, bools = values(calls, "int"), values(calls, "pick"), values(calls, "bool")
    if name == "arith":
        a, magnitude = ints
        d = magnitude if bools[0] else -magnitude
        return [a + d * n for n in range(7)]
    if name == "geom":
        a, r = ints[0], picks[0]
        return [a * r**n for n in range(7)]
    if name == "quad":
        a, b, c = ints
        return [a * n * n + b * n + c for n in range(7)]
    if name == "fib":
        x, y, k = ints[0], ints[1], picks[0]
        out = [x, y]
        while len(out) < 7:
            out.append(k * out[-1] + out[-2])
        return out
    if name == "affine":
        a, m, c = ints[0], picks[0], ints[1]
        out = [a]
        while len(out) < 7:
            out.append(m * out[-1] + c)
        return out
    if name == "altern":
        a, d = ints
        return [a + d * n * (1 if n % 2 == 0 else -1) for n in range(7)]
    if name == "interleave":
        a, d, b, r = ints[0], ints[1], ints[2], picks[0]
        return [a + d * (n // 2) if n % 2 == 0 else b * r ** ((n - 1) // 2) for n in range(7)]
    if name == "cubic":
        a, b, c = picks[0], ints[0], ints[1]
        return [a * n**3 + b * n + c for n in range(7)]
    if name == "squarePlus":
        k, m = ints[0], picks[0]
        return [m * (n + 1) ** 2 + k for n in range(7)]
    if name == "triangular":
        s, k = ints
        return [((n + s) * (n + s + 1)) // 2 + k for n in range(7)]
    if name == "primes":
        s, m, k = ints[0], picks[0], ints[1]
        return [m * PRIMES[n + s] + k for n in range(7)]
    if name == "factorialish":
        k = ints[0]
        return [math.factorial(n + 2) + k for n in range(7)]
    if name == "doubleDiff":
        a, d, dd = ints
        out = [a]
        for _ in range(6):
            out.append(out[-1] + d)
            d += dd
        return out
    raise AssertionError(name)


def check(name: str, rows: list[dict]) -> dict:
    if len(rows) < MIN_DRAWS:
        raise AssertionError(f"{name}: insufficient sequences")
    for row in rows:
        theory = expected(name, row["calls"])
        if row["terms"] != theory:
            raise AssertionError(f"{name}: {row['terms']} != {theory}")
        if any(not isinstance(value, int) or not math.isfinite(value) or abs(value) > 1e9 for value in row["terms"]):
            raise AssertionError(f"{name}: invalid live-game bounds {row['terms']}")
    return {"family": name, "cases": len(rows), "pass": True}


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True, encoding="utf-8")
    evidence = json.loads(raw.stdout)
    results = [check(name, rows) for name, rows in evidence["records"].items()]
    print(json.dumps({"game": 16, "drawsPerFamily": evidence["drawsPerFamily"], "families": results, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
