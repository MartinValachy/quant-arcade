/* ============================================================
   store.js — local persistence of best scores + play counts.
   Everything is per-browser; nothing leaves the machine.
   ============================================================ */
(function () {
  var QA = (window.QA = window.QA || {});
  var KEY = "quant-arcade:v1";
  var mem = null;

  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY) || "{}"); }
    catch (e) { mem = {}; }
    if (!mem.runs) mem.runs = {};
    return mem;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* private mode: keep in memory */ }
  }
  function slot(gameId, variant) { return gameId + "::" + variant; }

  QA.store = {
    /** returns {best, plays, lastScore, history:[..last 20]} */
    get: function (gameId, variant) {
      var d = load().runs[slot(gameId, variant)];
      return d || { best: 0, plays: 0, lastScore: 0, history: [] };
    },
    record: function (gameId, variant, score) {
      var d = load();
      var k = slot(gameId, variant);
      var r = d.runs[k] || { best: 0, plays: 0, lastScore: 0, history: [] };
      r.plays++;
      r.lastScore = score;
      r.isBest = score > r.best;
      r.best = Math.max(r.best, score);
      r.history.push(Math.round(score));
      if (r.history.length > 20) r.history.shift();
      d.runs[k] = r;
      save();
      return r;
    },
    /** best percentile achieved on any variant of a game */
    bestOf: function (gameId) {
      var d = load(), out = { best: 0, plays: 0, variant: null };
      Object.keys(d.runs).forEach(function (k) {
        if (k.indexOf(gameId + "::") !== 0) return;
        var r = d.runs[k];
        out.plays += r.plays;
        if (r.best > out.best) { out.best = r.best; out.variant = k.split("::")[1]; }
      });
      return out;
    },
    all: function () { return load().runs; },
    reset: function () { mem = { runs: {} }; save(); }
  };
})();
