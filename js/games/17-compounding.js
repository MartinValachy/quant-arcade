/* 17 — Compounding Desk : growth, discounting and vol scaling */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  var FAM = {
    rule72: function (rng) {
      var r = rng.pick([2, 3, 4, 5, 6, 8, 9, 12]);
      var a = Math.log(2) / Math.log(1 + r / 100);
      return { q: "At " + r + "% a year, how many years to double?", a: a, tol: 0.7, dp: 1, why: "exact " + u.round(a, 2) + " yr · rule of 72 gives " + u.round(72 / r, 1) };
    },
    fv: function (rng) {
      var P = rng.int(2, 40) * 500, r = rng.pick([3, 4, 5, 6, 7, 8, 10]), n = rng.int(2, 8);
      var a = P * Math.pow(1 + r / 100, n);
      return { q: u.money(P) + " compounding at " + r + "% for " + n + " years — final value?", a: a, tol: a * 0.015, dp: 0, why: u.fmt(P) + " × 1." + (r < 10 ? "0" + r : r) + "^" + n };
    },
    pv: function (rng) {
      var F = rng.int(4, 40) * 1000, r = rng.pick([4, 5, 6, 8, 10, 12]), n = rng.int(2, 10);
      var a = F / Math.pow(1 + r / 100, n);
      return { q: u.money(F) + " received in " + n + " years, discounted at " + r + "% — present value?", a: a, tol: a * 0.015, dp: 0, why: u.fmt(F) + " / 1." + (r < 10 ? "0" + r : r) + "^" + n };
    },
    cagr: function (rng) {
      var s = rng.int(20, 200), n = rng.int(3, 12);
      var e = Math.round(s * Math.pow(1 + rng.uni(0.03, 0.25), n));
      var a = (Math.pow(e / s, 1 / n) - 1) * 100;
      return { q: "From " + s + " to " + e + " over " + n + " years — CAGR in %?", a: a, tol: 0.35, dp: 2, unit: "%", why: "(" + e + "/" + s + ")^(1/" + n + ") − 1" };
    },
    annualize: function (rng) {
      var m = u.round(rng.uni(0.3, 3.5), 2);
      var a = (Math.pow(1 + m / 100, 12) - 1) * 100;
      return { q: m + "% per month, compounded — annual % return?", a: a, tol: 0.6, dp: 2, unit: "%", why: "(1 + " + (m / 100) + ")¹² − 1" };
    },
    volUp: function (rng) {
      var d = u.round(rng.uni(0.4, 2.4), 2);
      var a = d * Math.sqrt(252);
      return { q: "Daily vol " + d + "% — annualised vol in %?", a: a, tol: 0.7, dp: 2, unit: "%", why: d + " × √252 = " + d + " × 15.87" };
    },
    volDown: function (rng) {
      var y = rng.int(8, 60);
      var a = y / Math.sqrt(252);
      return { q: "Annual vol " + y + "% — daily vol in %?", a: a, tol: 0.09, dp: 3, unit: "%", why: y + " / 15.87" };
    },
    sharpe: function (rng) {
      var d = u.round(rng.uni(0.02, 0.16), 3);
      var a = d * Math.sqrt(252);
      return { q: "Daily Sharpe " + d + " — annualised Sharpe?", a: a, tol: 0.09, dp: 2, why: d + " × √252" };
    },
    cont: function (rng) {
      var P = rng.int(2, 20) * 500, r = rng.pick([3, 5, 6, 8, 10]), t = rng.int(2, 9);
      var a = P * Math.exp(r * t / 100);
      return { q: u.money(P) + " at " + r + "% <b>continuously</b> compounded for " + t + " years?", a: a, tol: a * 0.015, dp: 0, why: u.fmt(P) + " × e^(" + (r / 100) + "×" + t + ")" };
    },
    breakeven: function (rng) {
      var l = rng.pick([10, 15, 20, 25, 30, 40, 50, 60]);
      var a = l / (100 - l) * 100;
      return { q: "You are down " + l + "%. What % gain gets you back to flat?", a: a, tol: 0.4, dp: 2, unit: "%", why: l + "/(100−" + l + ") — the asymmetry that kills accounts" };
    },
    halflife: function (rng) {
      var d = rng.pick([3, 5, 8, 10, 15, 20]);
      var a = Math.log(2) / -Math.log(1 - d / 100);
      return { q: "A signal decays " + d + "% per day. Half-life in days?", a: a, tol: 0.35, dp: 2, why: "ln2 / −ln(1−" + (d / 100) + ")" };
    },
    perpetuity: function (rng) {
      var c = rng.int(2, 30) * 1000, r = rng.pick([4, 5, 6, 8, 10]), g = rng.pick([0, 1, 2, 3]);
      var a = c / ((r - g) / 100);
      return { q: u.money(c) + " a year forever, growing " + g + "%, discounted at " + r + "% — value?", a: a, tol: a * 0.01, dp: 0, why: "C/(r−g) = " + u.fmt(c) + "/" + ((r - g) / 100) };
    }
  };

  QA.registerGame({
    id: "compounding", n: 17, name: "Compounding Desk", cat: "math",
    blurb: "Doubling times, discounting, CAGR and the √252 that turns daily numbers into annual ones. The maths behind every pitch you will ever be shown.",
    skills: ["Compound growth and discounting", "CAGR extraction", "Square-root-of-time vol scaling", "Loss/recovery asymmetry"],
    rules: "<p>Type the number and press <kbd>Enter</kbd>; a small tolerance is allowed, so a good approximation counts.</p>" +
      "<p>Two constants earn their keep here: <b>72/r</b> for doubling time and <b>√252 ≈ 15.87</b> for turning a daily vol or Sharpe into an annual one.</p>",
    variants: {
      standard: {
        label: "Standard", note: "Doubling, FV/PV, CAGR, vol scaling", duration: 80, pts: 130, par: 9000, penalty: 0.3,
        fams: ["rule72", "fv", "pv", "cagr", "volUp", "breakeven", "annualize"],
        th: { p50: 210, p90: 980, p95: 1325, p99: 1875 }
      },
      hard: {
        label: "Hard", note: "Continuous compounding, half-lives, perpetuities", duration: 80, pts: 180, par: 12000, penalty: 0.35,
        fams: ["cont", "halflife", "perpetuity", "sharpe", "volDown", "cagr", "annualize", "pv"],
        th: { p50: 190, p90: 1025, p95: 1340, p99: 2075 }
      }
    },

    play: async function (ctx) {
      while (ctx.running) {
        var it = FAM[ctx.rng.pick(ctx.cfg.fams)](ctx.rng);
        var res = await w.numeric(ctx, {
          eyebrow: "COMPOUNDING",
          q: '<span style="font-size:clamp(18px,3vw,28px)">' + it.q + "</span>",
          answer: it.a, tol: it.tol, dp: it.dp,
          hint: it.unit === "%" ? "percentage as a number · ENTER" : "ENTER to submit",
          feedbackMs: 520,
          explain: function (v, ok) { return (ok ? "✔ " : "✘ ") + u.fmt(it.a, it.dp) + (it.unit || "") + " &nbsp;·&nbsp; " + it.why; }
        });
        if (res.aborted) break;
      }
      ctx.notes = "Compounding is addition in log space. Once you think that way, CAGR is just the average log return, vol scales with <b>√t</b> because variance adds, and a −50% drawdown obviously needs +100% back.";
    }
  });
})();
