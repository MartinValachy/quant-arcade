/* 02 — Fair Value Sprint : buy / sell / pass against a quoted price */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  /* every gamble is an explicit outcome list so the EV is exact */
  function ev(outs) { return outs.reduce(function (a, o) { return a + o.p * o.v; }, 0); }
  function d6() { var o = []; for (var i = 1; i <= 6; i++) o.push({ p: 1 / 6, v: i }); return o; }
  function mapOuts(o, f) { return o.map(function (x) { return { p: x.p, v: f(x.v) }; }); }
  function twoDice(f) {
    var o = [];
    for (var a = 1; a <= 6; a++) for (var b = 1; b <= 6; b++) o.push({ p: 1 / 36, v: f(a, b) });
    return o;
  }
  function threeDice(f) {
    var o = [];
    for (var a = 1; a <= 6; a++) for (var b = 1; b <= 6; b++) for (var c = 1; c <= 6; c++) o.push({ p: 1 / 216, v: f(a, b, c) });
    return o;
  }
  function coins(n, f) {
    var o = [];
    for (var k = 0; k <= n; k++) o.push({ p: u.nCk(n, k) / Math.pow(2, n), v: f(k) });
    return o;
  }
  function quoteTruth(fair, price) {
    var rel = (price - fair) / fair;
    var eps = 1e-12;
    return rel < -0.02 - eps ? 0 : rel > 0.02 + eps ? 1 : 2;
  }

  function easyBank(rng) {
    var m = rng.pick([5, 10, 20]);
    return rng.pick([
      function () { return { d: "Roll one fair die. You are paid <b>$" + m + " × the face</b>.", o: mapOuts(d6(), function (v) { return m * v; }) }; },
      function () { return { d: "Roll one fair die. You are paid <b>$" + m + " × face²</b>.", o: mapOuts(d6(), function (v) { return m * v * v; }) }; },
      function () { var n = rng.int(3, 6); return { d: "Flip " + n + " fair coins. You are paid <b>$" + (m * 2) + " per head</b>.", o: coins(n, function (k) { return m * 2 * k; }) }; },
      function () { return { d: "Roll two dice. You are paid <b>$" + m + " × the sum</b>.", o: twoDice(function (a, b) { return m * (a + b); }) }; },
      function () { return { d: "Roll two dice. You are paid <b>$" + (m * 4) + " × the larger face</b>.", o: twoDice(function (a, b) { return m * 4 * Math.max(a, b); }) }; },
      function () { return { d: "Roll two dice. You are paid <b>$" + (m * 4) + " × the smaller face</b>.", o: twoDice(function (a, b) { return m * 4 * Math.min(a, b); }) }; },
      function () { return { d: "Draw one card from a full deck (A=1 … K=13). Paid <b>$" + (m * 2) + " × the rank</b>.", o: (function () { var o = []; for (var i = 1; i <= 13; i++) o.push({ p: 1 / 13, v: m * 2 * i }); return o; })() }; },
      function () { var t = rng.int(3, 5); return { d: "Roll one die. Paid <b>$" + (m * 12) + "</b> if the face is <b>≥ " + t + "</b>, otherwise nothing.", o: mapOuts(d6(), function (v) { return v >= t ? m * 12 : 0; }) }; }
    ])();
  }

  function hardBank(rng) {
    var m = rng.pick([5, 10, 20]);
    return rng.pick([
      function () { return { d: "Roll two dice. Paid <b>$" + (m * 3) + " × |difference|</b>.", o: twoDice(function (a, b) { return m * 3 * Math.abs(a - b); }) }; },
      function () { return { d: "Roll three dice. Paid <b>$" + (m * 3) + " × the largest face</b>.", o: threeDice(function (a, b, c) { return m * 3 * Math.max(a, b, c); }) }; },
      function () { return { d: "Roll two dice. Paid <b>$" + m + " × the product</b>.", o: twoDice(function (a, b) { return m * a * b; }) }; },
      function () { return { d: "Roll two dice. Paid <b>$" + (m * 2) + " × the sum</b>, but <b>nothing</b> if the two faces match.", o: twoDice(function (a, b) { return a === b ? 0 : m * 2 * (a + b); }) }; },
      function () {
        return {
          d: "Roll a die. You may <b>re-roll once</b> and must take the second roll. Play optimally. Paid <b>$" + (m * 6) + " × the face you keep</b>.",
          o: (function () { // optimal: keep if face > E[reroll] = 3.5  ->  EV = 4.25
            var o = [];
            for (var i = 1; i <= 6; i++) {
              if (i > 3.5) o.push({ p: 1 / 6, v: m * 6 * i });
              else for (var j = 1; j <= 6; j++) o.push({ p: 1 / 36, v: m * 6 * j });
            }
            return o;
          })()
        };
      },
      function () { var n = rng.int(4, 6); return { d: "Flip " + n + " fair coins. Paid <b>$" + (m * 5) + " × (heads − tails)²</b>.", o: coins(n, function (k) { var d = k - (n - k); return m * 5 * d * d; }) }; },
      function () { return { d: "Roll two dice. Paid <b>$" + (m * 6) + " × the sum</b> only if the sum is <b>even</b>.", o: twoDice(function (a, b) { return (a + b) % 2 === 0 ? m * 6 * (a + b) : 0; }) }; },
      function () {
        var n = rng.int(3, 5);
        return { d: "Flip " + n + " fair coins. Paid <b>$" + (m * 8) + "</b> if you get <b>at least " + (n - 1) + " heads</b>.", o: coins(n, function (k) { return k >= n - 1 ? m * 8 : 0; }) };
      },
      function () { return { d: "Roll a die repeatedly until a 6 appears. Paid <b>$" + (m * 4) + " × the number of rolls</b> (expected rolls = 6).", o: [{ p: 1, v: m * 4 * 6 }] }; }
    ])();
  }

  QA.registerGame({
    id: "ev-sprint", n: 2, name: "Fair Value Sprint", cat: "prob",
    blurb: "A gamble is described, a market maker quotes it. Compute the expected value faster than the quote decays and take the side with edge.",
    skills: ["Expected value from first principles", "Enumerating outcome spaces", "Edge vs. transaction band", "Discipline to pass"],
    rules: "<p>Each card describes a gamble and shows a <b>quoted price</b>. Work out the EV, then act:</p>" +
      "<p><b>BUY</b> if price is more than 2% below EV · <b>SELL</b> if more than 2% above · <b>PASS</b> if it sits inside the 2% band.</p>" +
      "<p>Keys <kbd>1</kbd> buy · <kbd>2</kbd> sell · <kbd>3</kbd> pass. Passing a fair quote scores; passing an edge does not.</p>",
    variants: {
      standard: {
        label: "Standard", note: "Single dice / coins, wider edges", duration: 75, pts: 105, par: 6500, penalty: 0.35,
        bank: easyBank, edge: [0.07, 0.22], passRate: 0.18,
        th: { p50: 180, p90: 970, p95: 1300, p99: 1975 }
      },
      hard: {
        label: "Hard", note: "Joint outcomes, optional stopping, thin edges", duration: 75, pts: 150, par: 8500, penalty: 0.4,
        bank: hardBank, edge: [0.035, 0.13], passRate: 0.25,
        th: { p50: 210, p90: 1100, p95: 1423, p99: 2175 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      while (ctx.running) {
        var g = cfg.bank(rng);
        var fair = ev(g.o);
        var wantPass = rng.bool(cfg.passRate);
        var price;
        if (wantPass) price = Math.round(fair * (1 + rng.uni(-0.012, 0.012)));
        else {
          var e = rng.uni(cfg.edge[0], cfg.edge[1]) * (rng.bool() ? 1 : -1);
          price = Math.round(fair * (1 + e));
        }
        if (price <= 0) price = 1;
        var rel = (price - fair) / fair;
        var truth = quoteTruth(fair, price);

        var res = await w.ask(ctx, {
          eyebrow: "QUOTE",
          q: '<span class="mono">' + u.money(price) + "</span>",
          sub: g.d,
          cols: 3,
          build: function (host) {
            var b = w.el("div", "panelbox mono");
            b.style.cssText += "max-width:520px;margin:0 auto 18px;text-align:center;font-size:12px;color:#7d8ea3";
            b.innerHTML = "outcomes: <b style='color:#dbe4ee'>" + g.o.length + "</b> &nbsp;·&nbsp; band: ±2% &nbsp;·&nbsp; you are quoted <b style='color:#dbe4ee'>" + u.money(price) + "</b>";
            host.appendChild(b);
          },
          choices: [
            { label: "BUY", sub: "price is cheap", correct: truth === 0 },
            { label: "SELL", sub: "price is rich", correct: truth === 1 },
            { label: "PASS", sub: "inside the band", correct: truth === 2 }
          ],
          explain: function (i, ok) {
            return (ok ? "✔ " : "✘ ") + "EV = <b>" + u.money(fair, 2) + "</b> · quote " + u.money(price) +
              " → " + u.signed(rel * 100, 1) + "% " + (truth === 0 ? "cheap → BUY" : truth === 1 ? "rich → SELL" : "inside band → PASS");
          }
        });
        if (res.aborted) break;
      }
      ctx.notes = "Almost every one of these collapses to a symmetry or a linearity trick: <b>E[sum] = sum of E</b>, max/min pairs sum to a constant, and an optional re-roll is worth <b>E[max(X, 3.5)] = 4.25</b> on a fair die.";
    }
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { ev: ev, d6: d6, mapOuts: mapOuts, twoDice: twoDice, threeDice: threeDice, coins: coins,
      easyBank: easyBank, hardBank: hardBank, quoteTruth: quoteTruth };
  }
})();
