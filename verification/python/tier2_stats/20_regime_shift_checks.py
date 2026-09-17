"""Independent normal-process and changepoint checks for game 20."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

import numpy as np

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "20_regime_shift_check.js"


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    checked = []
    for index, result in enumerate(evidence["results"]):
        cfg = result["cfg"]
        n = result["n"]
        if n < MIN_DRAWS:
            raise AssertionError(f"{result['variant']}: fewer than 10,000 rounds")
        lo = math.floor(cfg["len"] * 0.45)
        hi = math.floor(cfg["len"] * 0.72 - 1e-12)
        if result["minTau"] < lo or result["maxTau"] > hi:
            raise AssertionError(f"{result['variant']}: tau outside [floor(.45L), floor(.72L))")
        p_vol = result["volShifts"] / n
        if abs(p_vol - 0.4) > 5 * math.sqrt(0.4 * 0.6 / n):
            raise AssertionError(f"{result['variant']}: volatility-shift Bernoulli mismatch")
        if result["posDrift"] + result["negDrift"] != n:
            raise AssertionError(f"{result['variant']}: drift sign count mismatch")
        fixed = result["fixedRound"]
        pre = result["pre"]
        post = result["post"]
        if pre["post"] or not post["post"]:
            raise AssertionError(f"{result['variant']}: tau boundary convention mismatch")
        expected_pre_mean, expected_pre_var = 0.0, cfg["sigma"] ** 2
        expected_post_mean = 0.0 if fixed["volShift"] else fixed["drift"]
        expected_post_var = cfg["sigma"] ** 2 * (fixed["vmult"] ** 2 if fixed["volShift"] else 1)
        for sample, expected_mean, expected_var, label in (
            (result["preSample"], expected_pre_mean, expected_pre_var, "pre"),
            (result["postSample"], expected_post_mean, expected_post_var, "post"),
        ):
            mean_se = math.sqrt(expected_var / sample["n"])
            if abs(sample["mean"] - expected_mean) > 5 * mean_se:
                raise AssertionError(f"{result['variant']} {label}: normal mean mismatch")
            if abs(sample["variance"] - expected_var) / expected_var > 0.10:
                raise AssertionError(f"{result['variant']} {label}: normal variance mismatch")
        # Independent NumPy check on the same fixed theoretical regimes.
        rng = np.random.default_rng(2005000 + index * 100000)
        py_pre = rng.normal(expected_pre_mean, math.sqrt(expected_pre_var), n)
        py_post = rng.normal(expected_post_mean, math.sqrt(expected_post_var), n)
        if abs(float(np.mean(py_pre))) > 5 * math.sqrt(expected_pre_var / n):
            raise AssertionError(f"{result['variant']}: Python pre mean mismatch")
        checked.append({
            "variant": result["variant"],
            "rounds": n,
            "tau_range": [result["minTau"], result["maxTau"]],
            "vol_shift_rate": p_vol,
            "fixed_tau": fixed["tau"],
            "boundary": {"i=tau_is_post": pre["post"], "i=tau+1_is_post": post["post"]},
            "pre_mean": result["preSample"]["mean"],
            "post_mean": result["postSample"]["mean"],
            "pass": True,
        })
    print(json.dumps({"game": 20, "variants": checked, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
