"""Independent checks for game 10 toxicity, edge, realised PnL, and scoring."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "10_toxic_flow_check.js"


def js_round(x: float) -> int:
    # All score examples are at half-tick values where JS Math.round is positive
    # or unambiguous; retain an explicit implementation for the evidence check.
    return math.floor(x + 0.5)


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    if evidence["drawsPerVariant"] < MIN_DRAWS:
        raise AssertionError("toxicity check has fewer than 10,000 trades per variant")

    checked = []
    for result in evidence["results"]:
        cfg = result["cfg"]
        toxicities = result["counterparties"]
        if result["cleanCount"] != math.ceil(cfg["n"] / 2):
            raise AssertionError(f"{result['variant']}: clean/toxic composition mismatch")
        if result["toxicCount"] != cfg["n"] - math.ceil(cfg["n"] / 2):
            raise AssertionError(f"{result['variant']}: toxic count mismatch")
        if not all(cfg["clean"][0] <= t <= cfg["clean"][1] or cfg["toxic"][0] <= t <= cfg["toxic"][1] for t in toxicities):
            raise AssertionError(f"{result['variant']}: toxicity outside configured family bounds")
        p = sum(toxicities) / len(toxicities)
        edge_mean = (cfg["edge"][0] + cfg["edge"][1]) / 2
        real_mean = edge_mean - cfg["impact"] * p
        n = result["n"]
        se_informed = math.sqrt(p * (1 - p) / n)
        # Rounded cents add at most half a cent of deterministic edge error.
        se_edge = (cfg["edge"][1] - cfg["edge"][0]) / math.sqrt(12 * n)
        se_real = math.sqrt(se_edge**2 + cfg["impact"]**2 * p * (1 - p) / n)
        if abs(result["informedRate"] - p) > 5 * se_informed + 1e-12:
            raise AssertionError(f"{result['variant']}: informed rate misses Bernoulli mixture")
        if abs(result["edgeMean"] - edge_mean) > 5 * se_edge + 0.005:
            raise AssertionError(f"{result['variant']}: edge mean misses uniform model")
        if abs(result["realMean"] - real_mean) > 5 * se_real + 0.005:
            raise AssertionError(f"{result['variant']}: realised PnL mean misses theory")
        if abs(result["buyRate"] - 0.5) > 5 * math.sqrt(0.25 / n):
            raise AssertionError(f"{result['variant']}: BUY/SELL side is not balanced")
        if result["outOfBounds"] or result["minTox"] < 0.03 or result["maxTox"] > 0.95:
            raise AssertionError(f"{result['variant']}: toxicity drift/bounds failure")
        if not (result["manualAsk"] and result["askManualBranch"] and result["manualMark"]):
            raise AssertionError(f"{result['variant']}: manual scoring path is incomplete")
        for row in result["scoreExamples"]:
            expected = js_round(row["real"] * cfg["scale"])
            if row["score"] != expected:
                raise AssertionError(f"{result['variant']}: PnL score mismatch")
        checked.append({
            "variant": result["variant"],
            "drawsPerVariant": n,
            "counterparties": len(toxicities),
            "cleanCount": result["cleanCount"],
            "toxicCount": result["toxicCount"],
            "informed_rate_error": result["informedRate"] - p,
            "edge_mean_error": result["edgeMean"] - edge_mean,
            "real_mean_error": result["realMean"] - real_mean,
            "manual_scoring_path": True,
            "pass": True,
        })

    print(json.dumps({"game": 10, "variants": checked, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
