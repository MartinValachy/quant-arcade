/* ============================================================
   rng.js — random number utilities used by every game.
   Exposes window.QA.rng (a fresh mulberry32 stream per run).
   ============================================================ */
(function () {
  var QA = (window.QA = window.QA || {});

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRng(seed) {
    var next = mulberry32(seed === undefined ? (Math.random() * 1e9) | 0 : seed);
    var spare = null;

    var R = {
      seed: seed,
      /** uniform [0,1) */
      f: next,
      /** uniform float in [a,b) */
      uni: function (a, b) { return a + (b - a) * next(); },
      /** integer in [a,b] inclusive */
      int: function (a, b) {
        if (a > b) throw new RangeError("rng.int requires a <= b");
        return a + Math.floor(next() * (b - a + 1));
      },
      /** true with probability p */
      bool: function (p) { return next() < (p === undefined ? 0.5 : p); },
      /** random element */
      pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      /** n distinct random elements */
      sample: function (arr, n) { return R.shuffle(arr.slice()).slice(0, n); },
      shuffle: function (arr) {
        for (var i = arr.length - 1; i > 0; i--) {
          var j = Math.floor(next() * (i + 1));
          var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
      },
      /** standard normal (Box-Muller with cached spare) */
      norm: function (mu, sd) {
        mu = mu || 0; sd = sd === undefined ? 1 : sd;
        if (spare !== null) { var s = spare; spare = null; return mu + sd * s; }
        var u = 0, v = 0, s2 = 0;
        do { u = next() * 2 - 1; v = next() * 2 - 1; s2 = u * u + v * v; }
        while (s2 >= 1 || s2 === 0);
        var m = Math.sqrt(-2 * Math.log(s2) / s2);
        spare = v * m;
        return mu + sd * u * m;
      },
      /** binomial count of n trials at prob p */
      binom: function (n, p) { var c = 0; for (var i = 0; i < n; i++) if (next() < p) c++; return c; },
      /** poisson */
      pois: function (lam) {
        var L = Math.exp(-lam), k = 0, p = 1;
        do { k++; p *= next(); } while (p > L);
        return k - 1;
      },
      /** a plausible ticker symbol */
      ticker: function () {
        var A = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        var n = 3 + (next() < 0.35 ? 1 : 0), s = "";
        for (var i = 0; i < n; i++) s += A[Math.floor(next() * A.length)];
        return s;
      }
    };
    return R;
  }

  QA.makeRng = makeRng;
  QA.rng = makeRng();
})();
