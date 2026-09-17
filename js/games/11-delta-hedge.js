/* 11 — Delta Hedge : how much of the other thing do you have to trade? */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  var TK = function (rng) { return rng.ticker(); };

  var FAM = {
    betaFut: function (rng) {
      var q = rng.int(2, 40) * 500, px = rng.int(20, 180), beta = u.round(rng.uni(0.6, 1.9), 2);
      var idx = rng.pick([3800, 4000, 4500, 5000, 5200]), mult = rng.pick([20, 50]);
      var t = TK(rng);
      var a = (q * px * beta) / (idx * mult);
      return {
        q: "How many index futures do you short?",
        sub: "You are long <b>" + u.fmt(q) + "</b> shares of <b>" + t + "</b> at <b>$" + px + "</b>, beta <b>" + beta +
          "</b> to the index. The index is at <b>" + u.fmt(idx) + "</b>, futures multiplier <b>" + mult + "</b>.",
        a: a, tol: Math.max(0.05, a * 0.02), dp: 2,
        why: "(" + u.fmt(q) + " × " + px + " × " + beta + ") / (" + u.fmt(idx) + " × " + mult + ") = " + u.round(a, 2)
      };
    },
    minVar: function (rng) {
      var rho = u.round(rng.uni(0.35, 0.95), 2);
      var sa = u.round(rng.uni(0.12, 0.55), 2), sb = u.round(rng.uni(0.12, 0.55), 2);
      var q = rng.int(2, 30) * 1000;
      var h = rho * sa / sb;
      return {
        q: "Minimum-variance hedge ratio × position — how many units of the hedge?",
        sub: "Long <b>" + u.fmt(q) + "</b> units of A. σ<sub>A</sub> = <b>" + sa + "</b>, σ<sub>B</sub> = <b>" + sb +
          "</b>, ρ = <b>" + rho + "</b>. Same notional per unit.",
        a: q * h, tol: Math.max(1, q * h * 0.02), dp: 0,
        why: "h* = ρσ_A/σ_B = " + u.round(h, 3) + " → " + u.fmt(Math.round(q * h)) + " units"
      };
    },
    optionDelta: function (rng) {
      var nc = rng.int(5, 60), dc = u.round(rng.uni(0.15, 0.85), 2);
      var np = rng.int(5, 60), dp = u.round(rng.uni(0.15, 0.85), 2);
      var a = 100 * (nc * dc - np * dp);
      return {
        q: "How many shares do you trade to get flat?",
        sub: "Your book: long <b>" + nc + "</b> calls (delta <b>" + dc + "</b>) and long <b>" + np + "</b> puts (delta <b>−" + dp +
          "</b>). Each contract is <b>100 shares</b>. Enter the share trade — negative to sell.",
        a: -a, tol: 1, dp: 0,
        why: "net delta = 100×(" + nc + "×" + dc + " − " + np + "×" + dp + ") = " + u.fmt(Math.round(a)) + " shares, so trade " + u.fmt(Math.round(-a))
      };
    },
    pairs: function (rng) {
      var qa = rng.int(2, 20) * 500, pa = rng.int(20, 160), pb = rng.int(10, 120);
      var beta = u.round(rng.uni(0.5, 2.0), 2);
      var a = qa * pa * beta / pb;
      var A = TK(rng), B = TK(rng);
      return {
        q: "How many shares of " + B + " do you short?",
        sub: "Long <b>" + u.fmt(qa) + "</b> shares of <b>" + A + "</b> at <b>$" + pa + "</b>. " + A + " has beta <b>" + beta +
          "</b> to <b>" + B + "</b>, which trades at <b>$" + pb + "</b>. Hedge in <b>beta-adjusted notional</b>.",
        a: a, tol: Math.max(1, a * 0.015), dp: 0,
        why: "(" + u.fmt(qa) + "×" + pa + "×" + beta + ")/" + pb + " = " + u.fmt(Math.round(a))
      };
    },
    netBeta: function (rng) {
      var w1 = rng.int(1, 9) * 100000, b1 = u.round(rng.uni(0.4, 1.8), 2);
      var w2 = rng.int(1, 9) * 100000, b2 = u.round(rng.uni(0.4, 1.8), 2);
      var shrt = rng.bool();
      // Net equity is undefined for equal long/short notionals. Reroll only the
      // invalid second notional so no generated round is unscorable.
      if (shrt && w1 === w2) {
        do { w2 = rng.int(1, 9) * 100000; } while (w1 === w2);
      }
      var net = (w1 * b1 + (shrt ? -1 : 1) * w2 * b2) / (w1 + (shrt ? -1 : 1) * w2);
      return {
        q: "What is the portfolio beta?",
        sub: "Long <b>" + u.money(w1) + "</b> at beta <b>" + b1 + "</b> and " + (shrt ? "<b>short</b>" : "long") + " <b>" +
          u.money(w2) + "</b> at beta <b>" + b2 + "</b>. Beta on <b>net</b> equity.",
        a: net, tol: Math.max(0.01, Math.abs(net) * 0.02), dp: 3,
        why: "Σwᵢβᵢ / Σwᵢ = " + u.round(net, 3)
      };
    },
    dv01: function (rng) {
      var notional = rng.int(5, 60) * 1000000;
      var durP = u.round(rng.uni(2, 12), 1), durH = u.round(rng.uni(2, 12), 1);
      var a = notional * durP / durH;
      return {
        q: "What hedge notional do you need?",
        sub: "You hold <b>" + u.money(notional) + "</b> of a bond with duration <b>" + durP +
          "</b>. You hedge with an instrument of duration <b>" + durH + "</b>. Match DV01.",
        a: a, tol: a * 0.01, dp: 0,
        why: u.money(notional) + " × " + durP + "/" + durH + " = " + u.money(Math.round(a))
      };
    },
    crossFx: function (rng) {
      var q = rng.int(1, 40) * 100000, fx = u.round(rng.uni(0.7, 1.6), 4), beta = u.round(rng.uni(0.7, 1.4), 2);
      var a = q * beta / fx;
      return {
        q: "How many units of the foreign leg?",
        sub: "A <b>" + u.money(q) + "</b> domestic exposure is hedged abroad. FX rate <b>" + fx +
          "</b> (domestic per foreign unit), hedge beta <b>" + beta + "</b>.",
        a: a, tol: a * 0.01, dp: 0,
        why: u.fmt(q) + " × " + beta + " / " + fx + " = " + u.fmt(Math.round(a))
      };
    }
  };

  QA.registerGame({
    id: "delta-hedge", n: 11, name: "Delta Hedge", cat: "mm",
    blurb: "Beta-weighted futures, minimum-variance ratios, option book deltas, DV01 matching. The arithmetic every risk conversation actually runs on.",
    skills: ["Beta and notional hedging", "Minimum-variance ratio ρσ_A/σ_B", "Option delta aggregation", "Unit discipline"],
    rules: "<p>Each item is a hedge sizing problem. Type the number and press <kbd>Enter</kbd>. Answers are accepted within a small tolerance, so a sensible rounding is fine — a wrong <b>unit</b> is not.</p>" +
      "<p>Signs matter where the question asks for a trade: negative means sell.</p>",
    variants: {
      standard: {
        label: "Standard", note: "Futures, pairs, option deltas", duration: 80, pts: 150, par: 12000, penalty: 0.25,
        fams: ["betaFut", "optionDelta", "pairs", "netBeta"],
        th: { p50: 170, p90: 880, p95: 1134, p99: 1725 }
      },
      hard: {
        label: "Hard", note: "Adds min-variance, DV01, cross-currency", duration: 80, pts: 200, par: 15000, penalty: 0.3,
        fams: ["minVar", "dv01", "crossFx", "betaFut", "netBeta", "optionDelta"],
        th: { p50: 220, p90: 810, p95: 1175, p99: 1725 }
      }
    },

    play: async function (ctx) {
      while (ctx.running) {
        var it = FAM[ctx.rng.pick(ctx.cfg.fams)](ctx.rng);
        var res = await w.numeric(ctx, {
          eyebrow: "SIZE THE HEDGE",
          q: it.q, sub: it.sub,
          answer: it.a, tol: it.tol, dp: it.dp,
          hint: "number only · ENTER to submit",
          explain: function (v, ok) { return (ok ? "✔ " : "✘ ") + it.why; }
        });
        if (res.aborted) break;
      }
      ctx.notes = "Everything here is one identity: <b>match the sensitivity, not the size</b>. Convert both legs to the same risk unit — dollars per 1% move, or dollars per basis point — and the ratio falls out.";
    }
  });

  // Browser no-op; exposes the pure question families to the verification harness.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { FAM: FAM };
  }
})();
