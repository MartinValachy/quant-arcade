"""Normal-process and theoretical-z checks for Drift Hunt (game 23)."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "23_drift_hunt_check.js"


def check_case(case: dict) -> dict:
    if case["paths"] < MIN_DRAWS:
        raise AssertionError("insufficient paths")
    mean_se = math.sqrt(case["theoreticalVariance"] / case["paths"])
    if abs(case["mean"] - case["theoreticalMean"]) > 5 * mean_se:
        raise AssertionError(f"mean misses theory: {case}")
    variance_error = abs(case["variance"] - case["theoreticalVariance"]) / case["theoreticalVariance"]
    if variance_error > 0.08:
        raise AssertionError(f"variance error {variance_error:.2%}: {case}")
    return {"mu": case["mu"], "sigma": case["sigma"], "n": case["n"], "paths": case["paths"], "varianceRelativeError": variance_error, "pass": True}


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True, encoding="utf-8")
    evidence = json.loads(raw.stdout)
    z_checks = []
    for row in evidence["zChecks"]:
        if abs(row["actual"] - row["expected"]) > 1e-12:
            raise AssertionError(f"theoretical z mismatch: {row}")
        z_checks.append(row)
    print(json.dumps({"game": 23, "pathsPerCase": evidence["pathsPerCase"],
                      "cases": [check_case(case) for case in evidence["cases"]],
                      "zChecks": z_checks, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
