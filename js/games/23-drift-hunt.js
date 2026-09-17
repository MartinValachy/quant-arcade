/* 23 — Drift Hunt : one of these series is not a random walk */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  function drawIncrement(rng, mean, sigma) { return rng.norm(mean, sigma); }
  function theoreticalZ(mu, sigma, n) { return mu * Math.sqrt(n) / sigma; }

  QA.registerGame({
    id: "drift-hunt", n: 23, name: "Drift Hunt", cat: "signal",
    blurb: "Several tapes run side by side. Exactly one has real edge in it; the rest are noise doing what noise does. Find it before it stops being obvious.",
    skills: ["Signal vs. random walk", "Sharpe intuition", "Resisting narrative in noise", "Early commitment"],
    rules: "<p>Each tape prints live. One of them has a genuine positive drift; the others are driftless random walks with the same volatility.</p>" +
      "<p>Click the tape you believe carries the drift. Answering early is worth much more — but a driftless walk will happily look like a trend for a long time.</p>" +
      "<p>The discriminating statistic is <b>total displacement ÷ √(ticks)</b>. Steepness alone tells you nothing.</p>",
    variants: {
      standard: {
        label: "Standard", note: "4 tapes, drift ≈ 0.35σ per tick", duration: 85, pts: 300, par: 6500, penalty: 0.45,
        series: 4, mu: [0.28, 0.42], sigma: 1, tickMs: 85, maxMs: 14000,
        th: { p50: 680, p90: 3300, p95: 4275, p99: 6150 }
      },
      hard: {
        label: "Hard", note: "6 tapes, drift ≈ 0.16σ per tick", duration: 85, pts: 430, par: 9000, penalty: 0.5,
        series: 6, mu: [0.12, 0.20], sigma: 1, tickMs: 70, maxMs: 17000,
        th: { p50: 710, p90: 3775, p95: 4653, p99: 6700 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      var rounds = 0, hits = 0, ticksUsed = [];

      while (ctx.running) {
        var target = rng.int(0, cfg.series - 1);
        var mu = rng.uni(cfg.mu[0], cfg.mu[1]) * cfg.sigma;
        rounds++;

        var out = await w.live(ctx, function (host, finish, onKey, onCleanup) {
          host.appendChild(w.promptEl({
            eyebrow: "ROUND " + rounds + " · ONE TAPE HAS DRIFT",
            q: "Which one is real?",
            sub: "Same volatility on every tape. Only one has a positive expected return."
          }));

          var grid = w.el("div", "");
          grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;max-width:900px;margin:0 auto";
          var cards = [], cvs = [], data = [];

          for (var i = 0; i < cfg.series; i++) {
            (function (i) {
              var c = w.el("button", "");
              c.style.cssText = "background:#121a25;border:1px solid #28374a;border-radius:12px;padding:10px;cursor:pointer;transition:.13s";
              var lbl = w.el("div", "mono");
              lbl.style.cssText = "font-size:10px;letter-spacing:.16em;color:#4c5c70;margin-bottom:6px;display:flex;justify-content:space-between";
              lbl.innerHTML = "<span>TAPE " + String.fromCharCode(65 + i) + '</span><span id="dhz' + i + '" style="color:#7d8ea3">z 0.00</span>';
              c.appendChild(lbl);
              var cv = w.canvas(null, 200, 96);
              c.appendChild(cv);
              c.onmouseenter = function () { c.style.borderColor = "#00e08a"; };
              c.onmouseleave = function () { c.style.borderColor = "#28374a"; };
              c.onclick = function () { pick(i); };
              grid.appendChild(c); cards.push(c); cvs.push(cv); data.push([0]);
            })(i);
          }
          host.appendChild(grid);
          var fb = w.el("div", "fb neut", ""); host.appendChild(fb);

          var t0 = performance.now(), n = 0, done = false;

          var iv = setInterval(function () {
            n++;
            for (var i = 0; i < cfg.series; i++) {
              var d = drawIncrement(rng, i === target ? mu : 0, cfg.sigma);
              data[i].push(data[i][data[i].length - 1] + d);
              if (data[i].length > 200) data[i].shift();
              var z = data[i][data[i].length - 1] / (cfg.sigma * Math.sqrt(n));
              var el = document.getElementById("dhz" + i);
              if (el) { el.textContent = "z " + (z >= 0 ? "+" : "") + z.toFixed(2); el.style.color = z > 1.5 ? "#00e08a" : z < -1.5 ? "#ff4d5e" : "#7d8ea3"; }
              w.drawSeries(cvs[i], [{ data: data[i], color: "#3aa9ff", width: 1.6, fill: true }], { pad: 6 });
            }
          }, cfg.tickMs);

          function reveal(i, ok) {
            cards.forEach(function (c, j) {
              c.style.borderColor = j === target ? "#00e08a" : (j === i ? "#ff4d5e" : "#28374a");
              c.style.background = j === target ? "rgba(0,224,138,.09)" : "#121a25";
              c.disabled = true;
            });
          }
          function pick(i) {
            if (done) return; done = true;
            clearInterval(iv);
            var ok = i === target;
            if (ok) hits++;
            ticksUsed.push(n);
            reveal(i, ok);
            ctx.resolve({ correct: ok, pts: cfg.pts, ms: performance.now() - t0, el: cards[i] });
            fb.className = "fb " + (ok ? "good" : "bad");
            fb.innerHTML = (ok ? "✔ " : "✘ ") + "tape " + String.fromCharCode(65 + target) + " had drift " + u.round(mu, 2) +
              "σ/tick · called after <b>" + n + "</b> ticks (theoretical z ≈ " + u.round(theoreticalZ(mu, cfg.sigma, n), 2) + ")";
            setTimeout(function () { finish({ ok: true }); }, 1400);
          }
          var to = setTimeout(function () {
            if (done) return; done = true;
            clearInterval(iv); reveal(-1, false);
            ctx.resolve({ correct: false, pts: cfg.pts, ms: cfg.maxMs, el: cards[target] });
            fb.className = "fb bad";
            fb.innerHTML = "✘ timed out — it was tape " + String.fromCharCode(65 + target);
            setTimeout(function () { finish({ ok: true }); }, 1300);
          }, cfg.maxMs);

          onKey(function (e) {
            var k = "abcdefgh".indexOf(String(e.key).toLowerCase());
            if (k >= 0 && k < cfg.series) pick(k);
          });
          onCleanup(function () { clearInterval(iv); clearTimeout(to); });
        });
        if (out.aborted) break;
      }

      ctx.extra = [
        { label: "ROUNDS", value: rounds },
        { label: "CORRECT", value: hits },
        { label: "AVG TICKS", value: ticksUsed.length ? Math.round(u.mean(ticksUsed)) : "—" }
      ];
      ctx.notes = "The z-score in each corner is the honest statistic: <b>cumulative move ÷ σ√n</b>. It is the same quantity as a Sharpe ratio, which is why a strategy with a 1.0 annual Sharpe still needs years before you can distinguish it from luck.";
    }
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { drawIncrement: drawIncrement, theoreticalZ: theoreticalZ };
  }
})();
