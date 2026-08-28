/* ============================================================
   app.js — screens, navigation, the desk board and results.
   ============================================================ */
(function () {
  var QA = window.QA, u = QA.u, el = u.el, $ = u.$;

  var state = { filter: "all", game: null, variant: null, engine: null, last: null };

  /* ---------------- navigation ---------------- */
  function show(id) {
    u.$$(".screen").forEach(function (s) { s.classList.remove("active"); });
    document.getElementById(id).classList.add("active");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  /* ---------------- badges & ratings ---------------- */
  function bandFor(game, variantKey) {
    var rec = QA.store.get(game.id, variantKey);
    if (!rec.plays) return null;
    return QA.pct.evaluate(rec.best, game.variants[variantKey].th);
  }
  function bestBand(game) {
    var best = null;
    Object.keys(game.variants).forEach(function (k) {
      var b = bandFor(game, k);
      if (b && (!best || b.tail < best.tail)) best = b;
    });
    return best;
  }

  function refreshDesk() {
    var tails = [];
    QA.games.forEach(function (g) {
      var b = bestBand(g);
      if (b) tails.push(b.tail);
    });
    var d = QA.pct.desk(tails);
    var v = document.getElementById("deskRating"), s = document.getElementById("deskSub");
    if (!d) { v.textContent = "—"; v.style.color = "var(--dim)"; s.textContent = "no games played"; return; }
    v.textContent = QA.pct.topString(d.tail);
    v.style.color = d.band.color;
    s.textContent = d.band.label.toLowerCase() + " · " + d.n + " of " + QA.games.length + " games played";
  }

  /* ---------------- menu ---------------- */
  function buildFilters() {
    var host = document.getElementById("catFilters");
    u.clear(host);
    var cats = [{ k: "all", label: "ALL 24" }].concat(Object.keys(QA.CATS).map(function (k) {
      return { k: k, label: QA.CATS[k].label };
    }));
    cats.forEach(function (c) {
      var b = el("button", "chip" + (state.filter === c.k ? " on" : ""), c.label);
      b.onclick = function () { state.filter = c.k; buildFilters(); buildGrid(); };
      host.appendChild(b);
    });
  }

  function buildGrid() {
    var host = document.getElementById("gameGrid");
    u.clear(host);
    QA.games
      .slice()
      .sort(function (a, b) { return a.n - b.n; })
      .filter(function (g) { return state.filter === "all" || g.cat === state.filter; })
      .forEach(function (g) {
        var cat = QA.CATS[g.cat];
        var card = el("div", "card");
        card.style.setProperty("--accent", cat.color);
        var band = bestBand(g);
        var rec = QA.store.bestOf(g.id);

        card.appendChild(el("div", "num", String(g.n).padStart(2, "0")));
        card.appendChild(el("div", "cat-chip", cat.label));
        card.appendChild(el("h3", "", g.name));
        card.appendChild(el("p", "", g.blurb));

        var foot = el("div", "cardfoot");
        foot.innerHTML = "<span>" + (rec.plays ? rec.plays + " run" + (rec.plays > 1 ? "s" : "") : "not played") + "</span>" +
          "<span class='best'>" + (rec.best ? "best " + u.fmt(rec.best) : "") + "</span>";
        card.appendChild(foot);

        if (band && band.band.key === "p99") card.appendChild(el("span", "badge b1", "TOP 1%"));
        else if (band && band.band.key === "p95") card.appendChild(el("span", "badge b5", "TOP 5%"));
        else if (band && band.band.key === "p90") card.appendChild(el("span", "badge b10", "TOP 10%"));

        card.onclick = function () { openBrief(g); };
        host.appendChild(card);
      });
  }

  /* ---------------- brief ---------------- */
  function openBrief(g) {
    state.game = g;
    var cat = QA.CATS[g.cat];
    var chip = document.getElementById("briefCat");
    chip.textContent = cat.label;
    chip.style.setProperty("--accent", cat.color);
    document.getElementById("briefTitle").textContent = g.name;
    document.getElementById("briefBlurb").innerHTML = g.blurb;
    var sk = document.getElementById("briefSkills");
    u.clear(sk);
    g.skills.forEach(function (s) { sk.appendChild(el("li", "", s)); });
    document.getElementById("briefRules").innerHTML = g.rules;

    var vp = document.getElementById("variantPick");
    u.clear(vp);
    Object.keys(g.variants).forEach(function (k) {
      var v = g.variants[k];
      var rec = QA.store.get(g.id, k);
      var band = rec.plays ? QA.pct.evaluate(rec.best, v.th) : null;
      var b = el("button", "vbtn");
      b.innerHTML = "<strong>" + v.label + "</strong><span>" + v.note + "</span>" +
        "<em>" + (v.duration || 75) + "s · top 10% at " + u.fmt(v.th.p90) + " · top 1% at " + u.fmt(v.th.p99) +
        (rec.plays ? " · your best " + u.fmt(rec.best) + (band ? " (" + QA.pct.topString(band.tail) + ")" : "") : "") + "</em>";
      b.onclick = function () { startGame(g, k); };
      vp.appendChild(b);
    });
    show("brief");
  }

  /* ---------------- play ---------------- */
  function startGame(g, variantKey) {
    state.game = g; state.variant = variantKey;
    show("play");
    document.getElementById("stage").innerHTML = "";
    state.engine = QA.Engine({
      game: g, cfg: g.variants[variantKey], variantKey: variantKey,
      onFinish: finishGame
    });
  }

  function finishGame(r) {
    state.engine = null;
    state.last = r;
    var th = r.cfg.th;
    var ev = QA.pct.evaluate(r.score, th);
    var rec = QA.store.record(r.game.id, r.variant, r.score);

    document.getElementById("resGame").textContent = r.game.name.toUpperCase() + " · " + (r.cfg.label || r.variant).toUpperCase();
    var sc = document.getElementById("resScore");
    sc.style.color = ev.band.color;
    countUp(sc, r.score);

    var bd = document.getElementById("resBand");
    bd.textContent = ev.band.label;
    bd.style.background = ev.band.color + "22";
    bd.style.color = ev.band.color;
    bd.style.border = "1px solid " + ev.band.color + "55";

    document.getElementById("resPct").innerHTML =
      "Modelled position: <b style='color:" + ev.band.color + "'>" + QA.pct.topString(ev.tail) +
      "</b> of quant applicants on this game. " + ev.band.note +
      (rec.isBest && rec.plays > 1 ? " <b style='color:var(--grn)'>New personal best.</b>" : "");

    // ladder
    var lad = document.getElementById("ladder");
    u.clear(lad);
    [["MEDIAN", th.p50, "#7d8ea3"], ["TOP 10%", th.p90, "#3aa9ff"], ["TOP 5%", th.p95, "#a97bff"], ["TOP 1%", th.p99, "#ffb020"]]
      .forEach(function (row) {
        var hit = r.score >= row[1];
        var d = el("div", "rung" + (hit ? " hit" : ""));
        d.innerHTML = "<span class='lbl'>" + row[0] + "</span><span class='bar'><i></i></span><span class='val'>" + u.fmt(row[1]) + "</span>";
        lad.appendChild(d);
        var i = d.querySelector("i");
        i.style.background = hit ? row[2] : "#28374a";
        setTimeout(function () { i.style.width = Math.min(100, (r.score / row[1]) * 100) + "%"; }, 60);
      });

    // stats
    var st = document.getElementById("resStats");
    u.clear(st);
    var cells = [
      { label: "ITEMS", value: r.items },
      { label: "CORRECT", value: r.correct },
      { label: "ACCURACY", value: r.items ? Math.round(r.accuracy * 100) + "%" : "—" },
      { label: "BEST STREAK", value: r.maxStreak },
      { label: "AVG TIME", value: r.avgMs ? (r.avgMs / 1000).toFixed(1) + "s" : "—" },
      { label: "YOUR BEST", value: u.fmt(rec.best) }
    ].concat(r.extra || []);
    cells.forEach(function (c) {
      var d = el("div", "rs");
      d.innerHTML = "<label>" + c.label + "</label><span>" + c.value + "</span>";
      st.appendChild(d);
    });

    document.getElementById("resNotes").innerHTML = r.notes || "";

    var other = Object.keys(r.game.variants).filter(function (k) { return k !== r.variant; })[0];
    document.getElementById("resOther").textContent = other ? "Try " + r.game.variants[other].label : "Back to desk";

    refreshDesk();
    buildGrid();
    show("results");
  }

  function countUp(node, to) {
    var t0 = performance.now(), dur = 700;
    var iv = setInterval(function () {
      var f = u.clamp((performance.now() - t0) / dur, 0, 1);
      var e = 1 - Math.pow(1 - f, 3);
      node.textContent = u.fmt(Math.round(to * e));
      if (f >= 1) clearInterval(iv);
    }, 32);
  }

  /* ---------------- modal ---------------- */
  function modal(html) {
    document.getElementById("modalBody").innerHTML = html;
    document.getElementById("modal").classList.add("on");
  }
  function closeModal() { document.getElementById("modal").classList.remove("on"); }

  var HOWTO =
    "<h3>How the percentile bands are built</h3>" +
    "<p>Every variant ships four anchor scores: the <b>median</b>, <b>top 10%</b>, <b>top 5%</b> and <b>top 1%</b>. " +
    "These are <b>modelled, not measured</b> — there is no database of real applicants behind this app, and any product that claims otherwise on 24 bespoke games is guessing too.</p>" +
    "<h4>Where the anchors come from</h4>" +
    "<p>For each game the derivation is the same three steps, written out per game in <b>CALIBRATION.md</b>:</p>" +
    "<li>Work out the <b>score under optimal play</b> — perfect accuracy at a realistic human response time for that task.</li>" +
    "<li>Model a candidate at each level as a pair (<b>throughput</b>, <b>accuracy</b>) taken from published response-time and error-rate ranges for the underlying cognitive task.</li>" +
    "<li>Push that pair through this app's actual scoring formula, including the streak and speed multipliers and the wrong-answer penalty.</li>" +
    "<h4>Turning a score into a percentile</h4>" +
    "<p>Latent ability is assumed normal. The four anchors are pinned to their z-values (0, 1.28, 1.64, 2.33), your score is interpolated between them, and the tail probability is read off the normal CDF. Scores past the top-1% anchor extrapolate along the same slope.</p>" +
    "<h4>Scoring inside a game</h4>" +
    "<p><b>award = base × quality × speed × streak</b>, where speed runs from 0.7× to 1.3× against that game's par time and streak builds to 1.6× after ten in a row. Wrong answers cost a fraction of the base. Trading games score cumulative PnL instead and ignore all of that.</p>" +
    "<h4>Desk Rating</h4>" +
    "<p>Your best result on each game is converted to a z-score, averaged, and shrunk toward the median by n/(n+3) — so one lucky run on one game does not make you top 1% of the desk.</p>";

  /* ---------------- wiring ---------------- */
  function init() {
    buildFilters();
    buildGrid();
    refreshDesk();

    document.getElementById("briefBack").onclick = function () { show("menu"); };
    document.getElementById("playQuit").onclick = function () {
      if (state.engine) state.engine.abort(); else show("menu");
    };
    document.getElementById("resAgain").onclick = function () { startGame(state.last.game, state.last.variant); };
    document.getElementById("resOther").onclick = function () {
      var other = Object.keys(state.last.game.variants).filter(function (k) { return k !== state.last.variant; })[0];
      if (other) startGame(state.last.game, other); else show("menu");
    };
    document.getElementById("resMenu").onclick = function () { show("menu"); };
    document.getElementById("btnHowTo").onclick = function () { modal(HOWTO); };
    document.getElementById("modalClose").onclick = closeModal;
    document.getElementById("modal").onclick = function (e) { if (e.target.id === "modal") closeModal(); };
    document.getElementById("btnReset").onclick = function () {
      modal("<h3>Reset all progress?</h3><p>This clears every best score and play count stored in this browser. It cannot be undone.</p>" +
        "<div style='display:flex;gap:10px;margin-top:18px'><button class='btn' id='rsNo'>Keep it</button><button class='btn primary' id='rsYes'>Reset everything</button></div>");
      document.getElementById("rsNo").onclick = closeModal;
      document.getElementById("rsYes").onclick = function () {
        QA.store.reset(); buildGrid(); refreshDesk(); closeModal();
      };
    };

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (document.getElementById("modal").classList.contains("on")) return closeModal();
        if (document.getElementById("play").classList.contains("active") && state.engine) state.engine.abort();
        else if (!document.getElementById("menu").classList.contains("active")) show("menu");
      }
    });

    console.log("[Quant Arcade] " + QA.games.length + " games loaded");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
