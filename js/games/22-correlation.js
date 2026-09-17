/* 22 — Correlation Eye : read rho off a scatter, fast */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  function sample(rng, n, rho, opts) {
    var xs = [], ys = [];
    var appliedOutliers = 0;
    for (var i = 0; i < n; i++) {
      var z1 = rng.norm(0, 1), z2 = rng.norm(0, 1);
      xs.push(z1);
      ys.push(rho * z1 + Math.sqrt(Math.max(0, 1 - rho * rho)) * z2);
    }
    if (opts && opts.outliers) {
      for (var k = 0; k < opts.outliers; k++) {
        var j = rng.int(0, n - 1);
        xs[j] = rng.norm(0, 1) * 3.1;
        ys[j] = rng.norm(0, 1) * 3.1;
        appliedOutliers++;
      }
    }
    if (opts && opts.scale) {
      var sx = rng.uni(0.4, 4), sy = rng.uni(0.4, 4), mx = rng.uni(-40, 40), my = rng.uni(-40, 40);
      xs = xs.map(function (v) { return v * sx + mx; });
      ys = ys.map(function (v) { return v * sy + my; });
    }
    return { xs: xs, ys: ys, r: u.corr(xs, ys), outliers: appliedOutliers };
  }

  function makeRound(rng, cfg) {
    var n = rng.int(cfg.n[0], cfg.n[1]);
    var rho = u.round(rng.uni(-0.95, 0.95), 2);
    var outliers = cfg.outliers ? rng.int(1, cfg.outliers) : 0;
    var s = sample(rng, n, rho, { outliers: outliers, scale: true });
    return { n: n, rho: rho, outliersRequested: outliers, sample: s };
  }

  QA.registerGame({
    id: "correlation", n: 22, name: "Correlation Eye", cat: "signal",
    blurb: "A cloud of points and one number. Calibrating your eye to rho is the cheapest statistical skill you can own, and almost nobody has it.",
    skills: ["Reading dependence from a scatter", "Immunity to axis scaling", "Outlier leverage", "Calibrated numeric intuition"],
    rules: "<p>Estimate the <b>sample correlation</b> of the points shown. Slide and press <kbd>Enter</kbd>.</p>" +
      "<p>You are scored against the actual sample ρ of those exact points, not the generating parameter — so what is on screen is the whole truth. Axes are unlabelled and rescaled at random, because correlation does not care about units.</p>" +
      "<p>Hard mode drops the point count and plants leverage points: a single outlier can move ρ by 0.3.</p>",
    variants: {
      standard: {
        label: "Standard", note: "60–160 points, full credit within 0.08", duration: 80, pts: 240, par: 8000,
        n: [60, 160], outliers: 0, tol: 0.26, full: 0.08,
        th: { p50: 270, p90: 1525, p95: 2250, p99: 3350 }
      },
      hard: {
        label: "Hard", note: "16–40 points with leverage outliers", duration: 80, pts: 320, par: 8000,
        n: [16, 40], outliers: 2, tol: 0.16, full: 0.05,
        th: { p50: 370, p90: 2025, p95: 2975, p99: 4475 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      var errs = [];

      while (ctx.running) {
        var round = makeRound(rng, cfg);
        var n = round.n, rho = round.rho, s = round.sample;

        var res = await w.slider(ctx, {
          eyebrow: "SAMPLE CORRELATION",
          q: "What is ρ ?",
          sub: n + " points · axes rescaled at random",
          build: function (host) {
            var cv = w.canvas(null, 460, 300);
            var b = w.el("div", "center");
            b.style.marginBottom = "8px";
            b.appendChild(cv);
            host.appendChild(b);
            w.drawScatter(cv, s.xs, s.ys, { color: "rgba(58,169,255,.8)", r: n > 90 ? 2.3 : 3.4 });
          },
          min: -1, max: 1, step: 0.01, start: 0,
          fmt: function (v) { return (v > 0 ? "+" : "") + v.toFixed(2); },
          pts: cfg.pts, passAt: 0.5,
          score: function (v) {
            var e = Math.abs(v - s.r);
            errs.push(e);
            if (e <= cfg.full) return 1;
            return u.clamp(1 - (e - cfg.full) / (cfg.tol - cfg.full), 0, 1);
          },
          feedbackMs: 1500,
          explain: function (v, acc) {
            return (acc >= 0.75 ? "✔ " : acc > 0 ? "~ " : "✘ ") + "sample ρ = <b>" + s.r.toFixed(3) +
              "</b> · you said " + v.toFixed(2) + " (off by " + Math.abs(v - s.r).toFixed(2) + ")" +
              "<div style='margin-top:6px;color:#7d8ea3'>generating ρ was " + rho.toFixed(2) + "; with n = " + n +
              " the sample value wanders by about ±" + u.round((1 - rho * rho) / Math.sqrt(n), 2) + "</div>";
          }
        });
        if (res.aborted) break;
      }

      if (errs.length) ctx.extra = [{ label: "MEAN |Δρ|", value: u.round(u.mean(errs), 3) }];
      ctx.notes = "Useful anchors: a cloud that is visibly tilted but still round-ish is about <b>0.3</b>; a clear elliptical band is <b>0.6</b>; a narrow cigar is <b>0.9</b>. Most people overestimate low correlations and underestimate high ones.";
    }
  });

  // Browser no-op; exposes the pure sample generator to the verification harness.
  if (typeof module !== "undefined" && module.exports) module.exports = { sample: sample, makeRound: makeRound };
})();
