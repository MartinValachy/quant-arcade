/* 10 — Toxic Flow : learn who is informed, then charge them for it */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  var NAMES = ["VELA", "K2 CAP", "ORION", "MERIDIAN", "HALCYON", "TRIDENT", "AXIOM"];
  var HUES = ["#00e08a", "#3aa9ff", "#ffb020", "#a97bff", "#22d3ee"];

  function makeCounterparties(rng, cfg) {
    var kinds = rng.shuffle(Array.apply(null, Array(cfg.n)).map(function (_, i) { return i < Math.ceil(cfg.n / 2); }));
    return rng.sample(NAMES, cfg.n).map(function (nm, i) {
      var r = kinds[i] ? cfg.clean : cfg.toxic;
      return { name: nm, hue: HUES[i % HUES.length], tox: rng.uni(r[0], r[1]), n: 0, pnl: 0, adverse: 0 };
    });
  }

  function nextTrade(rng, cps, cfg) {
    if (cfg.drift) cps.forEach(function (c) { c.tox = u.clamp(c.tox + rng.norm(0, cfg.drift * 12), 0.03, 0.95); });
    var c = rng.pick(cps);
    var edge = u.round(rng.uni(cfg.edge[0], cfg.edge[1]), 2);
    var informed = rng.bool(c.tox);
    var real = edge + (informed ? -cfg.impact : 0);
    return { c: c, edge: edge, informed: informed, real: real, side: rng.bool() ? "BUY" : "SELL" };
  }

  function tradeScore(real, cfg) { return Math.round(real * cfg.scale); }

  QA.registerGame({
    id: "toxic-flow", n: 10, name: "Toxic Flow", cat: "mm",
    blurb: "Five counterparties, five hidden levels of information. The edge on the screen is not the edge you keep — work out who is picking you off, from a handful of noisy samples.",
    skills: ["Learning from small samples", "Separating edge from adverse selection", "Exploration vs. exploitation", "Counterparty tiering"],
    rules: "<p>A counterparty offers you a trade at a stated <b>edge</b> in ticks. Accept (<kbd>1</kbd>) or reject (<kbd>2</kbd>).</p>" +
      "<p>If they are informed, the market moves <b>against you by " + "the impact shown</b> right after the trade — so your real PnL is edge − impact. Each counterparty has a fixed, hidden probability of being informed.</p>" +
      "<p>Rejected trades are still revealed, so every decision teaches you something. Roughly half the names are close to harmless and the rest are informed almost every time — your job is to work out which is which and then price accordingly.</p>",
    variants: {
      standard: {
        label: "Standard", note: "4 counterparties, clean vs. toxic", duration: 80,
        n: 4, impact: 2.0, edge: [0.05, 2.0], clean: [0.02, 0.16], toxic: [0.76, 0.94], drift: 0, scale: 150,
        th: { p50: 2220, p90: 3577, p95: 3831, p99: 6706 }
      },
      hard: {
        label: "Hard", note: "5 counterparties, drifting toxicity, thin edges", duration: 80,
        n: 5, impact: 2.4, edge: [0.05, 1.6], clean: [0.04, 0.22], toxic: [0.70, 0.92], drift: 0.006, scale: 190,
        th: { p50: -1030, p90: 1613, p95: 2303, p99: 5240 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      // Toxicity is bimodal: some counterparties are essentially clean, others are
      // essentially always informed. That makes the learning problem solvable inside
      // 80 seconds instead of drowning in per-trade noise.
      var cps = makeCounterparties(rng, cfg);
      var pnl = 0, taken = 0, good = 0, missed = 0;

      function tableHTML(highlight) {
        return '<div class="panelbox" style="max-width:560px;margin:0 auto 18px"><table style="width:100%;font-family:var(--mono);font-size:12px;border-collapse:collapse">' +
          '<tr style="color:#4c5c70;font-size:9.5px;letter-spacing:.14em"><th style="text-align:left;padding:3px 6px">COUNTERPARTY</th><th style="padding:3px 6px">TRADES</th><th style="padding:3px 6px">ADVERSE</th><th style="text-align:right;padding:3px 6px">PnL</th></tr>' +
          cps.map(function (c) {
            var hit = c.n ? Math.round(100 * c.adverse / c.n) + "%" : "—";
            return '<tr style="opacity:' + (highlight === c.name ? 1 : .62) + '"><td style="padding:4px 6px;color:' + c.hue + ';font-weight:700">' + c.name + "</td>" +
              '<td style="text-align:center;padding:4px 6px;color:#7d8ea3">' + c.n + "</td>" +
              '<td style="text-align:center;padding:4px 6px;color:' + (c.n && c.adverse / c.n > 0.5 ? "#ff4d5e" : "#7d8ea3") + '">' + hit + "</td>" +
              '<td style="text-align:right;padding:4px 6px;color:' + (c.pnl >= 0 ? "#00e08a" : "#ff4d5e") + '">' + u.signed(c.pnl, 1) + "</td></tr>";
          }).join("") + "</table></div>";
      }

      while (ctx.running) {
        var trade = nextTrade(rng, cps, cfg);
        var c = trade.c, edge = trade.edge, informed = trade.informed, real = trade.real, side = trade.side;

        var res = await w.ask(ctx, {
          eyebrow: "INCOMING RFQ",
          q: '<span style="color:' + c.hue + '">' + c.name + "</span> wants to " + side + " · edge <span class='mono'>" + edge.toFixed(2) + "</span> ticks",
          sub: "Impact if they are informed: <b>−" + cfg.impact.toFixed(1) + "</b> ticks.",
          cols: 2,
          build: function (host) {
            var t = w.el("div", "", tableHTML(c.name));
            host.insertBefore(t, host.firstChild.nextSibling);
          },
          choices: [
            { label: "ACCEPT", sub: "take the edge", correct: real > 0 },
            { label: "REJECT", sub: "let it go", correct: real <= 0 }
          ],
          manual: true,
          feedbackMs: 1100,
          explain: function (i, ok) {
            var accepted = i === 0;
            c.n++; if (informed) c.adverse++;
            if (accepted) {
              taken++; pnl += real; c.pnl += real;
              if (real > 0) good++;
              ctx.addScore(tradeScore(real, cfg));
            } else if (real > 0) { missed++; }
            ctx.mark(real > 0);
            return (accepted ? "traded: " : "passed: ") +
              (informed ? '<span class="down">INFORMED — market moved ' + (-cfg.impact).toFixed(1) + "</span>" : '<span class="up">uninformed — no move</span>') +
              " · realised " + u.signed(real, 2) + " ticks" +
              (accepted ? "" : '<span class="muted"> (not booked)</span>');
          }
        });
        if (res.aborted) break;
      }

      var learned = cps.map(function (c) { return c.name + " " + u.pct(c.tox, 0); }).join(" · ");
      ctx.extra = [
        { label: "PnL (ticks)", value: u.signed(u.round(pnl, 1), 1) },
        { label: "TAKEN", value: taken },
        { label: "GOOD FILLS", value: good },
        { label: "MISSED +EV", value: missed }
      ];
      ctx.notes = "True toxicities were <b>" + learned + "</b>. Accept when <b>edge &gt; toxicity × impact</b>. " +
        "Three adverse fills out of four is weak evidence — but on a real desk you act on weak evidence and re-price, rather than waiting for significance you will never get.";
    }
  });

  // Browser no-op; exposes the pure trade mechanics to the verification harness.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      makeCounterparties: makeCounterparties,
      nextTrade: nextTrade,
      tradeScore: tradeScore
    };
  }
})();
