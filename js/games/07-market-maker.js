/* 07 — Quote the Market : two-sided quoting under adverse selection */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  function stat(samples) {
    var m = u.mean(samples);
    return { ev: m, sd: u.sd(samples), lo: Math.min.apply(null, samples), hi: Math.max.apply(null, samples) };
  }
  function build(rng, f, desc) {
    var s = [];
    for (var i = 0; i < 6000; i++) s.push(f(rng));
    var st = stat(s);
    return { desc: desc, draw: f, samples: s, ev: st.ev, sd: st.sd, lo: st.lo, hi: st.hi };
  }
  /** expected loss to a counterparty who only lifts your ask when it is genuinely cheap */
  function pickoff(samples, ask, bid) {
    var above = 0, below = 0;
    for (var i = 0; i < samples.length; i++) {
      var v = samples[i];
      if (v > ask) above += v - ask;
      else if (v < bid) below += bid - v;
    }
    return (above + below) / samples.length;   // probability-weighted, so already an expectation
  }
  function d(rng) { return rng.int(1, 6); }

  var BANK = [
    function (rng) { var n = rng.int(2, 4), m = rng.pick([5, 10]); return build(rng, function (r) { var s = 0; for (var i = 0; i < n; i++) s += d(r); return s * m; }, "<b>" + m + " ×</b> the sum of <b>" + n + " fair dice</b>"); },
    function (rng) { var n = rng.int(10, 24), m = rng.pick([4, 5, 10]); return build(rng, function (r) { return r.binom(n, 0.5) * m; }, "<b>" + m + " ×</b> the number of heads in <b>" + n + " coin tosses</b>"); },
    function (rng) { var n = rng.int(2, 4), m = rng.pick([10, 20]); return build(rng, function (r) { var mx = 0; for (var i = 0; i < n; i++) mx = Math.max(mx, d(r)); return mx * m; }, "<b>" + m + " ×</b> the <b>largest</b> of <b>" + n + " dice</b>"); },
    function (rng) { var m = rng.pick([2, 5]); return build(rng, function (r) { return d(r) * d(r) * m; }, "<b>" + m + " ×</b> the <b>product of two dice</b>"); },
    function (rng) { var n = rng.int(2, 3), m = rng.pick([5, 10]); return build(rng, function (r) { var s = 0; for (var i = 0; i < n; i++) s += r.int(1, 13); return s * m; }, "<b>" + m + " ×</b> the sum of the ranks of <b>" + n + " cards</b> (A=1 … K=13, drawn with replacement)"); },
    function (rng) { var m = rng.pick([10, 20]); return build(rng, function (r) { var a = d(r), b = d(r); return Math.abs(a - b) * m + 20; }, "<b>20 + " + m + " ×</b> the <b>absolute difference</b> of two dice"); },
    function (rng) { var m = rng.pick([8, 12]); return build(rng, function (r) { return (r.int(1, 6) + r.int(1, 6) + r.int(1, 6) > 10 ? 20 : 5) * m; }, "<b>" + m + " ×</b> 20 if three dice total more than 10, else <b>" + m + " ×</b> 5"); },
    function (rng) { var n = rng.int(3, 5), m = rng.pick([10, 15]); return build(rng, function (r) { var c = 0; for (var i = 0; i < n; i++) if (d(r) >= 5) c++; return c * m + 30; }, "<b>30 + " + m + " ×</b> the number of <b>5s and 6s</b> in <b>" + n + " dice</b>"); }
  ];

  QA.registerGame({
    id: "market-maker", n: 7, name: "Quote the Market", cat: "mm",
    blurb: "Price an unknown quantity, show a two-sided market, and find out whether the person hitting you knew something you did not.",
    skills: ["Expected value under a clock", "Spread vs. adverse selection", "Sizing uncertainty", "Competing for flow"],
    rules: "<p>You are shown a quantity whose distribution you can work out. <b>Type your mid</b>, then press <kbd>1</kbd> tight / <kbd>2</kbd> normal / <kbd>3</kbd> wide to show that spread.</p>" +
      "<p>Each quote is shown to <b>five counterparties</b>. Tighter quotes win the flow more often but get picked off harder: some of them know the true value and only trade when it pays them. Wide quotes are safe and win nothing.</p>" +
      "<p>You are marked at <b>fair value</b> and charged adverse selection at its <b>expected</b> cost, so the score measures your quoting rather than the roll of the settlement. A mid that is right and a spread that is honest beats a clever spread around a wrong mid, every time.</p>",
    variants: {
      standard: {
        label: "Standard", note: "5 counterparties a round, 45% informed", duration: 80, pts: 0, par: 9000,
        informed: 0.45, compet: 1.15, burst: 5, scale: 4,
        th: { p50: 40, p90: 780, p95: 819, p99: 910 }
      },
      hard: {
        label: "Hard", note: "5 counterparties a round, 52% informed", duration: 80, pts: 0, par: 9000,
        informed: 0.52, compet: 0.75, burst: 5, scale: 5,
        th: { p50: 40, p90: 790, p95: 838, p99: 950 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      var pnl = 0, traded = 0, picked = 0, rounds = 0;

      while (ctx.running) {
        var inst = rng.pick(BANK)(rng);
        var sd = inst.sd;
        var spreads = [
          { k: "TIGHT", s: Math.max(2, Math.round(sd * 0.45)) },
          { k: "NORMAL", s: Math.max(4, Math.round(sd * 1.0)) },
          { k: "WIDE", s: Math.max(8, Math.round(sd * 2.0)) }
        ];
        var Smax = sd * cfg.compet * 2;

        var out = await w.live(ctx, function (host, finish, onKey) {
          host.appendChild(w.promptEl({
            eyebrow: "ROUND " + (rounds + 1) + " · CUM PnL " + (pnl >= 0 ? "+" : "") + u.money(Math.round(pnl)),
            q: "Make a market",
            sub: "The instrument settles at " + inst.desc + "."
          }));

          var pad = w.el("div", "numpad");
          var input = w.el("input", "numin");
          input.type = "text"; input.inputMode = "decimal"; input.placeholder = "mid";
          pad.appendChild(input);
          pad.appendChild(w.el("div", "hint", "type your mid, then choose a spread"));
          host.appendChild(pad);

          var row = w.el("div", "choices");
          row.style.marginTop = "16px";
          var btns = [];
          spreads.forEach(function (sp, i) {
            var b = w.el("button", "choice");
            b.appendChild(w.el("span", "key", String(i + 1)));
            b.appendChild(w.el("span", "", sp.k));
            b.appendChild(w.el("small", "", "± " + u.round(sp.s / 2, 1)));
            b.onclick = function () { submit(i); };
            row.appendChild(b); btns.push(b);
          });
          host.appendChild(row);
          var fb = w.el("div", "fb neut", "");
          host.appendChild(fb);
          setTimeout(function () { input.focus(); }, 30);

          function submit(i) {
            var mid = parseFloat(String(input.value).replace(/,/g, ""));
            if (!isFinite(mid)) { fb.className = "fb bad"; fb.innerHTML = "type a mid first"; input.focus(); return; }
            btns.forEach(function (b) { b.disabled = true; });
            input.disabled = true;
            var s = spreads[i].s, bid = mid - s / 2, ask = mid + s / 2;
            var pWin = u.clamp(1 - s / (2 * Smax), 0.06, 0.94);
            rounds++;

            // Marked at fair value, with adverse selection charged at its expected cost.
            // Scoring the realised settlement instead would swamp an 80-second run in
            // noise: one draw of V has a standard deviation larger than the whole edge.
            var earn = s / 2;                                   // half-spread against uninformed flow
            var cost = pickoff(inst.samples, ask, bid);         // expected loss to informed flow
            var perFill = (1 - cfg.informed) * earn - cfg.informed * cost;

            var fills = 0;
            for (var k = 0; k < cfg.burst; k++) if (rng.bool(pWin)) fills++;
            var delta = fills * perFill;
            traded += fills;
            if (cost > earn) picked++;

            pnl += delta;
            var pts = Math.round(delta * cfg.scale);
            ctx.mark(delta >= 0);
            if (pts !== 0) ctx.addScore(pts, input);

            fb.className = "fb " + (delta > 0 ? "good" : delta < 0 ? "bad" : "neut");
            fb.innerHTML =
              (fills ? "<b>" + fills + "</b> of " + cfg.burst + " counterparties traded"
                     : '<span class="muted">no fills — competitors showed tighter all round</span>') +
              '<div style="margin-top:8px;color:#7d8ea3">fair value <b style="color:#dbe4ee">' + u.round(inst.ev, 1) +
              "</b> · σ " + u.round(sd, 1) + " · your mid " + u.round(mid, 1) +
              " (<b style='color:" + (Math.abs(mid - inst.ev) < sd * 0.3 ? "#00e08a" : "#ff4d5e") + "'>" +
              u.signed(mid - inst.ev, 1) + "</b>)</div>" +
              '<div style="margin-top:4px;color:#7d8ea3">earn ' + u.round((1 - cfg.informed) * earn, 2) +
              " per fill · picked off " + u.round(cfg.informed * cost, 2) +
              " · net <b style='color:" + (delta >= 0 ? "#00e08a" : "#ff4d5e") + "'>" + u.signed(delta, 2) + "</b></div>";
            setTimeout(function () { finish({ ok: true }); }, 1750);
          }

          input.addEventListener("keydown", function (e) {
            if (e.key >= "1" && e.key <= "3") { e.preventDefault(); submit(parseInt(e.key, 10) - 1); }
            if (e.key === "Enter") { e.preventDefault(); submit(1); }
          });
          onKey(function (e) {
            if (document.activeElement !== input && e.key >= "1" && e.key <= "3") submit(parseInt(e.key, 10) - 1);
          });
        });
        if (out.aborted) break;
      }

      ctx.extra = [
        { label: "PnL", value: u.signed(Math.round(pnl), 0) },
        { label: "FILLS", value: traded + " in " + rounds + " rounds" },
        { label: "PICKED OFF", value: picked }
      ];
      ctx.notes = "Your mid is the only thing you fully control. A mid that is off by <b>0.5σ</b> costs more than any spread choice can recover — informed flow will always take the side you got wrong.";
    }
  });

  // Browser no-op; exposes only the pure generator pieces to the verification harness.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { BANK: BANK, pickoff: pickoff, stat: stat };
  }
})();
