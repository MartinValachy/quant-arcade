"""Independent percentage arithmetic checks for Percentage Sprint (game 14)."""

from __future__ import annotations

import json
import math
import re
import subprocess
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "14_percent_sprint_check.js"


TOLERANCES = {
    "pctOf": 0.01, "whatPct": 0.06, "change": 0.08, "reverse": 0.05,
    "successive": 0.06, "frac": 0.09, "bps": 0.02, "markup": 0.05,
    "share": 0.09, "compound2": 0.12,
}

def js_round(value: float, decimals: int = 2) -> float:
    scale = 10**decimals
    return math.floor(value * scale + 0.5) / scale


def expected(name: str, q: str) -> float:
    q = q.replace("−", "-")
    if name == "pctOf":
        p, n = re.search(r"(\d+)% of ([\d,]+)", q).groups()
        return int(n.replace(",", "")) * int(p) / 100
    if name == "whatPct":
        a, b = re.search(r"([\d,]+) is what % of ([\d,]+)", q).groups()
        return js_round(100 * int(a.replace(",", "")) / int(b.replace(",", "")))
    if name == "change":
        a, b = map(int, re.search(r"From (\d+) to (\d+)", q).groups())
        return js_round(100 * (b - a) / a)
    if name == "reverse":
        sign, p, now = re.search(r"After a ([+\-])(\d+)% move a price is (\d+(?:\.\d+)?)\.", q).groups()
        return float(now) / (1 + (1 if sign == "+" else -1) * int(p) / 100)
    if name == "successive":
        s1, x, s2, y = re.search(r"([+\-])(\d+)% then ([+\-])(\d+)%", q).groups()
        return js_round(((1 + (1 if s1 == "+" else -1) * int(x) / 100) * (1 + (1 if s2 == "+" else -1) * int(y) / 100) - 1) * 100)
    if name == "frac":
        a, b = map(int, re.search(r"(\d+) / (\d+)", q).groups())
        return js_round(100 * a / b)
    if name == "bps":
        bp, n = re.search(r"(\d+) bps on \$([\d,]+)", q).groups()
        return int(n.replace(",", "")) * int(bp) / 10000
    if name == "markup":
        cost, margin = map(int, re.search(r"Cost (\d+), sold at a (\d+)%", q).groups())
        return js_round(cost / (1 - margin / 100))
    if name == "share":
        filled, total = re.search(r"fill is ([\d,]+) of ([\d,]+) lots", q).groups()
        return 100 * int(filled.replace(",", "")) / int(total.replace(",", ""))
    if name == "compound2":
        r, n = map(int, re.search(r"(\d+)% per period, compounded (\d+) periods", q).groups())
        return js_round(((1 + r / 100) ** n - 1) * 100)
    raise AssertionError(name)


def check(name: str, rows: list[dict]) -> dict:
    if len(rows) < MIN_DRAWS:
        raise AssertionError(f"{name}: insufficient cases")
    max_error = 0.0
    for row in rows:
        if row["dp"] != 2 or abs(row["tol"] - TOLERANCES[name]) > 1e-12:
            raise AssertionError(f"{name}: incorrect precision metadata {row}")
        theory = expected(name, row["q"])
        error = abs(float(row["a"]) - theory)
        max_error = max(max_error, error)
        if name == "reverse":
            allowed = 0.011
        else:
            allowed = 1e-9
        if error > allowed:
            raise AssertionError(f"{name}: {row['q']} -> {row['a']} vs {theory}")
    return {"family": name, "cases": len(rows), "maxAnswerError": max_error, "pass": True}


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True, encoding="utf-8")
    evidence = json.loads(raw.stdout)
    results = [check(name, rows) for name, rows in evidence["records"].items()]
    print(json.dumps({"game": 14, "drawsPerFamily": evidence["drawsPerFamily"], "families": results,
                      "zeroBaseReachable": False, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
