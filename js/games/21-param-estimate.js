/* 21 — Estimator : recover a hidden parameter from a small sample */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  var FAM = {
    tank: function (rng) {
      var N = rng.int(120, 2000);
      var k = rng.int(4, 9), seen = {};
      var s = [];
      while (s.length < k) { var x = rng.int(1, N); if (!seen[x]) { seen[x] = 1; s.push(x); } }
      s.sort(function (a, b) { return a - b; });
      var m = s[s.length - 1];
      return {
        q: "How many were ever produced?",
        sub: "You capture <b>" + k + "</b> units with these serial numbers, drawn without replacement from 1…N.",
        show: s.join("  ·  "),
        truth: N, se: (N - m) / k + N / (k * k) + 1,
        lo: m, hi: Math.round(m * 3.4),
        best: Math.round(m * (1 + 1 / k) - 1),
        why: "the minimum-variance unbiased estimate is m(1+1/k) − 1 = " + Math.round(m * (1 + 1 / k) - 1) + ", using the largest serial m = " + m
      };
    },
    mean: function (rng) {
      var mu = rng.int(20, 180), sd = rng.int(5, 40), n = rng.int(5, 12);
      var s = [];
      for (var i = 0; i < n; i++) s.push(u.round(rng.norm(mu, sd), 1));
      return {
        q: "Estimate the population mean",
        sub: "<b>" + n + "</b> independent draws from a normal distribution with known σ = <b>" + sd + "</b>.",
        show: s.join("  ·  "),
        truth: mu, se: sd / Math.sqrt(n),
        lo: Math.round(u.mean(s) - 3 * sd / Math.sqrt(n)), hi: Math.round(u.mean(s) + 3 * sd / Math.sqrt(n)),
        best: u.round(u.mean(s), 1),
        why: "sample mean = " + u.round(u.mean(s), 2) + ", standard error σ/√n = " + u.round(sd / Math.sqrt(n), 2)
      };
    },
    sd: function (rng) {
      var mu = rng.int(50, 150), sd = rng.int(4, 30), n = rng.int(6, 14);
      var s = [];
      for (var i = 0; i < n; i++) s.push(u.round(rng.norm(mu, sd), 1));
      return {
        q: "Estimate the standard deviation",
        sub: "<b>" + n + "</b> independent normal draws. The mean is not given.",
        show: s.join("  ·  "),
        truth: sd, se: sd / Math.sqrt(2 * n),
        lo: 1, hi: Math.round(u.sd(s) * 3 + 5),
        best: u.round(u.sd(s), 2),
        why: "sample sd = " + u.round(u.sd(s), 2) + "; a quick field estimate is range/4 = " + u.round((Math.max.apply(null, s) - Math.min.apply(null, s)) / 4, 2)
      };
    },
    bern: function (rng) {
      var p = u.round(rng.uni(0.15, 0.85), 3), n = rng.int(14, 40);
      var k = rng.binom(n, p);
      var strip = "";
      for (var i = 0; i < n; i++) strip += (i < k ? "■" : "□");
      return {
        q: "Estimate the underlying probability (%)",
        sub: "<b>" + n + "</b> independent trials produced <b>" + k + "</b> successes.",
        show: '<span style="letter-spacing:3px;color:#00e08a">' + strip + "</span>",
        truth: p * 100, se: Math.sqrt(p * (1 - p) / n) * 100,
        lo: 0, hi: 100,
        best: u.round(100 * k / n, 1),
        why: k + "/" + n + " = " + u.round(100 * k / n, 1) + "%, standard error ±" + u.round(100 * Math.sqrt(p * (1 - p) / n), 1) + " points"
      };
    },
    unif: function (rng) {
      var th = rng.int(40, 500), n = rng.int(4, 10);
      var s = [];
      for (var i = 0; i < n; i++) s.push(u.round(rng.uni(0, th), 1));
      var mx = Math.max.apply(null, s);
      return {
        q: "Estimate the upper bound",
        sub: "<b>" + n + "</b> draws from a uniform distribution on [0, θ].",
        show: s.join("  ·  "),
        truth: th, se: th / n,
        lo: Math.round(mx), hi: Math.round(mx * 2.6),
        best: u.round(mx * (n + 1) / n, 1),
        why: "max × (n+1)/n = " + u.round(mx * (n + 1) / n, 1) + " — the sample max always understates θ"
      };
    },
    pois: function (rng) {
      var lam = u.round(rng.uni(1.5, 12), 1), n = rng.int(5, 12);
      var s = [];
      for (var i = 0; i < n; i++) s.push(rng.pois(lam));
      return {
        q: "Estimate the arrival rate λ",
        sub: "Counts observed over <b>" + n + "</b> equal intervals.",
        show: s.join("  ·  "),
        truth: lam, se: Math.sqrt(lam / n),
        lo: 0, hi: Math.round(Math.max.apply(null, s) * 2 + 4),
        best: u.round(u.mean(s), 2),
        why: "sample mean = " + u.round(u.mean(s), 2) + ", standard error √(λ/n) = " + u.round(Math.sqrt(lam / n), 2)
      };
    }
  };

  QA.registerGame({
    id: "param-estimate", n: 21, name: "The Estimator", cat: "signal",
    blurb: "German tanks, uniform bounds, Poisson rates. Small samples, hidden truths, and estimators that are not the obvious one.",
    skills: ["Sufficient statistics", "Bias correction", "Standard errors", "Estimating from n < 10"],
    rules: "<p>A small sample is shown. Slide to your estimate of the hidden parameter and press <kbd>Enter</kbd>.</p>" +
      "<p>The tolerance is set to a multiple of the estimator's own <b>standard error</b>, so you are never punished for irreducible sampling noise — only for using the wrong estimator. The sample max understates a uniform bound; the sample mean is fine for a normal.</p>",
    variants: {
      standard: {
        label: "Standard", note: "Tolerance ≈ 2.5 standard errors", duration: 85, pts: 260, par: 13000,
        fams: ["tank", "mean", "bern", "unif"], c: 2.5,
        th: { p50: 200, p90: 1050, p95: 1650, p99: 2525 }
      },
      hard: {
        label: "Hard", note: "Tolerance ≈ 1.3 standard errors, all families", duration: 85, pts: 340, par: 13000,
        fams: ["tank", "mean", "sd", "bern", "unif", "pois"], c: 1.3,
        th: { p50: 260, p90: 1400, p95: 2125, p99: 3300 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      while (ctx.running) {
        var it = FAM[rng.pick(cfg.fams)](rng);
        var span = it.hi - it.lo;
        var step = span > 400 ? 5 : span > 80 ? 1 : span > 20 ? 0.5 : 0.1;

        var res = await w.slider(ctx, {
          eyebrow: "SMALL SAMPLE",
          q: it.q, sub: it.sub,
          build: function (host) {
            var b = w.el("div", "panelbox mono");
            b.style.cssText += "max-width:640px;margin:0 auto 18px;text-align:center;font-size:16px;letter-spacing:.02em";
            b.innerHTML = it.show;
            host.appendChild(b);
          },
          min: it.lo, max: it.hi, step: step,
          start: u.round(it.lo + span * rng.uni(0.3, 0.7), 2),
          fmt: function (v) { return u.fmt(v, step < 1 ? 1 : 0); },
          pts: cfg.pts, passAt: 0.5,
          score: function (v) { return u.clamp(1 - Math.abs(v - it.truth) / (cfg.c * it.se), 0, 1); },
          feedbackMs: 1700,
          explain: function (v, acc) {
            return (acc >= 0.75 ? "✔ " : acc > 0 ? "~ " : "✘ ") + "true value <b>" + u.fmt(it.truth, 2) +
              "</b> · best estimate from this sample was <b>" + u.fmt(it.best, 2) + "</b>" +
              "<div style='margin-top:6px;color:#7d8ea3'>" + it.why + "</div>";
          }
        });
        if (res.aborted) break;
      }
      ctx.notes = "Two of these families punish the naive answer hardest: for a <b>uniform bound</b> the sample max is biased low by θ/(n+1), and for the <b>tank problem</b> only the largest serial carries information — the other draws just tell you how dense the sample is.";
    }
  });
})();
