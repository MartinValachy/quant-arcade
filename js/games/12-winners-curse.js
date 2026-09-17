/* 12 — Winner's Curse : common-value auction, you only win when you are wrong */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  function makeRound(rng, cfg) {
    var V = u.round(rng.uni(120, 480), 0);
    var sd = rng.uni(cfg.noise[0], cfg.noise[1]);
    var N = rng.int(cfg.rivals[0], cfg.rivals[1]);
    var mySig = V + rng.norm(0, sd);
    var rivalBids = [];
    for (var i = 0; i < N; i++) {
      var s = V + rng.norm(0, sd);
      rivalBids.push(s - sd * rng.uni(cfg.rivalShade[0], cfg.rivalShade[1]));
    }
    var topRival = Math.max.apply(null, rivalBids);
    return {
      V: V, sd: sd, N: N, mySig: mySig, rivalBids: rivalBids, topRival: topRival,
      lo: Math.round(mySig - 3.2 * sd), hi: Math.round(mySig + 0.6 * sd)
    };
  }

  function profitAt(round, bid) { return bid > round.topRival ? round.V - bid : 0; }
  function scoreProfit(profit, cfg) { return Math.round(profit * cfg.scale); }

  QA.registerGame({
    id: "winners-curse", n: 12, name: "Winner's Curse", cat: "mm",
    blurb: "A block is worth the same to everyone; you each see a different noisy estimate. Winning the auction is evidence your estimate was the high one.",
    skills: ["Conditioning on winning", "Bid shading vs. field size", "Order statistics intuition", "Beating your own optimism"],
    rules: "<p>An asset has one true value <b>V</b>. You and <b>N rivals</b> each receive an independent noisy signal of it. Highest bid wins and pays their bid; profit is <b>V − your bid</b>.</p>" +
      "<p>Move the slider to set your bid and press <kbd>Enter</kbd>. Bidding your own signal is the classic loser's strategy: conditional on winning, your signal was probably the highest one drawn.</p>" +
      "<p>Score is cumulative profit. Never bidding scores zero — which is a real result, just not a winning one.</p>",
    variants: {
      standard: {
        label: "Standard", note: "3–5 cautious rivals, moderate noise", duration: 80,
        rivals: [3, 5], noise: [6, 12], rivalShade: [1.2, 2.8], scale: 170,
        th: { p50: 430, p90: 1975, p95: 2650, p99: 2975 }
      },
      hard: {
        label: "Hard", note: "6–10 rivals, wide noise, deeper field", duration: 80,
        rivals: [6, 10], noise: [10, 20], rivalShade: [1.4, 3.2], scale: 130,
        th: { p50: 340, p90: 1675, p95: 2225, p99: 2425 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      var profit = 0, wins = 0, rounds = 0, losses = 0;

      while (ctx.running) {
        var round = makeRound(rng, cfg);
        var V = round.V, sd = round.sd, N = round.N, mySig = round.mySig;
        var rivalBids = round.rivalBids, topRival = round.topRival;
        rounds++;

        var lo = round.lo, hi = round.hi;

        var res = await w.slider(ctx, {
          eyebrow: "SEALED BID · " + N + " RIVALS · SIGNAL NOISE σ ≈ " + u.round(sd, 1),
          q: "Your signal: <span class='mono'>" + u.round(mySig, 1) + "</span>",
          sub: "Everyone is bidding on the same asset. Highest bid wins and pays their own bid.",
          min: lo, max: hi, step: 1, start: Math.round(mySig - sd),
          fmt: function (v) { return "bid " + u.fmt(v); },
          cta: "Submit bid",
          manual: true,                       // PnL scoring happens in explain()
          feedbackMs: 1700,
          explain: function (bid) {
            var won = bid > topRival;
            var p = profitAt(round, bid);
            if (won) { wins++; profit += p; if (p < 0) losses++; }
            ctx.mark(won ? p > 0 : (V - topRival) <= 0);
            var pts = scoreProfit(p, cfg);
            if (pts !== 0) ctx.addScore(pts);
            var ladder = rivalBids.slice().sort(function (a, b) { return b - a; }).slice(0, 4)
              .map(function (b) { return u.round(b, 0); }).join(" · ");
            return (won
              ? (p >= 0 ? '<span class="up">WON at ' + u.fmt(bid) + " — profit " + u.signed(u.round(p, 1), 1) + "</span>"
                        : '<span class="down">WON at ' + u.fmt(bid) + " — the curse: " + u.signed(u.round(p, 1), 1) + "</span>")
              : '<span class="muted">outbid — best rival ' + u.round(topRival, 0) + "</span>") +
              '<div style="margin-top:7px;color:#7d8ea3">true value <b style="color:#dbe4ee">' + V +
              "</b> · your signal " + u.round(mySig, 1) + " (" + u.signed(mySig - V, 1) + ") · top rival bids: " + ladder + "</div>";
          }
        });
        if (res.aborted) break;
      }

      var hitRate = rounds ? Math.round(100 * wins / rounds) : 0;
      ctx.extra = [
        { label: "PROFIT", value: u.signed(u.round(profit, 0), 0) },
        { label: "WON", value: wins + "/" + rounds },
        { label: "WIN RATE", value: hitRate + "%" },
        { label: "CURSED", value: losses }
      ];
      ctx.notes = "The correct shade grows with the <b>number of rivals</b> and with the <b>signal noise</b>: roughly <b>σ × E[max of N standard normals]</b>, which is about 1.0σ at N=3, 1.5σ at N=10. Winning 60% of auctions is a warning sign, not a scoreboard.";
    }
  });

  // Browser no-op; exposes the pure auction mechanics to the verification harness.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { makeRound: makeRound, profitAt: profitAt, scoreProfit: scoreProfit };
  }
})();
