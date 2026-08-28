/* 13 — 80 in 8 : the Optiver-style raw arithmetic sprint */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  function gen(rng, cfg) {
    var kind = rng.pick(cfg.kinds);
    var a, b, c, q, ans, dp = 0;
    switch (kind) {
      case "add":
        a = rng.int(cfg.lo, cfg.hi); b = rng.int(cfg.lo, cfg.hi);
        q = a + " + " + b; ans = a + b; break;
      case "sub":
        a = rng.int(cfg.lo, cfg.hi); b = rng.int(cfg.lo, cfg.hi);
        if (!cfg.negatives && b > a) { var t = a; a = b; b = t; }
        q = a + " − " + b; ans = a - b; break;
      case "mul1":
        a = rng.int(11, 99); b = rng.int(3, 9);
        q = a + " × " + b; ans = a * b; break;
      case "mul2":
        a = rng.int(11, 49); b = rng.int(11, 29);
        q = a + " × " + b; ans = a * b; break;
      case "div":
        b = rng.int(3, 19); ans = rng.int(4, 60); a = b * ans;
        q = a + " ÷ " + b; break;
      case "divdec":
        b = rng.int(4, 16); var whole = rng.int(3, 40), rem = rng.pick([0.25, 0.5, 0.75]);
        ans = whole + rem; a = u.round(b * ans, 4);
        q = a + " ÷ " + b; dp = 2; break;
      case "dec":
        a = u.round(rng.uni(1, 40), 1); b = rng.int(3, 19);
        q = a + " × " + b; ans = u.round(a * b, 2); dp = 2; break;
      case "dec2":
        a = rng.pick([0.25, 0.5, 0.75, 1.5, 2.5, 0.2, 0.4, 1.25]); b = rng.int(12, 240);
        q = a + " × " + b; ans = u.round(a * b, 2); dp = 2; break;
      case "chain":
        a = rng.int(6, 24); b = rng.int(3, 12); c = rng.int(10, 99);
        q = a + " × " + b + " + " + c; ans = a * b + c; break;
      case "chain2":
        a = rng.int(11, 60); b = rng.int(11, 60); c = rng.int(2, 9);
        q = "(" + a + " + " + b + ") × " + c; ans = (a + b) * c; break;
      case "chain3":
        a = rng.int(100, 900); b = rng.int(11, 99); c = rng.int(2, 9);
        q = a + " − " + b + " × " + c; ans = a - b * c; break;
      case "sq":
        a = rng.int(11, 45); q = a + "²"; ans = a * a; break;
      case "neg":
        a = rng.int(-cfg.hi, -cfg.lo); b = rng.int(cfg.lo, cfg.hi);
        q = "(" + a + ") + " + b; ans = a + b; break;
      case "negmul":
        a = rng.int(-19, -3); b = rng.int(3, 19);
        q = "(" + a + ") × " + b; ans = a * b; break;
      case "frac":
        b = rng.pick([4, 5, 8, 16, 20, 25]); a = rng.int(1, b - 1);
        c = rng.int(2, 40) * b;
        q = a + "/" + b + " of " + c; ans = c * a / b; break;
    }
    return { q: q, a: ans, dp: dp };
  }

  QA.registerGame({
    id: "arithmetic", n: 13, name: "80 in 8", cat: "math",
    blurb: "The bluntest filter in the industry: raw mental arithmetic, no calculator, no partial credit, clock running.",
    skills: ["Two-digit multiplication", "Decimal handling", "Order of operations", "Sustained accuracy at speed"],
    rules: "<p>Answer as many as you can. Type the number, press <kbd>Enter</kbd>, next one appears immediately.</p>" +
      "<p>Wrong answers cost points, so there is a real speed/accuracy frontier here — the top scores come from being <b>fast and right</b>, not fast and hopeful.</p>",
    variants: {
      standard: {
        label: "Standard", note: "2-digit, positive, light decimals", duration: 75, pts: 60, par: 3600, penalty: 0.35,
        lo: 12, hi: 99, negatives: false,
        kinds: ["add", "sub", "mul1", "div", "dec", "chain", "sq", "frac", "add", "mul1"],
        th: { p50: 570, p90: 1525, p95: 1850, p99: 2475 }
      },
      hard: {
        label: "Hard", note: "3-digit, negatives, decimal division", duration: 75, pts: 85, par: 5200, penalty: 0.4,
        lo: 120, hi: 999, negatives: true,
        kinds: ["add", "sub", "mul2", "divdec", "dec2", "chain2", "chain3", "neg", "negmul", "sq", "frac"],
        th: { p50: 560, p90: 1450, p95: 1850, p99: 2500 }
      }
    },

    play: async function (ctx) {
      while (ctx.running) {
        var it = gen(ctx.rng, ctx.cfg);
        var res = await w.numeric(ctx, {
          eyebrow: "SOLVE",
          q: '<span class="bignum">' + it.q + "</span>",
          answer: it.a, tol: it.dp ? 0.005 : 0, dp: it.dp,
          hint: it.dp ? "decimals allowed · ENTER" : "ENTER to submit",
          feedbackMs: 260,
          explain: function (v, ok) { return ok ? "✔" : "✘ " + u.fmt(it.a, it.dp); }
        });
        if (res.aborted) break;
      }
      ctx.notes = "Speed comes from <b>decomposition</b>, not from calculating faster: 47×23 is 47×20 + 47×3. Squares near a round number use (a±b)² = a² ± 2ab + b². Division by 8 is halve, halve, halve.";
    }
  });
})();
