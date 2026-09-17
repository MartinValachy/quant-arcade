"""Independent Kelly and bankroll-floor/ruin checks for game 24."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

import numpy as np

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "24_kelly_check.js"
PATHS = 10_000
BLOCKS = 50


def js_round(x: float, digits: int) -> float:
    scale = 10**digits
    return math.floor(x * scale + 0.5) / scale


def make_bet(rng: np.random.Generator, cfg: dict) -> dict[str, float | bool]:
    guard = 0
    while True:
        p = js_round(float(rng.uniform(cfg["p"][0], cfg["p"][1])), 2)
        b = js_round(float(rng.uniform(cfg["b"][0], cfg["b"][1])), 1)
        edge = p * b - (1 - p)
        want_bad = bool(rng.random() < cfg["badRate"])
        if not (guard < 80 and ((want_bad and edge > 0) or ((not want_bad) and edge <= 0.04))):
            return {"p": p, "b": b, "edge": edge, "fStar": edge / b, "isTrap": edge / b <= 0}
        guard += 1


def settle(bank: float, bet: dict, f: float, rng: np.random.Generator, cfg: dict) -> tuple[float, int]:
    floor_hits = 0
    for _ in range(cfg["reps"]):
        won = bool(rng.random() < bet["p"])
        bank = bank * (1 + f * bet["b"]) if won else bank * (1 - f)
        if bank < 1:
            bank = 1
            floor_hits += 1
    return bank, floor_hits


def fraction(policy: str, bet: dict) -> float:
    if policy == "zero":
        return 0.0
    if policy == "kelly":
        return max(0.0, float(bet["fStar"]))
    if policy == "doubleKelly":
        return min(1.0, max(0.0, 2 * float(bet["fStar"])))
    return 1.0


def simulate(cfg: dict, policy: str, seed: int) -> dict[str, float | int]:
    rng = np.random.default_rng(seed)
    paths_ruined = floor_blocks = floor_events = ruin_blocks = total_blocks = traps = invalid = 0
    f_star_sum = 0.0
    for _ in range(PATHS):
        bank = float(cfg["start"])
        for _ in range(BLOCKS):
            bet = make_bet(rng, cfg)
            if not all(math.isfinite(float(bet[key])) for key in ("p", "b", "fStar")):
                invalid += 1
            traps += int(bet["isTrap"])
            f_star_sum += float(bet["fStar"])
            bank, hits = settle(bank, bet, fraction(policy, bet), rng, cfg)
            total_blocks += 1
            if hits:
                floor_blocks += 1
                floor_events += hits
            if bank <= cfg["ruin"]:
                ruin_blocks += 1
                paths_ruined += 1
                break
    return {
        "paths": PATHS,
        "blocks": BLOCKS,
        "totalBlocks": total_blocks,
        "pathsRuined": paths_ruined,
        "floorBlocks": floor_blocks,
        "floorEvents": floor_events,
        "ruinBlocks": ruin_blocks,
        "traps": traps,
        "invalid": invalid,
        "floorBlockRate": floor_blocks / total_blocks,
        "ruinPathRate": paths_ruined / PATHS,
        "ruinBlockRate": ruin_blocks / total_blocks,
    }


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True)
    evidence = json.loads(raw.stdout)
    checked = []
    for variant_index, result in enumerate(evidence["results"]):
        cfg = result["cfg"]
        for policy_index, node_policy in enumerate(result["policies"]):
            if node_policy["paths"] < MIN_DRAWS or node_policy["invalid"]:
                raise AssertionError(f"{result['variant']} {node_policy['policy']}: invalid evidence")
            py_policy = simulate(cfg, node_policy["policy"], 2400000 + policy_index * 10000 + variant_index * 100000)
            for key in ("floorBlockRate", "ruinPathRate", "ruinBlockRate"):
                a, b = node_policy[key], py_policy[key]
                se = math.sqrt(max(1e-12, a * (1 - a) / max(1, node_policy["totalBlocks"] if key != "ruinPathRate" else PATHS) + b * (1 - b) / max(1, py_policy["totalBlocks"] if key != "ruinPathRate" else PATHS)))
                if abs(a - b) > 5 * se + 0.02:
                    raise AssertionError(f"{result['variant']} {node_policy['policy']}: {key} differs")
            checked.append({
                "variant": result["variant"],
                "policy": node_policy["policy"],
                "node_total_blocks": node_policy["totalBlocks"],
                "node_floor_block_rate": node_policy["floorBlockRate"],
                "node_floor_events": node_policy["floorEvents"],
                "node_ruin_path_rate": node_policy["ruinPathRate"],
                "python_floor_block_rate": py_policy["floorBlockRate"],
                "python_ruin_path_rate": py_policy["ruinPathRate"],
                "pass": True,
            })
    print(json.dumps({"game": 24, "policies": checked, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
