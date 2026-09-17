/* ============================================================
   percentile.js — turns a raw game score into a modelled
   "you are in the top X% of quant applicants" statement.

   Method (see CALIBRATION.md for the per-game derivations):
   Each variant ships four anchor scores {p50,p90,p95,p99} that
   were derived from the game's own maths — optimal play, the
   score a candidate with a given error rate / reaction time
   achieves, and the noise of a 75-second sample.

   We assume latent ability is normal. Anchor scores are pinned
   to their z-values, score is interpolated piecewise-linearly in
   z, and the tail probability is read back off the normal CDF.
   That gives a smooth curve that exactly honours the four
   anchors and degrades sensibly outside them.
   ============================================================ */
(function () {
  var QA = (window.QA = window.QA || {});
  var u = QA.u;

  var ANCHORS = [
    { t: 0.50, z: 0.0000 },
    { t: 0.10, z: 1.2816 },
    { t: 0.05, z: 1.6449 },
    { t: 0.01, z: 2.3263 }
  ];

  function scoreToZ(score, th) {
    var pts = [
      { s: th.p50, z: 0.0000 },
      { s: th.p90, z: 1.2816 },
      { s: th.p95, z: 1.6449 },
      { s: th.p99, z: 2.3263 }
    ];
    // guarantee strict monotonicity even if a table is sloppy
    for (var i = 1; i < pts.length; i++) if (pts[i].s <= pts[i - 1].s) pts[i].s = pts[i - 1].s + 1;

    if (score <= pts[0].s) {
      var slopeLo = (pts[1].s - pts[0].s) / (pts[1].z - pts[0].z);
      return (score - pts[0].s) / (slopeLo || 1);
    }
    for (var j = 0; j < pts.length - 1; j++) {
      if (score <= pts[j + 1].s) {
        var f = (score - pts[j].s) / (pts[j + 1].s - pts[j].s);
        return pts[j].z + f * (pts[j + 1].z - pts[j].z);
      }
    }
    var slopeHi = (pts[3].s - pts[2].s) / (pts[3].z - pts[2].z);
    return pts[3].z + (score - pts[3].s) / (slopeHi || 1);
  }

  function band(tail) {
    if (tail <= 0.01) return { key: "p99", label: "TOP 1%", color: "#ffb020", note: "Hire-level. This is where the offers live." };
    if (tail <= 0.05) return { key: "p95", label: "TOP 5%", color: "#a97bff", note: "Strong pass. Comfortably through this round." };
    if (tail <= 0.10) return { key: "p90", label: "TOP 10%", color: "#3aa9ff", note: "Above the usual cut line for a first-round screen." };
    if (tail <= 0.25) return { key: "p75", label: "TOP 25%", color: "#22d3ee", note: "Competent, but the shortlist starts above you." };
    if (tail <= 0.50) return { key: "p50", label: "ABOVE MEDIAN", color: "#7d8ea3", note: "Better than half the room. Not yet a differentiator." };
    return { key: "sub", label: "BELOW MEDIAN", color: "#ff4d5e", note: "Run it again — most of this is trainable within a week." };
  }

  QA.pct = {
    anchors: ANCHORS,
    /** returns {tail, top, band} — tail is the fraction scoring above you */
    evaluate: function (score, th) {
      var z = scoreToZ(score, th);
      var tail = u.clamp(1 - u.ncdf(z), 0.0004, 0.9995);
      return { z: z, tail: tail, top: tail * 100, band: band(tail) };
    },
    band: band,
    /** pretty "Top 3.4%" / "Top 0.4%" string */
    topString: function (tail) {
      var p = tail * 100;
      if (p < 1) return "Top " + u.round(p, 2) + "%";
      if (p < 10) return "Top " + u.round(p, 1) + "%";
      return "Top " + Math.round(p) + "%";
    },
    /** aggregate desk rating: combine per-game tails into one z */
    desk: function (tails) {
      if (!tails.length) return null;
      var zs = tails.map(function (t) { return u.clamp(-invNorm(t), -3, 3.2); });
      // average ability, with a mild penalty for a thin sample
      var m = u.mean(zs);
      var shrink = zs.length / (zs.length + 3);
      var z = m * shrink;
      var tail = u.clamp(1 - u.ncdf(z), 0.0005, 0.9995);
      return { z: z, tail: tail, band: band(tail), n: zs.length };
    }
  };

  /** inverse standard normal CDF (Acklam) — returns z such that P(Z<z)=p */
  function invNorm(p) {
    if (!(p > 0 && p < 1)) throw new RangeError("invNorm requires 0 < p < 1");
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var pl = 0.02425, q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  QA.pct.invNorm = invNorm;
})();
