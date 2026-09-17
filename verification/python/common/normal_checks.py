"""Cross-check the shipped JS normal helpers against scipy.stats.norm."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import numpy as np
from scipy.stats import norm


ROOT = Path(__file__).resolve().parents[3]


def js_values() -> dict[str, list[float]]:
    script = r'''
const path = require("path");
const root = process.cwd();
global.window = global;
require(path.join(root, "js", "core", "rng.js"));
require(path.join(root, "js", "core", "util.js"));
require(path.join(root, "js", "core", "percentile.js"));
const ps = [1e-6, 1e-4, 0.001, 0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 0.999, 0.9999, 1 - 1e-6];
const xs = [-8, -5, -3, -2, -1, 0, 1, 2, 3, 5, 8];
console.log(JSON.stringify({
  ps: ps,
  inv: ps.map(p => window.QA.pct.invNorm(p)),
  xs: xs,
  cdf: xs.map(x => window.QA.u.ncdf(x))
}));
'''
    result = subprocess.run(
        ["node", "-e", script], cwd=ROOT, check=True, capture_output=True, text=True
    )
    return json.loads(result.stdout)


def main() -> int:
    actual = js_values()
    ps = np.asarray(actual["ps"])
    inv_expected = norm.ppf(ps)
    inv_error = float(np.max(np.abs(np.asarray(actual["inv"]) - inv_expected)))

    xs = np.asarray(actual["xs"])
    cdf_expected = norm.cdf(xs)
    cdf_error = float(np.max(np.abs(np.asarray(actual["cdf"]) - cdf_expected)))

    # This finite-precision Acklam implementation is accurate to roughly 1e-8
    # at the sampled tails; the shipped low-cost CDF approximation is intentionally
    # looser and is checked against its known scale.
    inv_ok = inv_error < 1e-8
    cdf_ok = cdf_error < 8e-8
    result = {
        "invNorm": {"n": len(ps), "max_abs_error": inv_error, "pass": inv_ok},
        "ncdf": {"n": len(xs), "max_abs_error": cdf_error, "pass": cdf_ok},
        "pass": inv_ok and cdf_ok,
    }
    print(json.dumps(result, indent=2))
    return 0 if result["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
