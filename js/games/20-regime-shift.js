/* 20 — Regime Shift : call the changepoint before the PnL does */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  function makeRound(rng, cfg) {
    var tau = Math.floor(cfg.len * rng.uni(0.45, 0.72));
    var volShift = rng.bool(0.4);
    var dsign = rng.bool() ? 1 : -1;
    var drift = rng.uni(cfg.drift[0], cfg.drift[1]) * cfg.sigma * dsign;
    var vmult = rng.uni(cfg.volMult[0], cfg.volMult[1]);
    return { tau: tau, volShift: volShift, drift: drift, vmult: vmult };
  }

  function regimeAt(round, i, cfg) {
    var post = i > round.tau;
    return {
      post: post,
      mean: post && !round.volShift ? round.drift : 0,
      sd: cfg.sigma * (post && round.volShift ? round.vmult : 1)
    };
  }

  function increment(round, i, rng, cfg) {
    var regime = regimeAt(round, i, cfg);
    return { value: rng.norm(regime.mean, regime.sd), regime: regime };
  }

  QA.registerGame({
    id: "regime-shift", n: 20, name: "Regime Shift", cat: "signal",
    blurb: "A price prints tick by tick. Somewhere in the middle the process changes. Call it early and you are guessing; call it late and you are already short the move.",
    skills: ["Changepoint detection", "False-alarm discipline", "Drift vs. volatility regimes", "Acting on partial evidence"],
    rules: "<p>Watch the series. At a hidden moment the <b>drift or the volatility changes</b>. Hit <kbd>Space</kbd> (or the button) the instant you believe it has.</p>" +
      "<p>Calling it before the change is a <b>false alarm</b> and costs points. Calling it after scores on how quickly you reacted; letting the round run out scores nothing at all.</p>" +
      "<p>The change is always in the second half of the window, so a hair trigger in the first few seconds is never right.</p>",
    variants: {
      standard: {
        label: "Standard", note: "Clear drift shifts, ~14s windows", duration: 85,
        pts: 300, par: 2500, penalty: 0.5,
        sigma: 0.6, drift: [0.55, 1.0], volMult: [2.4, 3.4], tickMs: 90, len: 150, falsePen: 200,
        th: { p50: 470, p90: 1950, p95: 2333, p99: 3225 }
      },
      hard: {
        label: "Hard", note: "Subtle shifts, noisier tape", duration: 85,
        pts: 420, par: 3200, penalty: 0.5,
        sigma: 1.0, drift: [0.28, 0.5], volMult: [1.7, 2.2], tickMs: 70, len: 190, falsePen: 260,
        th: { p50: 610, p90: 2750, p95: 3200, p99: 3850 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      var rounds = 0, lags = [], falses = 0, misses = 0;

      while (ctx.running) {
        var round = makeRound(rng, cfg);
        var tau = round.tau, volShift = round.volShift, drift = round.drift, vmult = round.vmult;
        rounds++;

        var out = await w.live(ctx, function (host, finish, onKey, onCleanup) {
          host.appendChild(w.promptEl({
            eyebrow: "ROUND " + rounds + " · WATCH THE TAPE",
            q: "When does the regime change?",
            sub: "Hit <b>SPACE</b> the moment the process changes."
          }));

          var cv = w.canvas(null, 720, 250);
          var box = w.el("div", "center"); box.appendChild(cv); host.appendChild(box);

          var btn = w.el("button", "btn primary", "REGIME CHANGED  (Space)");
          btn.style.marginTop = "16px";
          var bw = w.el("div", "center"); bw.appendChild(btn); host.appendChild(bw);
          var fb = w.el("div", "fb neut", ""); host.appendChild(fb);

          var px = 100, data = [px], i = 0, done = false;

          var iv = setInterval(function () {
            i++;
            px += increment(round, i, rng, cfg).value;
            data.push(px);
            w.drawSeries(cv, [{ data: data, color: "#3aa9ff", width: 2, fill: true, dot: true }], { grid: true, pad: 14, n: cfg.len });
            if (i >= cfg.len) end(null);
          }, cfg.tickMs);

          function end(clickAt) {
            if (done) return; done = true;
            clearInterval(iv);
            btn.disabled = true;
            w.drawSeries(cv, [{ data: data, color: "#3aa9ff", width: 2, fill: true }], { grid: true, pad: 14, n: cfg.len, marker: tau });

            if (clickAt === null) {
              misses++;
              ctx.mark(false);
              ctx.addScore(-Math.round(cfg.falsePen * 0.5), btn);
              fb.className = "fb bad";
              fb.innerHTML = "✘ missed it — the " + (volShift ? "volatility" : "drift") + " changed at tick " + tau;
            } else if (clickAt <= tau) {
              falses++;
              ctx.mark(false);
              ctx.addScore(-cfg.falsePen, btn);
              fb.className = "fb bad";
              fb.innerHTML = "✘ false alarm — you called it " + (tau - clickAt) + " ticks <b>early</b>; nothing had happened yet";
            } else {
              var lag = clickAt - tau;
              lags.push(lag);
              ctx.resolve({ correct: true, pts: cfg.pts, ms: lag * cfg.tickMs, el: btn });
              fb.className = "fb good";
              fb.innerHTML = "✔ change at tick " + tau + " (" + (volShift ? "vol × " + u.round(vmult, 1) : "drift " + u.signed(u.round(drift, 2), 2)) +
                ") — you called it <b>" + lag + "</b> ticks later";
            }
            setTimeout(function () { finish({ ok: true }); }, 1500);
          }

          btn.onclick = function () { end(i); };
          onKey(function (e) { if (e.key === " ") { e.preventDefault(); end(i); } });
          onCleanup(function () { clearInterval(iv); });
        });
        if (out.aborted) break;
      }

      ctx.extra = [
        { label: "ROUNDS", value: rounds },
        { label: "AVG LAG", value: lags.length ? Math.round(u.mean(lags)) + "t" : "—" },
        { label: "FALSE ALARMS", value: falses },
        { label: "MISSED", value: misses }
      ];
      ctx.notes = "A run of five moves in one direction happens by chance every 32 windows; that is not a regime. What actually shifts a changepoint statistic is the <b>cumulative</b> deviation from the pre-change mean — watch the running sum, not the last tick.";
    }
  });

  // Browser no-op; exposes the pure regime mechanics to the verification harness.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { makeRound: makeRound, regimeAt: regimeAt, increment: increment };
  }
})();
