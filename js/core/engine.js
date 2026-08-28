/* ============================================================
   engine.js — game registry + the 75-second sprint runtime.

   Scoring contract (shared by every item-based game):
     award = base x quality x speed x streak
       quality : 1 for correct, `partial` in [0,1] for estimates,
                 -penalty for a miss
       speed   : 1 + 0.5*clamp(1 - ms/par, -0.6, 0.6)  -> [0.7, 1.3]
       streak  : 1 + 0.06*min(streak,10)               -> [1.0, 1.6]
   Live games (market making, detection) bypass this and call
   ctx.addScore() with their own PnL-based numbers.
   ============================================================ */
(function () {
  var QA = (window.QA = window.QA || {});
  var u = QA.u;

  QA.games = [];
  QA.byId = {};
  QA.registerGame = function (def) {
    QA.games.push(def);
    QA.byId[def.id] = def;
  };

  QA.CATS = {
    prob:   { label: "PROBABILITY & EV", color: "#00e08a" },
    mm:     { label: "MARKET MAKING",    color: "#3aa9ff" },
    math:   { label: "MENTAL MATH",      color: "#ffb020" },
    signal: { label: "SIGNAL & STATS",   color: "#a97bff" }
  };

  function Engine(opts) {
    var timer = null;
    var game = opts.game, cfg = opts.cfg, variantKey = opts.variantKey;
    var stage = document.getElementById("stage");
    var hud = {
      score: document.getElementById("hudScore"),
      streak: document.getElementById("hudStreak"),
      acc: document.getElementById("hudAcc"),
      time: document.getElementById("hudTime"),
      timeBox: document.querySelector(".stat.time"),
      fill: document.getElementById("timeFill")
    };
    var duration = (cfg.duration || 75) * 1000;
    var t0 = performance.now();
    var ended = false;

    var ctx = {
      game: game, cfg: cfg, variant: variantKey,
      stage: stage,
      rng: QA.makeRng(),
      running: true,
      score: 0,
      stats: { items: 0, correct: 0, streak: 0, maxStreak: 0, sumMs: 0, partial: 0 },
      notes: "",
      extra: [],
      _aborts: [],

      elapsed: function () { return performance.now() - t0; },
      timeLeft: function () { return Math.max(0, duration - (performance.now() - t0)); },
      addTime: function (sec) { t0 += sec * 1000; },

      /** central item resolution */
      resolve: function (r) {
        var s = ctx.stats;
        s.items++;
        s.sumMs += r.ms || 0;
        var par = cfg.par || 4000;
        var speed = 1 + 0.5 * u.clamp(1 - (r.ms || par) / par, -0.6, 0.6);
        var base = r.pts || cfg.pts || 100;
        var pts;
        if (r.partial !== undefined && r.partial !== null) {
          s.partial += r.partial;
          if (r.correct) { s.correct++; s.streak++; } else { s.streak = 0; }
          pts = Math.round(base * r.partial * speed * (1 + 0.06 * Math.min(s.streak, 10)));
        } else if (r.correct) {
          s.correct++; s.streak++;
          pts = Math.round(base * speed * (1 + 0.06 * Math.min(s.streak, 10)));
        } else {
          s.streak = 0;
          pts = -Math.round(base * (cfg.penalty === undefined ? 0.35 : cfg.penalty));
        }
        s.maxStreak = Math.max(s.maxStreak, s.streak);
        ctx.addScore(pts, r.el);
        return pts;
      },

      /** direct score change (live games + resolve) */
      addScore: function (pts, anchorEl) {
        ctx.score += pts;
        hud.score.textContent = u.fmt(Math.round(ctx.score));
        hud.score.style.color = pts >= 0 ? "var(--fg)" : "var(--red)";
        hud.streak.textContent = ctx.stats.streak;
        var acc = ctx.stats.items ? Math.round(100 * (ctx.stats.correct / ctx.stats.items)) : null;
        hud.acc.textContent = acc === null ? "—" : acc + "%";
        if (pts !== 0) pop(pts, anchorEl);
      },

      /** count an event without the standard scoring maths */
      mark: function (correct) {
        ctx.stats.items++;
        if (correct) { ctx.stats.correct++; ctx.stats.streak++; ctx.stats.maxStreak = Math.max(ctx.stats.maxStreak, ctx.stats.streak); }
        else ctx.stats.streak = 0;
      },

      toast: function (msg, kind) {
        var layer = document.getElementById("toastLayer");
        var t = u.el("div", "toast " + (kind || ""), msg);
        layer.appendChild(t);
        setTimeout(function () { t.style.opacity = 0; t.style.transition = "opacity .3s"; }, 1100);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 1500);
      },

      finish: function () { end("done"); }
    };

    function pop(pts, anchorEl) {
      var p = u.el("div", "score-pop", (pts > 0 ? "+" : "") + u.fmt(pts));
      p.style.color = pts > 0 ? "var(--grn)" : "var(--red)";
      var sr = stage.getBoundingClientRect();
      var x = sr.width / 2, y = sr.height / 2;
      if (anchorEl && anchorEl.getBoundingClientRect) {
        var r = anchorEl.getBoundingClientRect();
        x = r.left - sr.left + r.width / 2;
        y = r.top - sr.top;
      }
      p.style.left = (x - 26) + "px";
      p.style.top = Math.max(4, y - 30) + "px";
      stage.appendChild(p);
      setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 1000);
    }

    function tick() {
      if (ended) return;
      var left = ctx.timeLeft();
      var frac = left / duration;
      hud.time.textContent = (left / 1000).toFixed(1);
      hud.fill.style.width = (frac * 100) + "%";
      var cls = frac < 0.15 ? "crit" : frac < 0.35 ? "warn" : "";
      hud.fill.className = cls;
      hud.timeBox.className = "stat time " + cls;
      if (left <= 0) { end("time"); return; }
    }

    function end(reason) {
      if (ended) return;
      ended = true;
      ctx.running = false;
      if (timer) { clearInterval(timer); timer = null; }
      ctx._aborts.slice().forEach(function (a) { try { a(); } catch (e) {} });
      hud.fill.style.width = "0%";
      setTimeout(function () { opts.onFinish(finalise(reason)); }, 260);
    }

    function finalise(reason) {
      var s = ctx.stats;
      var score = Math.max(0, Math.round(ctx.score));
      return {
        game: game, cfg: cfg, variant: variantKey, reason: reason,
        score: score,
        items: s.items,
        correct: s.correct,
        accuracy: s.items ? s.correct / s.items : 0,
        maxStreak: s.maxStreak,
        avgMs: s.items ? s.sumMs / s.items : 0,
        notes: ctx.notes,
        extra: ctx.extra
      };
    }

    // ---- kick off ----
    document.getElementById("hudName").textContent = game.name;
    document.getElementById("hudVariant").textContent = (cfg.label || variantKey).toUpperCase();
    hud.score.textContent = "0"; hud.score.style.color = "var(--fg)";
    hud.streak.textContent = "0"; hud.acc.textContent = "—";
    hud.fill.style.width = "100%"; hud.fill.className = "";
    u.clear(stage);
    // wall-clock driven: setInterval keeps ticking in a backgrounded tab, and
    // timeLeft() is computed from performance.now(), so elapsed time stays honest.
    timer = setInterval(tick, 50);
    tick();

    Promise.resolve()
      .then(function () { return game.play(ctx); })
      .then(function () { if (ctx.running) end("done"); })
      .catch(function (e) {
        console.error("[game error]", game.id, e);
        if (ctx.running) end("error");
      });

    return { abort: function () { end("quit"); } };
  }

  QA.Engine = Engine;
})();
