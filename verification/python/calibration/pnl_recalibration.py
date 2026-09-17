"""Recalibrate corrected PnL-game anchors with explicit, reproducible policies.

The original scratch calibrator is not present in the repository history. This
replacement therefore documents its policy assumptions in code instead of
claiming bit-for-bit reproduction. Four policy medians become p50/p90/p95/p99
anchors; SD is the p90-policy run SD, matching CALIBRATION.md's stated contract.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[2]
RUNS = 4000


@dataclass(frozen=True)
class InvConfig:
    flow_ms: int
    sigma: float
    half: float
    tick: float
    beta: float
    limit: int
    scale: int
    liq_pen: int
    carry: float


INV = {
    "standard": InvConfig(800, 0.070, 0.10, 0.02, 1.10, 8, 130, 260, 1.2),
    "hard": InvConfig(520, 0.100, 0.08, 0.02, 0.95, 6, 95, 340, 1.6),
}


def js_round(value: float) -> int:
    return math.floor(value + 0.5) if value >= 0 else math.ceil(value - 0.5)


def inventory_run(cfg: InvConfig, gain: float, reaction_ms: int, rng: np.random.Generator, *, legacy_half_liquidation: bool = False) -> float:
    duration = 80_000
    price, inv, score, last_mark, skew = 100.0, 0, 0.0, 100.0, 0
    next_price, next_flow, next_mark, next_policy = 100, cfg.flow_ms, 1000, reaction_ms
    while min(next_price, next_flow, next_mark, next_policy) <= duration:
        now = min(next_price, next_flow, next_mark, next_policy)
        if now == next_price:
            price += float(rng.normal(0, cfg.sigma))
            next_price += 100
        if now == next_flow:
            offset = skew * cfg.tick
            bid, ask = price - cfg.half + offset, price + cfg.half + offset
            p_buy = 1 / (1 + math.exp(skew * cfg.beta))
            if rng.random() < p_buy:
                edge, inv = ask - price, inv - 1
            else:
                edge, inv = price - bid, inv + 1
            score += js_round(edge * cfg.scale)
            if abs(inv) > cfg.limit:
                score -= cfg.liq_pen
                inv = 0 if not legacy_half_liquidation else math.trunc(inv / 2)
            next_flow += cfg.flow_ms
        if now == next_mark:
            score += js_round(inv * (price - last_mark) * cfg.scale)
            last_mark = price
            score -= js_round(cfg.carry * inv * inv)
            next_mark += 1000
        if now == next_policy:
            skew = max(-4, min(4, int(round(-gain * inv))))
            next_policy += reaction_ms
    score -= js_round(abs(inv) * cfg.half * 2 * cfg.scale)
    return score


def simulate_inventory(variant: str, policy: tuple[str, float, int], seed: int, *, legacy: bool = False) -> np.ndarray:
    cfg = INV[variant]
    _, gain, reaction = policy
    rng = np.random.default_rng(seed)
    return np.asarray([inventory_run(cfg, gain, reaction, rng, legacy_half_liquidation=legacy) for _ in range(RUNS)], dtype=float)


@dataclass(frozen=True)
class ToxicConfig:
    n: int
    impact: float
    edge_lo: float
    edge_hi: float
    clean_lo: float
    clean_hi: float
    toxic_lo: float
    toxic_hi: float
    drift: float
    scale: int


TOXIC = {
    "standard": ToxicConfig(4, 2.0, 0.05, 2.0, 0.02, 0.16, 0.76, 0.94, 0, 150),
    "hard": ToxicConfig(5, 2.4, 0.05, 1.6, 0.04, 0.22, 0.70, 0.92, 0.006, 190),
}


def toxic_run(cfg: ToxicConfig, policy: str, rng: np.random.Generator) -> float:
    clean_count = math.ceil(cfg.n / 2)
    kinds = np.asarray([True] * clean_count + [False] * (cfg.n - clean_count))
    rng.shuffle(kinds)
    tox = np.where(kinds, rng.uniform(cfg.clean_lo, cfg.clean_hi, cfg.n), rng.uniform(cfg.toxic_lo, cfg.toxic_hi, cfg.n))
    alpha = np.ones(cfg.n)
    beta = np.ones(cfg.n)
    score = 0.0
    for _ in range(72 if cfg.drift == 0 else 68):
        if cfg.drift:
            tox = np.clip(tox + rng.normal(0, cfg.drift * 12, cfg.n), 0.03, 0.95)
        idx = int(rng.integers(0, cfg.n))
        edge = math.floor(float(rng.uniform(cfg.edge_lo, cfg.edge_hi)) * 100 + 0.5) / 100
        if policy == "threshold_035":
            accept = edge > 0.35
        elif policy == "threshold_025":
            accept = edge > 0.25
        elif policy == "threshold_015":
            accept = edge > 0.15
        elif policy == "bayes":
            accept = edge > cfg.impact * alpha[idx] / (alpha[idx] + beta[idx])
        else:
            raise AssertionError(policy)
        informed = bool(rng.random() < tox[idx])
        real = edge - (cfg.impact if informed else 0)
        alpha[idx] += informed
        beta[idx] += not informed
        if accept:
            score += math.floor(real * cfg.scale + 0.5)
    return score


def simulate_toxic(variant: str, policy: str, seed: int) -> np.ndarray:
    cfg = TOXIC[variant]
    rng = np.random.default_rng(seed)
    return np.asarray([toxic_run(cfg, policy, rng) for _ in range(RUNS)], dtype=float)


def summarize(scores: list[np.ndarray], labels: list[str]) -> dict:
    medians = [float(np.median(scores_i)) for scores_i in scores]
    p90_scores = scores[1]
    quantiles = [float(np.percentile(score, percentile)) for score, percentile in zip(scores, (50, 90, 95, 99))]
    return {
        "policies": [{"label": label, "median": median, "mean": float(np.mean(score)), "sd": float(np.std(score, ddof=1)), "anchorQuantile": percentile} for label, median, score, percentile in zip(labels, medians, scores, (50, 90, 95, 99))],
        "anchors": {"p50": round(quantiles[0]), "p90": round(quantiles[1]), "p95": round(quantiles[2]), "p99": round(quantiles[3])},
        "sd": float(np.std(p90_scores, ddof=1)),
        "sep": float((quantiles[1] - quantiles[0]) / np.std(p90_scores, ddof=1)) if np.std(p90_scores, ddof=1) else None,
    }


def require_monotonic(summary: dict) -> dict:
    anchors = summary["anchors"]
    if not (anchors["p50"] < anchors["p90"] < anchors["p95"] < anchors["p99"]):
        raise AssertionError(f"non-monotonic calibration anchors: {anchors}")
    return summary


def main() -> None:
    inv_policies = [("never skews", 0.0, 80_000), ("gain 0.4, 1.6 s reaction", 0.4, 1600), ("gain 0.8, 1.2 s reaction", 0.8, 1200), ("gain 1.2, 0.8 s reaction", 1.2, 800)]
    tox_policies = ["threshold_035", "threshold_025", "threshold_015", "bayes"]
    output: dict[str, dict] = {"runs": RUNS, "method": "four policy medians map to p50/p90/p95/p99; SD is p90-policy SD", "inventory": {}, "toxic": {}}
    for index, variant in enumerate(INV):
        current = [simulate_inventory(variant, policy, 800000 + index * 100 + i) for i, policy in enumerate(inv_policies)]
        legacy = [simulate_inventory(variant, policy, 900000 + index * 100 + i, legacy=True) for i, policy in enumerate(inv_policies)]
        output["inventory"][variant] = {"current": require_monotonic(summarize(current, [p[0] for p in inv_policies])), "legacy": require_monotonic(summarize(legacy, [p[0] for p in inv_policies]))}
    for index, variant in enumerate(TOXIC):
        scores = [simulate_toxic(variant, policy, 1000000 + index * 100 + i) for i, policy in enumerate(tox_policies)]
        output["toxic"][variant] = require_monotonic(summarize(scores, tox_policies))
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
