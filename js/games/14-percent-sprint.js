/* 14 — Percentage Sprint : the arithmetic that actually shows up on a desk */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  var FAM = {
    pctOf: function (rng) {
      var p = rng.pick([5, 12, 15, 18, 25, 35, 45, 60, 72, 85]);
      var n = rng.int(4, 60) * 25;
      return { q: p + "% of " + u.fmt(n), a: n * p / 100, dp: 2, tol: 0.01, why: n + " × " + (p / 100) };
    },
    whatPct: function (rng) {
      var b = rng.int(4, 40) * 25, a = Math.round(b * rng.uni(0.08, 0.95));
      return { q: u.fmt(a) + " is what % of " + u.fmt(b) + "?", a: u.round(100 * a / b, 2), dp: 2, tol: 0.06, unit: "%", why: a + "/" + b + " × 100" };
    },
    change: function (rng) {
      var a = rng.int(20, 400), b = Math.round(a * rng.uni(0.6, 1.6));
      if (b === a) b = a + 1;
      return { q: "From " + a + " to " + b + " — % change?", a: u.round(100 * (b - a) / a, 2), dp: 2, tol: 0.08, unit: "%", why: "(" + b + "−" + a + ")/" + a };
    },
    reverse: function (rng) {
      var p = rng.pick([8, 12, 15, 20, 25, 40]), sign = rng.bool() ? 1 : -1;
      var orig = rng.int(8, 90) * 10;
      var now = u.round(orig * (1 + sign * p / 100), 4);
      return {
        q: "After a " + (sign > 0 ? "+" : "−") + p + "% move a price is " + u.round(now, 2) + ". What was it before?",
        a: orig, dp: 2, tol: 0.05, why: u.round(now, 2) + " / " + (1 + sign * p / 100)
      };
    },
    successive: function (rng) {
      var x = rng.pick([10, 15, 20, 25, 30, 40]), y = rng.pick([10, 15, 20, 25, 30, 40]);
      var s1 = rng.bool() ? 1 : -1, s2 = rng.bool() ? 1 : -1;
      var tot = ((1 + s1 * x / 100) * (1 + s2 * y / 100) - 1) * 100;
      return {
        q: (s1 > 0 ? "+" : "−") + x + "% then " + (s2 > 0 ? "+" : "−") + y + "% — net % change?",
        a: u.round(tot, 2), dp: 2, tol: 0.06, unit: "%",
        why: "(" + (1 + s1 * x / 100) + ")(" + (1 + s2 * y / 100) + ") − 1"
      };
    },
    frac: function (rng) {
      var b = rng.pick([3, 6, 7, 8, 9, 11, 12, 16]), a = rng.int(1, b - 1);
      return { q: a + " / " + b + " as a percentage", a: u.round(100 * a / b, 2), dp: 2, tol: 0.09, unit: "%", why: "1/" + b + " = " + u.round(100 / b, 3) + "%" };
    },
    bps: function (rng) {
      var n = rng.int(2, 60) * 250000;
      var bp = rng.pick([1, 2, 5, 10, 25, 50, 75]);
      return { q: bp + " bps on " + u.money(n), a: n * bp / 10000, dp: 2, tol: 0.02, why: bp + "/10000 × " + u.fmt(n) };
    },
    markup: function (rng) {
      var cost = rng.int(20, 400), m = rng.pick([15, 20, 25, 30, 40, 50]);
      return {
        q: "Cost " + cost + ", sold at a " + m + "% margin on the sale price. Sale price?",
        a: u.round(cost / (1 - m / 100), 2), dp: 2, tol: 0.05,
        why: cost + " / (1 − " + (m / 100) + ") — margin is on price, not cost"
      };
    },
    share: function (rng) {
      var tot = rng.int(4, 40) * 500, p = rng.pick([2, 4, 5, 8, 12, 16, 20]);
      return { q: "Your fill is " + u.fmt(Math.round(tot * p / 100)) + " of " + u.fmt(tot) + " lots — what share?", a: p, dp: 2, tol: 0.09, unit: "%", why: "straight ratio" };
    },
    compound2: function (rng) {
      var r = rng.pick([2, 3, 4, 5, 6, 8]), n = rng.int(2, 5);
      var v = (Math.pow(1 + r / 100, n) - 1) * 100;
      return { q: r + "% per period, compounded " + n + " periods — total % growth?", a: u.round(v, 2), dp: 2, tol: 0.12, unit: "%", why: "(1." + (r < 10 ? "0" + r : r) + ")^" + n + " − 1" };
    }
  };

  QA.registerGame({
    id: "percent-sprint", n: 14, name: "Percentage Sprint", cat: "math",
    blurb: "Percentages, basis points, margins, and reverse moves. A −20% then +20% is not flat, and the interviewer knows it.",
    skills: ["Percent of / percent change", "Reverse percentages", "Basis points on notional", "Margin vs. markup"],
    rules: "<p>Type the number and press <kbd>Enter</kbd>. Where a percentage is asked for, enter it as a <b>number</b> — 12.5, not 0.125. A small tolerance is allowed.</p>" +
      "<p>Watch the reversals: the move that takes you from 100 to 80 is −20%, but getting back needs +25%.</p>",
    variants: {
      standard: {
        label: "Standard", note: "Percent of, change, fractions, bps", duration: 75, pts: 75, par: 5500, penalty: 0.3,
        fams: ["pctOf", "whatPct", "change", "frac", "bps", "share", "pctOf", "change"],
        th: { p50: 460, p90: 1200, p95: 1525, p99: 1950 }
      },
      hard: {
        label: "Hard", note: "Reverse moves, successive changes, margins", duration: 75, pts: 105, par: 7500, penalty: 0.35,
        fams: ["reverse", "successive", "markup", "compound2", "whatPct", "bps", "change"],
        th: { p50: 480, p90: 1250, p95: 1525, p99: 2025 }
      }
    },

    play: async function (ctx) {
      while (ctx.running) {
        var it = FAM[ctx.rng.pick(ctx.cfg.fams)](ctx.rng);
        var res = await w.numeric(ctx, {
          eyebrow: "PERCENTAGES",
          q: '<span class="bignum" style="font-size:clamp(22px,4vw,38px)">' + it.q + "</span>",
          answer: it.a, tol: it.tol, dp: it.dp,
          hint: it.unit === "%" ? "answer as a percentage number · ENTER" : "ENTER to submit",
          feedbackMs: 400,
          explain: function (v, ok) { return (ok ? "✔ " : "✘ ") + u.fmt(it.a, it.dp) + (it.unit || "") + " &nbsp;·&nbsp; " + it.why; }
        });
        if (res.aborted) break;
      }
      ctx.notes = "Two habits pay for themselves: convert percentages to <b>multipliers</b> before chaining them, and remember that <b>1 bp of $1m is $100</b> — most desk mental maths is anchored on that one fact.";
    }
  });
})();
