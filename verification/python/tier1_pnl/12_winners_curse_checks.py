"""Independent distribution and slider-bound checks for game 12."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

import numpy as np

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "12_winners_curse_check.js"


def independent_simulation(cfg: dict, n: int, seed: int) -> dict[str, float | int]:
    rng = np.random.default_rng(seed)
    V = np.floor(rng.uniform(120, 480, n) + 0.5)
    sd = rng.uniform(cfg["noise"][0], cfg["noise"][1], n)
    rivals = rng.integers(cfg["rivals"][0], cfg["rivals"][1] + 1, n)
    my_signal = V + rng.normal(0, sd)
    top = np.full(n, -np.inf)
    for i in range(int(np.max(rivals))):
        active = rivals > i
        signal = V + rng.normal(0, sd)
        shade = rng.uniform(cfg["rivalShade"][0], cfg["rivalShade"][1], n)
        bids = signal - sd * shade
        top = np.maximum(top, np.where(active, bids, -np.inf))
    lo = np.floor(my_signal - 3.2 * sd + 0.5)
    hi = np.floor(my_signal + 0.6 * sd + 0.5)
    positive = top < V
    optimal = np.floor(top + 1)
    excluded = positive & ((optimal < lo) | (optimal > hi))
    lower = positive & (optimal < lo)
    upper = positive & (optimal > hi)
    count = max(1, int(np.sum(positive)))
    return {
        "positive": int(np.sum(positive)),
        "excluded": int(np.sum(excluded)),
        "lower": int(np.sum(lower)),
        "upper": int(np.sum(upper)),
        "rate": float(np.sum(excluded) / count),
        "lower_rate": float(np.sum(lower) / count),
        "upper_rate": float(np.sum(upper) / count),
    }


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    if evidence["drawsPerVariant"] < MIN_DRAWS:
        raise AssertionError("winner's curse check has fewer than 10,000 rounds per variant")
    checked = []
    for index, result in enumerate(evidence["results"]):
        if result["boundErrors"] or result["scoreErrors"] or result["minWidth"] < 1:
            raise AssertionError(f"{result['variant']}: invalid slider or score behavior")
        independent = independent_simulation(result["cfg"], 100_000, 12000 + index)
        # The two simulations use independent RNGs; compare rates with a conservative
        # combined 5-SE bound. This checks the distribution, not bit-for-bit draws.
        p_js = result["exclusionRate"]
        p_py = independent["rate"]
        se = math.sqrt(max(1e-12, p_js * (1 - p_js) / result["n"] + p_py * (1 - p_py) / 100_000))
        if abs(p_js - p_py) > 5 * se + 0.01:
            raise AssertionError(f"{result['variant']}: independent exclusion rate disagrees")
        checked.append({
            "variant": result["variant"],
            "node_rounds": result["n"],
            "positive_optimum_rounds": result["positiveOptimum"],
            "node_exclusion_rate": result["exclusionRate"],
            "node_lower_rate": result["lowerRate"],
            "node_upper_rate": result["upperRate"],
            "independent_python_exclusion_rate": p_py,
            "mean_profit_gap": result["meanProfitGap"],
            "pass": True,
        })
    print(json.dumps({"game": 12, "variants": checked, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
