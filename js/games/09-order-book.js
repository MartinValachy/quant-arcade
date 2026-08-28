/* 09 — Order Book Reader : the book flashes, then you answer from memory */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  function makeBook(rng, cfg) {
    var tick = rng.pick([0.01, 0.05, 0.25]);
    var mid = u.round(rng.uni(20, 180) / tick, 0) * tick;
    var half = tick * (rng.bool(0.6) ? 1 : 2) / 2;
    var bids = [], asks = [];
    for (var i = 0; i < cfg.levels; i++) {
      bids.push({ p: u.round(mid - half - i * tick, 4), s: rng.int(1, 40) * 5 });
      asks.push({ p: u.round(mid + half + i * tick, 4), s: rng.int(1, 40) * 5 });
    }
    return { tick: tick, bids: bids, asks: asks, mid: u.round((bids[0].p + asks[0].p) / 2, 4) };
  }

  function bookHTML(b) {
    var maxS = Math.max.apply(null, b.bids.concat(b.asks).map(function (l) { return l.s; }));
    function row(l, side) {
      var pctw = (l.s / maxS) * 100;
      var col = side === "b" ? "#00e08a" : "#ff4d5e";
      return '<div style="display:flex;align-items:center;gap:6px;padding:5px 6px;position:relative;font-family:var(--mono);font-size:13px">' +
        '<div style="position:absolute;top:2px;bottom:2px;' + (side === "b" ? "right" : "left") + ':0;width:' + pctw + '%;background:' + col + '18;border-radius:4px"></div>' +
        '<span style="width:44px;text-align:' + (side === "b" ? "right" : "left") + ';color:#7d8ea3;position:relative">' + l.s + "</span>" +
        '<span style="width:58px;text-align:' + (side === "b" ? "left" : "right") + ';color:' + col + ';font-weight:700;position:relative">' + l.p.toFixed(2) + "</span>" +
        "</div>";
    }
    // Widths above are deliberately tight (44+58+6+12 padding ≈ 120px per column) so the
    // two-column book fits inside an iPhone SE's ~300px content area without clipping.
    return '<div style="display:flex;gap:14px;justify-content:center">' +
      '<div><div class="mono" style="font-size:9px;letter-spacing:.12em;color:#4c5c70;text-align:right;padding-right:6px;margin-bottom:6px">SIZE &nbsp; BID</div>' +
      b.bids.map(function (l) { return row(l, "b"); }).join("") + "</div>" +
      '<div><div class="mono" style="font-size:9px;letter-spacing:.12em;color:#4c5c70;padding-left:6px;margin-bottom:6px">ASK &nbsp; SIZE</div>' +
      b.asks.map(function (l) { return row(l, "a"); }).join("") + "</div></div>";
  }

  function flash(ctx, html, ms) {
    return w.guarded(ctx, function (finish, onKey, onCleanup) {
      var host = w.mount(ctx);
      host.appendChild(w.promptEl({ eyebrow: "READ THE BOOK", q: "", sub: "" }));
      var box = w.el("div", "flash-in", html);
      host.appendChild(box);
      var bar = w.el("div", "");
      bar.style.cssText = "margin:22px auto 0;width:min(420px,80%);height:3px;background:#1c2735;border-radius:2px;overflow:hidden";
      var f = w.el("div", "");
      f.style.cssText = "height:100%;width:100%;background:#ffb020;transition:width " + ms + "ms linear";
      bar.appendChild(f);
      host.appendChild(bar);
      setTimeout(function () { f.style.width = "0%"; }, 16);
      var t = setTimeout(function () { finish({ ok: true }); }, ms);
      onCleanup(function () { clearTimeout(t); });
    });
  }

  function sweep(levels, qty) {
    var left = qty, cost = 0, depth = 0;
    for (var i = 0; i < levels.length && left > 0; i++) {
      var take = Math.min(left, levels[i].s);
      cost += take * levels[i].p; left -= take; depth = i + 1;
    }
    if (left > 0) return null;
    return { vwap: cost / qty, depth: depth };
  }

  var Q = {
    mid: function (b, rng) {
      var opts = [b.mid, b.bids[0].p, b.asks[0].p, u.round(b.mid + b.tick, 4)];
      return { q: "What was the mid?", opts: opts, a: b.mid, fmt: 2, why: "(" + b.bids[0].p.toFixed(2) + " + " + b.asks[0].p.toFixed(2) + ") / 2" };
    },
    bestSize: function (b, rng) {
      var side = rng.bool() ? "bid" : "ask";
      var a = side === "bid" ? b.bids[0].s : b.asks[0].s;
      var opts = [a, side === "bid" ? b.asks[0].s : b.bids[0].s, b.bids[1].s, b.asks[1].s];
      return { q: "How much size was on the best " + side + "?", opts: opts, a: a, fmt: 0, why: "top of book" };
    },
    imbalance: function (b, rng) {
      var k = Math.min(3, b.bids.length);
      var sb = u.sum(b.bids.slice(0, k).map(function (l) { return l.s; }));
      var sa = u.sum(b.asks.slice(0, k).map(function (l) { return l.s; }));
      return {
        q: "Which side carried more size in the top " + k + " levels?",
        choices: [
          { label: "BIDS", correct: sb > sa }, { label: "ASKS", correct: sa > sb }
        ],
        why: "bids " + sb + " vs asks " + sa
      };
    },
    micro: function (b, rng) {
      var bs = b.bids[0].s, as = b.asks[0].s;
      var mp = (b.bids[0].p * as + b.asks[0].p * bs) / (bs + as);
      var opts = [mp, b.mid, (b.bids[0].p * bs + b.asks[0].p * as) / (bs + as), b.asks[0].p];
      return {
        q: "What was the microprice?",
        opts: opts, a: mp, fmt: 3,
        why: "(bid×askSize + ask×bidSize)/(total) = (" + b.bids[0].p.toFixed(2) + "×" + as + " + " + b.asks[0].p.toFixed(2) + "×" + bs + ")/" + (bs + as)
      };
    },
    sweepQ: function (b, rng) {
      var side = rng.bool() ? "asks" : "bids";
      var lv = b[side];
      var cap = u.sum(lv.map(function (l) { return l.s; }));
      var qty = Math.round(u.clamp(rng.uni(0.35, 0.8) * cap, 10, cap) / 5) * 5;
      var r = sweep(lv, qty);
      if (!r) return null;
      var opts = [r.vwap, lv[0].p, b.mid, u.mean(lv.map(function (l) { return l.p; }))];
      return {
        q: "A market " + (side === "asks" ? "BUY" : "SELL") + " of " + qty + " lots sweeps the book. Average fill price?",
        opts: opts, a: r.vwap, fmt: 3,
        why: "clears " + r.depth + " level" + (r.depth > 1 ? "s" : "") + ", VWAP " + r.vwap.toFixed(3)
      };
    },
    depth: function (b, rng) {
      var side = rng.bool() ? "asks" : "bids";
      var lv = b[side];
      var cap = u.sum(lv.map(function (l) { return l.s; }));
      var qty = Math.round(u.clamp(rng.uni(0.3, 0.85) * cap, 10, cap) / 5) * 5;
      var r = sweep(lv, qty);
      if (!r) return null;
      return {
        q: "How many levels does a " + qty + "-lot market " + (side === "asks" ? "buy" : "sell") + " consume?",
        opts: [r.depth, r.depth + 1, Math.max(1, r.depth - 1), r.depth + 2],
        a: r.depth, fmt: 0, why: "cumulative size clears at level " + r.depth
      };
    },
    total: function (b, rng) {
      var side = rng.bool() ? "bids" : "asks";
      var t = u.sum(b[side].map(function (l) { return l.s; }));
      var o = u.sum(b[side === "bids" ? "asks" : "bids"].map(function (l) { return l.s; }));
      return {
        q: "Total displayed size on the " + side.toUpperCase() + "?",
        opts: [t, o, t + b[side][0].s, Math.round(t * 0.8 / 5) * 5],
        a: t, fmt: 0, why: b[side].map(function (l) { return l.s; }).join(" + ") + " = " + t
      };
    }
  };

  QA.registerGame({
    id: "order-book", n: 9, name: "Order Book Reader", cat: "mm",
    blurb: "A level-2 book flashes up, then vanishes. Mid, microprice, imbalance, sweep VWAP — answered from what you actually took in.",
    skills: ["Reading depth at a glance", "Microprice and imbalance", "Sweep arithmetic", "Working memory under time pressure"],
    rules: "<p>The book is visible for a couple of seconds, then it is replaced by one question about it. Keys <kbd>1</kbd>–<kbd>4</kbd>.</p>" +
      "<p>You will be asked for the mid, the top-of-book size, which side is heavier, the <b>microprice</b> (bid×askSize + ask×bidSize)/total, or the average fill of a sweep. Look at shape and totals first, exact prices second.</p>",
    variants: {
      standard: {
        label: "Standard", note: "4 levels, 2.6s look", duration: 75, pts: 120, par: 5500, penalty: 0.3,
        levels: 4, flashMs: 2600, qs: ["mid", "bestSize", "imbalance", "total", "depth"],
        th: { p50: 220, p90: 910, p95: 1102, p99: 1550 }
      },
      hard: {
        label: "Hard", note: "6 levels, 1.7s look, microprice & sweeps", duration: 75, pts: 175, par: 7000, penalty: 0.35,
        levels: 6, flashMs: 1700, qs: ["micro", "sweepQ", "imbalance", "total", "depth", "micro", "sweepQ"],
        th: { p50: 260, p90: 1150, p95: 1575, p99: 2275 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      while (ctx.running) {
        var b = makeBook(rng, cfg);
        var spec = null, guard = 0;
        while (!spec && guard++ < 20) spec = Q[rng.pick(cfg.qs)](b, rng);
        if (!spec) continue;

        var f = await flash(ctx, bookHTML(b), cfg.flashMs);
        if (f.aborted) break;

        var choices;
        if (spec.choices) choices = spec.choices;
        else {
          var opts = [];
          spec.opts.forEach(function (o) {
            if (opts.every(function (x) { return Math.abs(x - o) > Math.pow(10, -spec.fmt) / 2; })) opts.push(o);
          });
          while (opts.length < 4) opts.push(spec.a * (1 + rng.uni(-0.06, 0.06)));
          rng.shuffle(opts);
          choices = opts.map(function (o) {
            return { label: spec.fmt ? o.toFixed(spec.fmt) : u.fmt(o), correct: Math.abs(o - spec.a) < 1e-9 };
          });
        }

        var res = await w.ask(ctx, {
          eyebrow: "THE BOOK IS GONE",
          q: spec.q, sub: "",
          choices: choices,
          cols: spec.choices ? 2 : 0,
          feedbackMs: 900,
          explain: function (i, ok) { return (ok ? "✔ " : "✘ ") + spec.why; }
        });
        if (res.aborted) break;
      }
      ctx.notes = "Microprice, not mid, is where the next trade prints. When the bid holds 400 and the ask holds 20, fair value sits <b>near the ask</b> — the heavy side is the one that has to wait.";
    }
  });
})();
