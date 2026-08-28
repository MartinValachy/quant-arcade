/* ============================================================
   util.js — DOM + formatting + small math helpers.
   ============================================================ */
(function () {
  var QA = (window.QA = window.QA || {});

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined && html !== null) e.innerHTML = html;
    return e;
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  var U = {
    el: el, $: $, $$: $$, clear: clear,

    clamp: function (x, a, b) { return x < a ? a : x > b ? b : x; },
    round: function (x, d) { var m = Math.pow(10, d || 0); return Math.round(x * m) / m; },
    sum: function (a) { return a.reduce(function (x, y) { return x + y; }, 0); },
    mean: function (a) { return U.sum(a) / a.length; },
    sd: function (a) { var m = U.mean(a); return Math.sqrt(U.sum(a.map(function (x) { return (x - m) * (x - m); })) / Math.max(1, a.length - 1)); },
    corr: function (a, b) {
      var ma = U.mean(a), mb = U.mean(b), sa = 0, sb = 0, sab = 0;
      for (var i = 0; i < a.length; i++) { var da = a[i] - ma, db = b[i] - mb; sa += da * da; sb += db * db; sab += da * db; }
      return sab / Math.sqrt(sa * sb || 1e-12);
    },
    /** n choose k, exact for the sizes these games use */
    nCk: function (n, k) {
      if (k < 0 || k > n) return 0;
      k = Math.min(k, n - k);
      var r = 1;
      for (var i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
      return Math.round(r);
    },
    fact: function (n) { var r = 1; for (var i = 2; i <= n; i++) r *= i; return r; },
    /** normal CDF */
    ncdf: function (x) {
      var t = 1 / (1 + 0.2316419 * Math.abs(x));
      var d = 0.3989422804014327 * Math.exp(-x * x / 2);
      var p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
      return x > 0 ? 1 - p : p;
    },

    /* ---------- formatting ---------- */
    fmt: function (x, d) {
      if (!isFinite(x)) return "—";
      return Number(x).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 0 : d });
    },
    money: function (x, d) { return (x < 0 ? "-$" : "$") + U.fmt(Math.abs(x), d === undefined ? 0 : d); },
    pct: function (x, d) { return U.round(x * 100, d === undefined ? 1 : d) + "%"; },
    signed: function (x, d) { return (x > 0 ? "+" : "") + U.fmt(x, d); },

    /* ---------- misc ---------- */
    wait: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  };

  QA.u = U;
})();
