/* 16 — Sequence Break : find the rule, then the next term */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  var GEN = {
    arith: function (rng) {
      var a = rng.int(-20, 40), d = rng.int(2, 15) * (rng.bool() ? 1 : -1);
      return { f: function (n) { return a + d * n; }, why: "arithmetic, step " + d };
    },
    geom: function (rng) {
      var a = rng.int(1, 6), r = rng.pick([2, 3, 2, 4, -2, 5]);
      return { f: function (n) { return a * Math.pow(r, n); }, why: "geometric, ratio " + r };
    },
    quad: function (rng) {
      var a = rng.int(1, 4), b = rng.int(-6, 8), c = rng.int(-10, 20);
      return { f: function (n) { return a * n * n + b * n + c; }, why: "quadratic " + a + "n² + " + b + "n + " + c + " (second differences constant at " + (2 * a) + ")" };
    },
    fib: function (rng) {
      var x = rng.int(1, 8), y = rng.int(1, 9), k = rng.pick([1, 1, 1, 2]);
      var memo = [x, y];
      return {
        f: function (n) { while (memo.length <= n) memo.push(k * memo[memo.length - 1] + memo[memo.length - 2]); return memo[n]; },
        why: k === 1 ? "each term is the sum of the previous two" : "aₙ = " + k + "·aₙ₋₁ + aₙ₋₂"
      };
    },
    affine: function (rng) {
      var a = rng.int(1, 9), m = rng.pick([2, 3, -2, 3]), c = rng.int(-9, 12);
      var memo = [a];
      return {
        f: function (n) { while (memo.length <= n) memo.push(m * memo[memo.length - 1] + c); return memo[n]; },
        why: "aₙ = " + m + "·aₙ₋₁ " + (c >= 0 ? "+ " + c : "− " + (-c))
      };
    },
    altern: function (rng) {
      var a = rng.int(2, 20), d = rng.int(3, 14);
      return { f: function (n) { return a + d * n * (n % 2 === 0 ? 1 : -1); }, why: "alternating ±" + d + "n around " + a };
    },
    interleave: function (rng) {
      var a = rng.int(1, 10), d = rng.int(2, 9), b = rng.int(1, 8), r = rng.pick([2, 3]);
      return {
        f: function (n) { return n % 2 === 0 ? a + d * (n / 2) : b * Math.pow(r, (n - 1) / 2); },
        why: "two interleaved sequences: arithmetic (step " + d + ") and geometric (ratio " + r + ")"
      };
    },
    cubic: function (rng) {
      var a = rng.pick([1, 1, 2]), b = rng.int(-3, 4), c = rng.int(-8, 10);
      return { f: function (n) { return a * n * n * n + b * n + c; }, why: "cubic — third differences are constant" };
    },
    squarePlus: function (rng) {
      var k = rng.int(-8, 12), m = rng.pick([1, 1, 2, 3]);
      return { f: function (n) { return m * (n + 1) * (n + 1) + k; }, why: m + "·n² " + (k >= 0 ? "+ " + k : "− " + (-k)) };
    },
    triangular: function (rng) {
      var s = rng.int(1, 5), k = rng.int(0, 9);
      return { f: function (n) { var m = n + s; return m * (m + 1) / 2 + k; }, why: "triangular numbers offset by " + k };
    },
    primes: function (rng) {
      var P = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61];
      var s = rng.int(0, 4), m = rng.pick([1, 1, 2]), k = rng.int(0, 5);
      return { f: function (n) { return m * P[n + s] + k; }, why: "primes, ×" + m + " + " + k };
    },
    factorialish: function (rng) {
      var k = rng.int(0, 6);
      return { f: function (n) { return u.fact(n + 2) + k; }, why: "factorials offset by " + k };
    },
    doubleDiff: function (rng) {
      var a = rng.int(2, 12), d0 = rng.int(1, 6), dd = rng.int(1, 5);
      var memo = [a], d = d0;
      return {
        f: function (n) { while (memo.length <= n) { memo.push(memo[memo.length - 1] + d); d += dd; } return memo[n]; },
        why: "differences themselves grow by " + dd + " each step"
      };
    }
  };

  QA.registerGame({
    id: "sequences", n: 16, name: "Sequence Break", cat: "math",
    blurb: "Six terms, one rule, one next number. Take differences, take ratios, and if neither works, assume it is two sequences wearing a trench coat.",
    skills: ["Difference tables", "Recurrence recognition", "Interleaved patterns", "Fast hypothesis testing"],
    rules: "<p>Six terms are shown. Type the <b>next term</b> and press <kbd>Enter</kbd>.</p>" +
      "<p>Method, in order: first differences, second differences, ratios, then odd/even positions separately. That covers almost everything asked in an interview.</p>",
    variants: {
      standard: {
        label: "Standard", note: "Arithmetic, geometric, quadratic, Fibonacci", duration: 80, pts: 130, par: 9000, penalty: 0.3,
        gens: ["arith", "geom", "quad", "fib", "squarePlus", "triangular", "altern"],
        th: { p50: 210, p90: 980, p95: 1325, p99: 1875 }
      },
      hard: {
        label: "Hard", note: "Interleaved, cubic, affine recurrences, primes", duration: 80, pts: 185, par: 12000, penalty: 0.35,
        gens: ["interleave", "cubic", "affine", "primes", "doubleDiff", "factorialish", "quad", "fib"],
        th: { p50: 200, p90: 1050, p95: 1373, p99: 2125 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng;
      while (ctx.running) {
        var g = GEN[rng.pick(ctx.cfg.gens)](rng);
        var terms = [], bad = false;
        for (var n = 0; n < 7; n++) {
          var v = g.f(n);
          if (!isFinite(v) || Math.abs(v) > 1e9 || Math.abs(v - Math.round(v)) > 1e-9) { bad = true; break; }
          terms.push(Math.round(v));
        }
        if (bad) continue;
        var shown = terms.slice(0, 6), ans = terms[6];

        var res = await w.numeric(ctx, {
          eyebrow: "WHAT COMES NEXT?",
          q: "",
          build: function (host) {
            var r = w.el("div", "row");
            r.style.marginBottom = "20px";
            shown.forEach(function (t, i) {
              var b = w.el("div", "mono", u.fmt(t));
              b.style.cssText = "min-width:64px;padding:14px 10px;text-align:center;border-radius:10px;background:#121a25;border:1px solid #28374a;" +
                "font-size:20px;font-weight:700;opacity:0;transform:translateY(6px);transition:.25s " + (i * 0.06) + "s";
              r.appendChild(b);
              setTimeout(function () { b.style.opacity = 1; b.style.transform = "none"; }, 16);
            });
            var q = w.el("div", "mono", "?");
            q.style.cssText = "min-width:64px;padding:14px 10px;text-align:center;border-radius:10px;background:#0f2018;border:1px dashed #00e08a;" +
              "font-size:20px;font-weight:700;color:#00e08a";
            r.appendChild(q);
            host.appendChild(r);
          },
          answer: ans, tol: 0, dp: 0,
          hint: "next term · ENTER",
          explain: function (v, ok) { return (ok ? "✔ " : "✘ ") + u.fmt(ans) + " &nbsp;·&nbsp; " + g.why; }
        });
        if (res.aborted) break;
      }
      ctx.notes = "If first differences are not constant, take them again. If second differences are constant the sequence is quadratic; if the <b>ratios</b> are constant it is geometric; if neither, split the odd and even positions before you give up.";
    }
  });
})();
