/* 08 — Inventory Skew : capture spread without carrying the position */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  QA.registerGame({
    id: "inventory-skew", n: 8, name: "Inventory Skew", cat: "mm",
    blurb: "Flow arrives whether you want it or not. Lean your quotes to bleed the position off before the price does it to you.",
    skills: ["Inventory management", "Skewing quotes", "Risk vs. edge capture", "Continuous attention under noise"],
    rules: "<p>You are the only market maker. Customers arrive constantly and trade against your bid or ask; every fill earns the half-spread but leaves you a position.</p>" +
      "<p>Tap <b>◀ / ▶</b> (or <kbd>←</kbd> <kbd>→</kbd>) to skew your quotes down/up. <b>Skew down</b> to attract buyers and get short; <b>skew up</b> to attract sellers and get long. Skewing costs edge — you are paying to get flat.</p>" +
      "<p>Every second your PnL marks against the live price <b>and the desk charges you capital on the square of your position</b> — so sitting on risk bleeds even when nothing moves. Breach the position limit and you are force-liquidated across the spread.</p>",
    variants: {
      standard: {
        label: "Standard", note: "Steady flow, ±8 limit, light carry", duration: 80,
        flowMs: 800, sigma: 0.070, half: 0.10, tick: 0.02, beta: 1.10, limit: 8, scale: 130, liqPen: 260, carry: 1.2,
        th: { p50: 280, p90: 900, p95: 945, p99: 1050 }
      },
      hard: {
        label: "Hard", note: "Fast flow, high vol, ±6 limit, heavy carry", duration: 80,
        flowMs: 520, sigma: 0.100, half: 0.08, tick: 0.02, beta: 0.95, limit: 6, scale: 95, liqPen: 340, carry: 1.6,
        th: { p50: 70, p90: 590, p95: 656, p99: 810 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      var S = 100, hist = [S], skew = 0, inv = 0, edge = 0, fills = 0, liqs = 0, maxAbs = 0;
      var lastMark = S;

      var out = await w.live(ctx, function (host, finish, onKey, onCleanup) {
        host.appendChild(w.promptEl({
          eyebrow: "MAKE MARKETS · ← → TO SKEW",
          q: '<span class="mono" id="mmPx">100.00</span>',
          sub: "Half-spread " + cfg.half.toFixed(2) + " · position limit ±" + cfg.limit + " · PnL marks every second"
        }));

        var cv = w.canvas(null, 640, 190);
        var cw = w.el("div", "center");
        cw.appendChild(cv);
        host.appendChild(cw);

        var panel = w.el("div", "row");
        panel.style.marginTop = "16px";
        panel.innerHTML =
          '<div class="panelbox mono" style="text-align:center;min-width:120px"><div style="font-size:9.5px;letter-spacing:.16em;color:#4c5c70">BID</div><div id="mmBid" style="font-size:21px;font-weight:700;color:#00e08a">—</div></div>' +
          '<div class="panelbox mono" style="text-align:center;min-width:120px"><div style="font-size:9.5px;letter-spacing:.16em;color:#4c5c70">ASK</div><div id="mmAsk" style="font-size:21px;font-weight:700;color:#ff4d5e">—</div></div>' +
          '<div class="panelbox mono" style="text-align:center;min-width:150px"><div style="font-size:9.5px;letter-spacing:.16em;color:#4c5c70">POSITION</div><div id="mmInv" style="font-size:21px;font-weight:700">0</div></div>' +
          '<div class="panelbox mono" style="text-align:center;min-width:130px"><div style="font-size:9.5px;letter-spacing:.16em;color:#4c5c70">SKEW</div><div id="mmSkew" style="font-size:21px;font-weight:700">0</div></div>';
        host.appendChild(panel);

        var bar = w.el("div", "");
        bar.style.cssText = "margin:16px auto 0;width:min(560px,92%);height:10px;border-radius:6px;background:#121a25;border:1px solid #1c2735;position:relative;overflow:hidden";
        var fill = w.el("div", "");
        fill.style.cssText = "position:absolute;top:0;bottom:0;left:50%;width:0;background:#3aa9ff;transition:.18s";
        bar.appendChild(fill);
        host.appendChild(bar);
        var barLbl = w.el("div", "hint", "flat");
        barLbl.style.marginTop = "6px";
        host.appendChild(barLbl);

        // touch controls — the only way to skew on a phone, since arrow keys don't exist there
        var skewRow = w.el("div", "row");
        skewRow.style.marginTop = "14px";
        var btnDown = w.el("button", "btn", "◀ SKEW");
        var btnFlat = w.el("button", "btn ghost sm", "FLATTEN");
        var btnUp = w.el("button", "btn", "SKEW ▶");
        skewRow.appendChild(btnDown); skewRow.appendChild(btnFlat); skewRow.appendChild(btnUp);
        host.appendChild(skewRow);

        var px = document.getElementById("mmPx");
        var eBid = document.getElementById("mmBid"), eAsk = document.getElementById("mmAsk");
        var eInv = document.getElementById("mmInv"), eSkew = document.getElementById("mmSkew");

        function quotes() {
          var off = skew * cfg.tick;
          return { bid: S - cfg.half + off, ask: S + cfg.half + off };
        }
        function paint() {
          var q = quotes();
          px.textContent = S.toFixed(2);
          eBid.textContent = q.bid.toFixed(2);
          eAsk.textContent = q.ask.toFixed(2);
          eInv.textContent = (inv > 0 ? "+" : "") + inv;
          eInv.style.color = Math.abs(inv) >= cfg.limit - 1 ? "#ff4d5e" : Math.abs(inv) > cfg.limit / 2 ? "#ffb020" : "#dbe4ee";
          eSkew.textContent = (skew > 0 ? "+" : "") + skew;
          eSkew.style.color = skew === 0 ? "#7d8ea3" : skew > 0 ? "#00e08a" : "#ff4d5e";
          var frac = u.clamp(inv / cfg.limit, -1, 1);
          fill.style.width = Math.abs(frac) * 50 + "%";
          fill.style.left = frac >= 0 ? "50%" : (50 - Math.abs(frac) * 50) + "%";
          fill.style.background = Math.abs(frac) > 0.75 ? "#ff4d5e" : Math.abs(frac) > 0.4 ? "#ffb020" : "#3aa9ff";
          barLbl.textContent = inv === 0 ? "flat" : (inv > 0 ? "long " : "short ") + Math.abs(inv) + " lots";
          w.drawSeries(cv, [
            { data: hist, color: "#3aa9ff", width: 2, fill: true, dot: true },
            { data: hist.map(function () { return hist[0]; }), color: "#28374a", width: 1, dash: [3, 4] }
          ], { grid: true, pad: 12 });
        }

        var tickT = setInterval(function () {
          S += rng.norm(0, cfg.sigma);
          hist.push(S);
          if (hist.length > 220) hist.shift();
          paint();
        }, 100);

        var flowT = setInterval(function () {
          var q = quotes();
          var pBuy = 1 / (1 + Math.exp(skew * cfg.beta));   // customer buys from us
          var e;
          if (rng.bool(pBuy)) { e = q.ask - S; inv -= 1; }
          else { e = S - q.bid; inv += 1; }
          edge += e; fills++;
          maxAbs = Math.max(maxAbs, Math.abs(inv));
          ctx.mark(e > 0);
          ctx.addScore(Math.round(e * cfg.scale), eBid);

          if (Math.abs(inv) > cfg.limit) {
            liqs++;
            var cut = inv > 0 ? -Math.ceil(inv / 2) : Math.ceil(-inv / 2);
            inv += cut;
            ctx.addScore(-cfg.liqPen, eInv);
            ctx.toast("LIMIT BREACH — forced liquidation", "bad");
          }
          paint();
        }, cfg.flowMs);

        var markT = setInterval(function () {
          var d = inv * (S - lastMark);
          lastMark = S;
          if (Math.abs(d) > 1e-9) ctx.addScore(Math.round(d * cfg.scale), eInv);
          // capital charge: a position is not free even when the price does not move
          var carry = Math.round(cfg.carry * inv * inv);
          if (carry > 0) ctx.addScore(-carry, eInv);
        }, 1000);

        function skewDown() { skew = Math.max(-4, skew - 1); paint(); }
        function skewUp() { skew = Math.min(4, skew + 1); paint(); }
        function skewFlat() { skew = 0; paint(); }
        btnDown.onclick = skewDown;
        btnUp.onclick = skewUp;
        btnFlat.onclick = skewFlat;
        onKey(function (e) {
          if (e.key === "ArrowLeft") { e.preventDefault(); skewDown(); }
          if (e.key === "ArrowRight") { e.preventDefault(); skewUp(); }
          if (e.key === "0" || e.key === " ") { e.preventDefault(); skewFlat(); }
        });
        onCleanup(function () { clearInterval(tickT); clearInterval(flowT); clearInterval(markT); });
        paint();
      });

      // close out whatever is left, across the spread
      if (inv !== 0) ctx.addScore(Math.round(-Math.abs(inv) * cfg.half * 2 * cfg.scale));

      ctx.extra = [
        { label: "FILLS", value: fills },
        { label: "EDGE", value: u.round(edge, 2) },
        { label: "PEAK POS", value: maxAbs },
        { label: "LIQUIDATIONS", value: liqs }
      ];
      ctx.notes = "The edge is real but tiny; the position is the whole game. Good players skew <b>early and gently</b> at ±2 lots rather than dumping hard at the limit — by the time you are at the limit, the market decides your PnL, not you.";
    }
  });
})();
