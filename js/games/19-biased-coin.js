/* 19 — Biased Coin : sequential sampling, speed against confidence */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  QA.registerGame({
    id: "biased-coin", n: 19, name: "Spot the Bias", cat: "signal",
    blurb: "Several coins flip live; exactly one is loaded. Every extra flip you wait for is evidence you buy with time you do not have.",
    skills: ["Sequential hypothesis testing", "Speed/accuracy trade-off", "Reading noisy proportions", "Log-likelihood intuition"],
    rules: "<p>Coins flip continuously. One of them has a hidden bias. <b>Click it</b> as soon as you are confident — earlier is worth more.</p>" +
      "<p>Getting it wrong costs points, and letting the round time out costs more than a wrong answer would have. This is the whole speed/accuracy frontier in one game: the optimal stopping rule is to act when the likelihood ratio, not your gut, crosses a threshold.</p>",
    variants: {
      standard: {
        label: "Standard", note: "4 coins, bias ±0.15–0.25", duration: 80, pts: 260, par: 6000, penalty: 0.45,
        coins: 4, bias: [0.15, 0.25], flipMs: 240, maxMs: 13000,
        th: { p50: 600, p90: 3125, p95: 4025, p99: 5750 }
      },
      hard: {
        label: "Hard", note: "6 coins, bias ±0.08–0.14", duration: 80, pts: 380, par: 8500, penalty: 0.5,
        coins: 6, bias: [0.08, 0.14], flipMs: 190, maxMs: 16000,
        th: { p50: 630, p90: 3350, p95: 4400, p99: 5925 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      var rounds = 0, hits = 0, flipsUsed = [];

      while (ctx.running) {
        var target = rng.int(0, cfg.coins - 1);
        var bias = rng.uni(cfg.bias[0], cfg.bias[1]) * (rng.bool() ? 1 : -1);
        var ps = [];
        for (var i = 0; i < cfg.coins; i++) ps.push(i === target ? 0.5 + bias : 0.5);
        rounds++;

        var out = await w.live(ctx, function (host, finish, onKey, onCleanup) {
          host.appendChild(w.promptEl({
            eyebrow: "ROUND " + rounds + " · ONE COIN IS LOADED",
            q: "Which one?",
            sub: "Click the biased coin. The longer you watch, the more it costs."
          }));

          var wrap = w.el("div", "");
          wrap.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;max-width:820px;margin:0 auto";
          var panels = [], heads = [], flips = 0;

          for (var i = 0; i < cfg.coins; i++) {
            (function (i) {
              var p = w.el("button", "");
              p.style.cssText = "background:#121a25;border:1px solid #28374a;border-radius:12px;padding:14px 12px;cursor:pointer;transition:.13s;text-align:center";
              p.innerHTML = '<div class="mono" style="font-size:10px;letter-spacing:.16em;color:#4c5c70">COIN ' + String.fromCharCode(65 + i) + "</div>" +
                '<div class="mono" id="bcv' + i + '" style="font-size:26px;font-weight:700;margin:6px 0">—</div>' +
                '<div class="mono" id="bcs' + i + '" style="font-size:11px;color:#7d8ea3">0 / 0</div>' +
                '<div id="bcb' + i + '" style="height:5px;border-radius:3px;background:#0a0e14;margin-top:9px;overflow:hidden">' +
                '<div id="bcf' + i + '" style="height:100%;width:50%;background:#3aa9ff;transition:.2s"></div></div>';
              p.onmouseenter = function () { p.style.borderColor = "#00e08a"; };
              p.onmouseleave = function () { p.style.borderColor = "#28374a"; };
              p.onclick = function () { pick(i); };
              wrap.appendChild(p); panels.push(p); heads.push(0);
            })(i);
          }
          host.appendChild(wrap);
          var fb = w.el("div", "fb neut", "");
          host.appendChild(fb);

          var t0 = performance.now(), done = false;

          var iv = setInterval(function () {
            flips++;
            for (var i = 0; i < cfg.coins; i++) {
              var h = rng.bool(ps[i]);
              if (h) heads[i]++;
              var v = document.getElementById("bcv" + i);
              if (!v) return;
              v.textContent = h ? "H" : "T";
              v.style.color = h ? "#00e08a" : "#ff4d5e";
              document.getElementById("bcs" + i).textContent = heads[i] + " / " + flips + "  (" + Math.round(100 * heads[i] / flips) + "%)";
              document.getElementById("bcf" + i).style.width = (100 * heads[i] / flips) + "%";
            }
          }, cfg.flipMs);

          function pick(i) {
            if (done) return; done = true;
            clearInterval(iv);
            var ok = i === target;
            if (ok) hits++;
            flipsUsed.push(flips);
            panels.forEach(function (p, j) {
              p.style.borderColor = j === target ? "#00e08a" : (j === i ? "#ff4d5e" : "#28374a");
              p.style.background = j === target ? "rgba(0,224,138,.10)" : (j === i ? "rgba(255,77,94,.10)" : "#121a25");
              p.disabled = true;
            });
            ctx.resolve({ correct: ok, pts: cfg.pts, ms: performance.now() - t0, el: panels[i] });
            fb.className = "fb " + (ok ? "good" : "bad");
            fb.innerHTML = (ok ? "✔ " : "✘ ") + "coin " + String.fromCharCode(65 + target) + " was loaded at p = <b>" +
              u.round(ps[target], 3) + "</b> · decided after <b>" + flips + "</b> flips";
            setTimeout(function () { finish({ ok: true }); }, 1150);
          }
          function timeout() {
            if (done) return; done = true;
            clearInterval(iv);
            ctx.resolve({ correct: false, pts: cfg.pts, ms: cfg.maxMs, el: panels[target] });
            fb.className = "fb bad";
            fb.innerHTML = "✘ timed out — it was coin " + String.fromCharCode(65 + target) + " at p = " + u.round(ps[target], 3);
            setTimeout(function () { finish({ ok: true }); }, 1150);
          }
          var to = setTimeout(timeout, cfg.maxMs);
          onKey(function (e) {
            var k = "abcdefgh".indexOf(String(e.key).toLowerCase());
            if (k >= 0 && k < cfg.coins) pick(k);
          });
          onCleanup(function () { clearInterval(iv); clearTimeout(to); });
        });
        if (out.aborted) break;
      }

      ctx.extra = [
        { label: "ROUNDS", value: rounds },
        { label: "CORRECT", value: hits },
        { label: "AVG FLIPS", value: flipsUsed.length ? Math.round(u.mean(flipsUsed)) : "—" }
      ];
      ctx.notes = "Distinguishing p = 0.5 from p = 0.6 needs roughly <b>100 flips</b> for a clean call; from 0.5 vs 0.55, about 400. Since you never get that many, the winning play is to commit on the <b>largest</b> deviation once it is a couple of standard errors clear of the pack, not to wait for certainty.";
    }
  });
})();
