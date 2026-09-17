"""Independent expression evaluation for 80 in 8 (game 13)."""

from __future__ import annotations

import ast
import json
import math
import subprocess
from pathlib import Path

from python.common.mc import MIN_DRAWS


ROOT = Path(__file__).resolve().parents[3]
NODE_RUNNER = ROOT / "verification" / "node" / "13_arithmetic_check.js"


def evaluate(text: str) -> float:
    expr = text.replace("−", "-").replace("×", "*").replace("÷", "/").replace("²", "**2").replace(" of ", "*")
    tree = ast.parse(expr, mode="eval").body

    def visit(node: ast.AST) -> float:
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return float(node.value)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
            value = visit(node.operand)
            return -value if isinstance(node.op, ast.USub) else value
        if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow)):
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Add): return left + right
            if isinstance(node.op, ast.Sub): return left - right
            if isinstance(node.op, ast.Mult): return left * right
            if isinstance(node.op, ast.Div): return left / right
            return left**right
        raise AssertionError(f"unsupported arithmetic AST: {ast.dump(node)}")

    return visit(tree)


def check_kind(kind: str, rows: list[dict], variant: str) -> dict:
    if len(rows) < MIN_DRAWS:
        raise AssertionError(f"{variant}/{kind}: insufficient cases")
    expected_dp = 2 if kind in {"divdec", "dec", "dec2"} else 0
    for row in rows:
        if row["dp"] != expected_dp or row["tolerance"] != (0.005 if expected_dp else 0):
            raise AssertionError(f"{variant}/{kind}: wrong decimal scoring metadata {row}")
        calculated = evaluate(row["q"])
        answer = float(row["answer"])
        if not math.isclose(calculated, answer, rel_tol=0.0, abs_tol=1e-9):
            raise AssertionError(f"{variant}/{kind}: {row['q']} -> {calculated} != {answer}")
        if not expected_dp and answer != round(answer):
            raise AssertionError(f"{variant}/{kind}: non-integer answer without decimal mode")
    return {"variant": variant, "kind": kind, "cases": len(rows), "pass": True}


def main() -> int:
    raw = subprocess.run(["node", str(NODE_RUNNER)], cwd=ROOT, check=True, capture_output=True, text=True, encoding="utf-8")
    evidence = json.loads(raw.stdout)
    results = []
    for variant in ("standard", "hard"):
        for kind, rows in evidence[variant].items():
            results.append(check_kind(kind, rows, variant))
    print(json.dumps({"game": 13, "drawsPerKind": evidence["drawsPerKind"], "checks": results, "pass": True}, indent=2))


if __name__ == "__main__":
    main()
