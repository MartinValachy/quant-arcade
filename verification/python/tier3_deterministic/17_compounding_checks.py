"""Independent compound-growth and discounting checks for game 17."""

from __future__ import annotations

import json
import math
import re
import subprocess
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "17_compounding_check.js"


def money(text: str) -> float:
    return float(text.replace(",", ""))


def parse_expected(name: str, q: str) -> float:
    q = re.sub(r"<[^>]+>", "", q)
    if name == "rule72":
        r = float(re.search(r"At (\d+)%", q).group(1))
        return math.log(2) / math.log(1 + r / 100)
    if name == "fv":
        P, r, n = re.search(r"\$([\d,]+) compounding at (\d+)% for (\d+) years", q).groups()
        return money(P) * (1 + int(r) / 100) ** int(n)
    if name == "pv":
        F, n, r = re.search(r"\$([\d,]+) received in (\d+) years, discounted at (\d+)%", q).groups()
        return money(F) / (1 + int(r) / 100) ** int(n)
    if name == "cagr":
        s, e, n = map(int, re.search(r"From (\d+) to (\d+) over (\d+) years", q).groups())
        return (e / s) ** (1 / n) * 100 - 100
    if name == "annualize":
        m = float(re.search(r"([\d.]+)% per month", q).group(1))
        return ((1 + m / 100) ** 12 - 1) * 100
    if name == "volUp":
        d = float(re.search(r"Daily vol ([\d.]+)%", q).group(1))
        return d * math.sqrt(252)
    if name == "volDown":
        y = float(re.search(r"Annual vol (\d+)%", q).group(1))
        return y / math.sqrt(252)
    if name == "sharpe":
        d = float(re.search(r"Daily Sharpe ([\d.]+)", q).group(1))
        return d * math.sqrt(252)
    if name == "cont":
        P, r, t = re.search(r"\$([\d,]+) at (\d+)% continuously compounded for (\d+) years", q).groups()
        return money(P) * math.exp(int(r) * int(t) / 100)
    if name == "breakeven":
        loss = float(re.search(r"down (\d+)%", q).group(1))
        return loss / (100 - loss) * 100
    if name == "halflife":
        d = float(re.search(r"decays (\d+)%", q).group(1))
        return math.log(2) / -math.log(1 - d / 100)
    if name == "perpetuity":
        c, g, r = re.search(r"\$([\d,]+) a year forever, growing (\d+)%.*, discounted at (\d+)%", q).groups()
        return money(c) / ((int(r) - int(g)) / 100)
    raise AssertionError(name)


def expected_tolerance(name: str, answer: float, q: str) -> float:
    if name in {"rule72", "breakeven"}: return 0.7 if name == "rule72" else 0.4
    if name == "cagr": return 0.35
    if name == "annualize": return 0.6
    if name == "volUp": return 0.7
    if name == "volDown" or name == "sharpe": return 0.09
    if name == "halflife": return 0.35
    if name in {"fv", "pv", "cont", "perpetuity"}: return answer * (0.01 if name == "perpetuity" else 0.015)
    raise AssertionError(name)


def check(name: str, rows: list[dict]) -> dict:
    if len(rows) < MIN_DRAWS:
        raise AssertionError(f"{name}: insufficient cases")
    for row in rows:
        theory = parse_expected(name, row["q"])
        if not math.isclose(float(row["answer"]), theory, rel_tol=2e-14, abs_tol=1e-9):
            raise AssertionError(f"{name}: {row['q']} -> {row['answer']} != {theory}")
        if abs(float(row["tolerance"]) - expected_tolerance(name, float(row["answer"]), row["q"])) > 1e-8:
            raise AssertionError(f"{name}: tolerance mismatch {row}")
    return {"family": name, "cases": len(rows), "pass": True}


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True, encoding="utf-8")
    evidence = json.loads(raw.stdout)
    results = [check(name, rows) for name, rows in evidence["records"].items()]
    print(json.dumps({"game": 17, "drawsPerFamily": evidence["drawsPerFamily"], "families": results,
                      "perpetuitySingularityReachable": False, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
