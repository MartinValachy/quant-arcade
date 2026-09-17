"""Target-grid invariant checks for game 18."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "18_target_sum_check.js"


def check(rows: list[dict], label: str, size: int, lo: int, hi: int, k: int, negatives: bool, exact: bool) -> dict:
    if len(rows) < MIN_DRAWS:
        raise AssertionError(f"{label}: insufficient grids")
    for row in rows:
        if len(row["cells"]) != size * size or len(row["sol"]) != k:
            raise AssertionError(f"{label}: wrong grid/solution size")
        if len(set(row["sol"])) != k or any(index < 0 or index >= len(row["cells"]) for index in row["sol"]):
            raise AssertionError(f"{label}: solution indices are not a unique valid subset")
        if any(abs(value) < lo or abs(value) > hi for value in row["cells"]):
            raise AssertionError(f"{label}: cell outside configured magnitude bounds")
        if not negatives and any(value <= 0 for value in row["cells"]):
            raise AssertionError(f"{label}: standard grid contains a non-positive cell")
        if sum(row["cells"][index] for index in row["sol"]) != row["target"]:
            raise AssertionError(f"{label}: solution path does not hit target")
    return {"variant": label, "grids": len(rows), "solutionSize": k, "pass": True}


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True, encoding="utf-8")
    evidence = json.loads(raw.stdout)
    terminal = evidence["terminal"]
    if terminal != {"standardTrue": True, "standardWrongSum": False, "hardTrue": True, "hardWrongCount": False, "hardWrongSum": False}:
        raise AssertionError(f"terminal invariant mismatch: {terminal}")
    print(json.dumps({"game": 18, "drawsPerVariant": evidence["drawsPerVariant"], "variants": [
        check(evidence["standard"], "standard", 4, 3, 29, 3, False, False),
        check(evidence["hard"], "hard", 5, 4, 48, 4, True, True),
    ], "terminal": terminal, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
