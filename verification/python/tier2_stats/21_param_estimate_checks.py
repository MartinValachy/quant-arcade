"""Closed-form and Monte Carlo verification for game 21 estimators."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

import numpy as np
from scipy.special import gammaln

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "21_param_estimate_check.js"


def js_round(x: float, digits: int) -> float:
    scale = 10**digits
    return math.floor(x * scale + 0.5) / scale


def expected_se(family: str, calls: list[dict]) -> float:
    ints = [c["value"] for c in calls if c["method"] == "int"]
    unis = [c["value"] for c in calls if c["method"] == "uni"]
    if family == "tank":
        N, k = ints[0], ints[1]
        return math.sqrt((N + 1) * (N - k) / (k * (k + 2)))
    if family == "mean":
        sd, n = ints[1], ints[2]
        return sd / math.sqrt(n)
    if family == "sd":
        sd, n = ints[1], ints[2]
        return sd / math.sqrt(2 * n)
    if family == "bern":
        p, n = js_round(unis[0], 3), ints[0]
        return math.sqrt(p * (1 - p) / n) * 100
    if family == "unif":
        theta, n = ints[0], ints[1]
        return theta / math.sqrt(n * (n + 2))
    if family == "pois":
        lam, n = js_round(unis[0], 1), ints[0]
        return math.sqrt(lam / n)
    raise AssertionError(family)


def exact_sd_se(sigma: float, n: int) -> float:
    nu = n - 1
    log_c4 = 0.5 * math.log(2 / nu) + gammaln((nu + 1) / 2) - gammaln(nu / 2)
    c4 = math.exp(log_c4)
    return sigma * math.sqrt(max(0.0, 1 - c4 * c4))


def monte_carlo() -> dict:
    rng = np.random.default_rng(2109000)
    tank_rows = []
    for N, k in ((200, 4), (1000, 6), (2000, 9)):
        reps = 10_000
        maxima = np.empty(reps)
        for i in range(reps):
            maxima[i] = np.max(rng.choice(np.arange(1, N + 1), size=k, replace=False))
        estimates = maxima * (k + 1) / k - 1
        theory_se = math.sqrt((N + 1) * (N - k) / (k * (k + 2)))
        tank_rows.append({"N": N, "k": k, "n": reps, "empirical_se": float(np.std(estimates, ddof=1)), "theory_se": theory_se})

    uniform_rows = []
    for theta, n in ((100, 4), (250, 7), (500, 10)):
        reps = 20_000
        sample_max = rng.uniform(0, theta, size=(reps, n)).max(axis=1)
        estimates = sample_max * (n + 1) / n
        theory_se = theta / math.sqrt(n * (n + 2))
        uniform_rows.append({"theta": theta, "n": n, "n_draws": reps, "empirical_se": float(np.std(estimates, ddof=1)), "theory_se": theory_se})

    sd_rows = []
    for n in range(6, 15):
        reps = 20_000
        sigma = 20.0
        sample = rng.normal(100, sigma, size=(reps, n))
        estimates = sample.std(axis=1, ddof=1)
        exact = exact_sd_se(sigma, n)
        approx = sigma / math.sqrt(2 * n)
        sd_rows.append({"n": n, "n_draws": reps, "empirical_se": float(np.std(estimates, ddof=1)), "exact_se": exact, "approx_se": approx, "approx_relative_error": approx / exact - 1})
    return {"tank": tank_rows, "uniform": uniform_rows, "sd": sd_rows}


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    formula_rows = []
    for family in evidence["families"]:
        if family["n"] < MIN_DRAWS:
            raise AssertionError(f"{family['family']}: fewer than 10,000 cases")
        max_error = 0.0
        for record in family["records"]:
            if not record["finite"]:
                raise AssertionError(f"{family['family']}: non-finite estimator")
            max_error = max(max_error, abs(record["se"] - expected_se(family["family"], record["calls"])))
        if max_error > 1e-10:
            raise AssertionError(f"{family['family']}: standard-error formula mismatch")
        formula_rows.append({"family": family["family"], "cases": family["n"], "max_se_error": max_error, "pass": True})

    mc = monte_carlo()
    for row in mc["tank"] + mc["uniform"]:
        if abs(row["empirical_se"] - row["theory_se"]) > 0.08 * row["theory_se"]:
            raise AssertionError(f"{row}: estimator Monte Carlo SE mismatch")
    max_approx_error = max(abs(row["approx_relative_error"]) for row in mc["sd"])
    print(json.dumps({"game": 21, "formula_checks": formula_rows, "monte_carlo": mc, "sd_max_approx_relative_error": max_approx_error, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
