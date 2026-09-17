"""Independent exact re-derivation of all game 11 question families."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "11_delta_hedge_check.js"


def js_round(x: float, digits: int) -> float:
    scale = 10**digits
    return math.floor(x * scale + 0.5) / scale


def values(record: dict) -> tuple[float, float]:
    calls = record["calls"]
    ints = [c["value"] for c in calls if c["method"] == "int"]
    unis = [c["value"] for c in calls if c["method"] == "uni"]
    picks = [c["value"] for c in calls if c["method"] == "pick"]
    bools = [c["value"] for c in calls if c["method"] == "bool"]
    family = record["family"]
    if family == "betaFut":
        q, px = ints[0] * 500, ints[1]
        beta = js_round(unis[0], 2)
        a = q * px * beta / (picks[0] * picks[1])
        tol = max(0.05, a * 0.02)
    elif family == "minVar":
        rho, sa, sb = (js_round(unis[i], 2) for i in range(3))
        q = ints[0] * 1000
        a = q * rho * sa / sb
        tol = max(1, a * 0.02)
    elif family == "optionDelta":
        nc, np_ = ints[0], ints[1]
        dc, dp = js_round(unis[0], 2), js_round(unis[1], 2)
        a = -100 * (nc * dc - np_ * dp)
        tol = 1
    elif family == "pairs":
        qa, pa, pb = ints[0] * 500, ints[1], ints[2]
        beta = js_round(unis[0], 2)
        a = qa * pa * beta / pb
        tol = max(1, a * 0.015)
    elif family == "netBeta":
        w1, w2 = ints[0] * 100000, ints[1] * 100000
        b1, b2 = js_round(unis[0], 2), js_round(unis[1], 2)
        shrt = bools[0]
        if shrt and w1 == w2:
            if len(ints) < 3:
                raise AssertionError("equal-notional short case was not rerolled")
            w2 = ints[-1] * 100000
        denominator = w1 + (-1 if shrt else 1) * w2
        a = (w1 * b1 + (-1 if shrt else 1) * w2 * b2) / denominator
        tol = max(0.01, abs(a) * 0.02)
    elif family == "dv01":
        notional = ints[0] * 1_000_000
        dur_p, dur_h = js_round(unis[0], 1), js_round(unis[1], 1)
        a = notional * dur_p / dur_h
        tol = a * 0.01
    elif family == "crossFx":
        q = ints[0] * 100000
        fx, beta = js_round(unis[0], 4), js_round(unis[1], 2)
        a = q * beta / fx
        tol = a * 0.01
    else:
        raise AssertionError(family)
    return a, tol


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    summary = []
    for family in evidence["families"]:
        if family["n"] < MIN_DRAWS:
            raise AssertionError(f"{family['family']}: fewer than 10,000 cases")
        max_answer_error = 0.0
        max_tolerance_error = 0.0
        for record in family["records"]:
            record["family"] = family["family"]
            if not record["finite"]:
                raise AssertionError(f"{family['family']}: non-finite shipped item")
            expected, expected_tol = values(record)
            max_answer_error = max(max_answer_error, abs(record["answer"] - expected))
            max_tolerance_error = max(max_tolerance_error, abs(record["tolerance"] - expected_tol))
            if max_answer_error > 1e-7 or max_tolerance_error > 1e-7:
                raise AssertionError(f"{family['family']}: formula mismatch")
        summary.append({
            "family": family["family"],
            "cases": family["n"],
            "max_answer_error": max_answer_error,
            "max_tolerance_error": max_tolerance_error,
            "pass": True,
        })
    forced = evidence["forced"]
    if forced["intCalls"] < 3 or not forced["finite"]:
        raise AssertionError("forced equal-notional short case did not exercise finite reroll")
    print(json.dumps({"game": 11, "families": summary, "forced_equal_short": forced, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
