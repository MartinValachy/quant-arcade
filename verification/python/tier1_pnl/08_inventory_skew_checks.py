"""Independent checks for game 08 quote flow and inventory-risk mechanics."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

import numpy as np

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "08_inventory_skew_check.js"


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    if evidence["drawsPerRow"] < MIN_DRAWS:
        raise AssertionError("fill check has fewer than 10,000 trials per row")

    checked = []
    for result in evidence["results"]:
        cfg = result["cfg"]
        for row in result["rows"]:
            skew = row["skew"]
            p = 1 / (1 + math.exp(skew * cfg["beta"]))
            bid = 100 - cfg["half"] + skew * cfg["tick"]
            ask = 100 + cfg["half"] + skew * cfg["tick"]
            edge_buy = ask - 100
            edge_sell = 100 - bid
            edge = p * edge_buy + (1 - p) * edge_sell
            inv_delta = 1 - 2 * p
            se_p = math.sqrt(p * (1 - p) / result["n"])
            se_edge = math.sqrt((p * (edge_buy - edge) ** 2 + (1 - p) * (edge_sell - edge) ** 2) / result["n"])
            se_inv = math.sqrt(4 * p * (1 - p) / result["n"])
            for actual, expected, se, label in (
                (row["pBuyEmpirical"], p, se_p, "fill probability"),
                (row["edgeEmpirical"], edge, se_edge, "edge"),
                (row["invDeltaEmpirical"], inv_delta, se_inv, "inventory delta"),
            ):
                if abs(actual - expected) > 5 * se + 1e-12:
                    raise AssertionError(f"{result['variant']} skew {skew}: {label} misses theory")
            if abs(row["quote"]["bid"] - bid) > 1e-12 or abs(row["quote"]["ask"] - ask) > 1e-12:
                raise AssertionError(f"{result['variant']} skew {skew}: quote mismatch")
        for row in result["liquidation"]:
            if row["after"] != 0:
                raise AssertionError(f"{result['variant']}: breach did not fully liquidate {row['inv']}")
        for row in result["carry"]:
            expected = round(cfg["carry"] * row["inv"] * row["inv"])
            if row["charge"] != expected:
                raise AssertionError(f"{result['variant']}: capital charge mismatch at {row['inv']}")
        checked.append({
            "variant": result["variant"],
            "drawsPerRow": result["n"],
            "skews": [row["skew"] for row in result["rows"]],
            "max_fill_probability_error": max(
                abs(row["pBuyEmpirical"] - row["pBuyTheory"]) for row in result["rows"]
            ),
            "max_edge_error": max(abs(row["edgeEmpirical"] - row["edgeTheory"]) for row in result["rows"]),
            "liquidation_cases": len(result["liquidation"]),
            "capital_charge_cases": len(result["carry"]),
            "pass": True,
        })

    print(json.dumps({"game": 8, "variants": checked, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
