"""Small, dependency-light Monte Carlo reporting helpers.

The caller supplies the independently specified simulation. This module never
reimplements a game's JavaScript generator.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import numpy as np


MIN_DRAWS = 10_000


@dataclass(frozen=True)
class Summary:
    n: int
    mean: float
    variance: float
    mean_se: float
    mean_ci95: tuple[float, float]
    theoretical_mean: float | None = None
    theoretical_variance: float | None = None

    def as_dict(self) -> dict[str, float | int | list[float] | None]:
        return {
            "n": self.n,
            "mean": self.mean,
            "variance": self.variance,
            "mean_se": self.mean_se,
            "mean_ci95": list(self.mean_ci95),
            "theoretical_mean": self.theoretical_mean,
            "theoretical_variance": self.theoretical_variance,
        }


def summarize(
    samples: Iterable[float],
    *,
    theoretical_mean: float | None = None,
    theoretical_variance: float | None = None,
    require_minimum: bool = True,
) -> Summary:
    x = np.asarray(list(samples), dtype=float)
    if x.ndim != 1 or not x.size:
        raise ValueError("samples must be a non-empty one-dimensional sequence")
    if not np.isfinite(x).all():
        raise ValueError("samples contain a non-finite value")
    if require_minimum and x.size < MIN_DRAWS:
        raise ValueError(f"probabilistic checks require at least {MIN_DRAWS} draws")
    variance = float(np.var(x, ddof=1)) if x.size > 1 else 0.0
    se = float(np.sqrt(variance / x.size))
    mean = float(np.mean(x))
    return Summary(
        n=int(x.size),
        mean=mean,
        variance=variance,
        mean_se=se,
        mean_ci95=(mean - 1.96 * se, mean + 1.96 * se),
        theoretical_mean=theoretical_mean,
        theoretical_variance=theoretical_variance,
    )


def close_to_theory(
    summary: Summary,
    *,
    mean_z: float = 5.0,
    variance_relative_error: float = 0.05,
) -> bool:
    """Conservative default acceptance test; reports remain the source of evidence."""
    if summary.theoretical_mean is not None:
        if abs(summary.mean - summary.theoretical_mean) > mean_z * summary.mean_se:
            return False
    if summary.theoretical_variance is not None:
        if summary.theoretical_variance == 0:
            return summary.variance == 0
        rel = abs(summary.variance - summary.theoretical_variance) / abs(summary.theoretical_variance)
        if rel > variance_relative_error:
            return False
    return True
