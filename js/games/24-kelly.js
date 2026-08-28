/* 24 — Kelly Sizing : how much of the bankroll goes on this one? */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  QA.registerGame({
    id: "kelly", n: 24, name: "Kelly Sizing", cat: "signal",
    blurb: "A run of favourable bets and one decision each time: what fraction. Bet too little and you are wasting edge; bet too much and the edge stops mattering.",
    skills: ["Kelly criterion f* = p − q/b", "Log-utility growth", "Risk of ruin", "Declining a negative-edge bet"],
    rules: "<p>You start with a bankroll of <b>1,000</b>. Each round shows a win probability <b>p</b> and net odds <b>b</b> — win and your stake returns b×, lose and it is gone.</p>" +
      "<p>Your chosen fraction is then staked over a <b>block of 8 identical bets</b>, compounding as it goes. Kelly is a claim about repeated play; one flip could never show it.</p>" +
      "<p>Slide to the fraction of your bankroll you want on it, then <kbd>Enter</kbd>. You score for <b>sizing close to Kelly</b> and again for the <b>log growth</b> that follows, so doubling the bankroll is worth the same as doubling it again.</p>" +
      "<p>Some bets are negative edge. The correct size is then <b>zero</b>, and taking them is how the leaderboard separates.</p>",
    variants: {
      standard: {
        label: "Standard", note: "Edges from thin to fat, 1 in 6 is a trap", duration: 85,
        start: 1000, K: 320, book: 1250, reps: 6, sizeBonus: 260, tolF: 0.18, badRate: 0.17, p: [0.35, 0.85], b: [0.4, 4.0], ruin: 25,
        th: { p50: 3925, p90: 4300, p95: 5250, p99: 6225 }
      },
      hard: {
        label: "Hard", note: "Wider odds, 1 in 3 is a trap", duration: 85,
        start: 1000, K: 320, book: 1250, reps: 6, sizeBonus: 300, tolF: 0.16, badRate: 0.33, p: [0.25, 0.78], b: [0.4, 5.0], ruin: 25,
        th: { p50: 2775, p90: 3900, p95: 4575, p99: 5200 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      var bank = cfg.start, hist = [bank], bets = 0, traps = 0, trapsTaken = 0, overbets = 0;

      // You start holding the book, not zero, so a drawdown is a real loss of score
      // rather than something the floor-at-zero quietly forgives.
      ctx.addScore(cfg.book);

      while (ctx.running) {
        var p, b, guard = 0;
        do {
          p = u.round(rng.uni(cfg.p[0], cfg.p[1]), 2);
          b = u.round(rng.uni(cfg.b[0], cfg.b[1]), 1);
          var edge = p * b - (1 - p);
          var wantBad = rng.bool(cfg.badRate);
        } while (guard++ < 80 && ((wantBad && edge > 0) || (!wantBad && edge <= 0.04)));

        var fStar = (p * b - (1 - p)) / b;
        var isTrap = fStar <= 0;
        if (isTrap) traps++;
        bets++;

        var res = await w.slider(ctx, {
          eyebrow: "BANKROLL " + u.fmt(Math.round(bank)) + " · BET " + bets,
          q: "p = <span class='mono'>" + p.toFixed(2) + "</span> &nbsp; odds <span class='mono'>" + b.toFixed(1) + " : 1</span>",
          sub: "Win: stake × " + b.toFixed(1) + " profit. Lose: stake gone. Staked over <b>" + cfg.reps + " bets</b>.",
          build: function (host) {
            var cv = w.canvas(null, 520, 120);
            var box = w.el("div", "center"); box.style.marginBottom = "6px";
            box.appendChild(cv); host.appendChild(box);
            w.drawSeries(cv, [{ data: hist, color: "#00e08a", width: 2, fill: true, dot: true }], { grid: true, pad: 10 });
          },
          min: 0, max: 100, step: 1, start: 0,
          fmt: function (v) { return v + "%  ·  " + u.money(Math.round(bank * v / 100)); },
          cta: "Place the bet",
          manual: true,
          feedbackMs: 1600,
          explain: function (v) {
            var f = v / 100;
            var before = bank, wins = 0;
            // One decision is staked over a block of identical bets. Kelly is a
            // statement about repeated play, and a single coin flip cannot show it.
            for (var k = 0; k < cfg.reps; k++) {
              var won = rng.bool(p);
              if (won) wins++;
              bank = won ? bank * (1 + f * b) : bank * (1 - f);
              bank = Math.max(1, bank);
              hist.push(bank);
            }
            while (hist.length > 60) hist.shift();

            if (isTrap && f > 0.02) trapsTaken++;
            if (!isTrap && f > fStar * 1.8 + 0.05) overbets++;
            ctx.mark(isTrap ? f <= 0.02 : Math.abs(f - fStar) < 0.12);

            // Two components: how well the bet was sized, and what compounding did
            // with it. The sizing term is what makes an 85-second run informative at all.
            var sizing = Math.round(cfg.sizeBonus * u.clamp(1 - Math.abs(f - Math.max(0, fStar)) / cfg.tolF, 0, 1));
            var growth = Math.round(cfg.K * Math.log2(bank / before));
            var pts = sizing + growth;
            if (pts !== 0) ctx.addScore(pts);

            var line = '<span class="' + (bank >= before ? "up" : "down") + '">' + wins + " of " + cfg.reps + " won</span>";
            var advice = isTrap
              ? '<b style="color:#ffb020">negative edge — correct size was 0%</b>'
              : "Kelly optimum was <b>" + u.pct(fStar, 0) + "</b>";
            return line + " · bankroll " + u.fmt(Math.round(before)) + " → <b>" + u.fmt(Math.round(bank)) + "</b>" +
              "<div style='margin-top:6px;color:#7d8ea3'>" + advice + " · sizing " + u.signed(sizing, 0) +
              " · growth " + u.signed(growth, 0) + "</div>";
          }
        });
        if (res.aborted) break;

        if (bank <= cfg.ruin) {
          ctx.toast("RUINED — bankroll gone", "bad");
          await u.wait(900);
          break;
        }
      }

      ctx.extra = [
        { label: "BANKROLL", value: u.fmt(Math.round(bank)) },
        { label: "BETS", value: bets },
        { label: "TRAPS TAKEN", value: trapsTaken + "/" + traps },
        { label: "OVERBETS", value: overbets }
      ];
      ctx.notes = "<b>f* = p − q/b.</b> Betting twice Kelly has zero expected log growth — all the risk, none of the compounding — and betting anything at all on a negative edge is a guaranteed loss no matter how small the stake. " +
        "This game has genuinely high variance, so read your <b>average</b> over several runs rather than any single one.";
    }
  });
})();
