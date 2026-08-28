/* 15 — Fermi Desk : order-of-magnitude estimation, scored on a log scale */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  var Q = [
    { q: "Seconds in a year", a: 3.156e7, why: "365 × 24 × 3600 ≈ 3.15 × 10⁷ — the famous 'π × 10⁷' approximation" },
    { q: "Heartbeats in an 75-year human life", a: 2.8e9, why: "70 bpm × 5.26×10⁵ min/yr × 75 ≈ 2.8 × 10⁹" },
    { q: "Piano tuners working in a city of 3 million people", a: 100, why: "1M households ÷ 20 with pianos = 50k pianos, tuned yearly, 4/day × 250 days ≈ 100 tuners" },
    { q: "Grains of sand on a 1 km × 30 m beach, 2 m deep", a: 1.3e15, why: "6×10⁴ m³ × 0.6 packing ÷ (0.3 mm)³ ≈ 1.3 × 10¹⁵" },
    { q: "Ping-pong balls that fill a 3 m × 4 m × 3 m room", a: 6.4e5, why: "36 m³ × 0.6 ÷ 3.35×10⁻⁵ m³ per ball ≈ 6.4 × 10⁵" },
    { q: "Ways to shuffle a standard 52-card deck", a: 8.07e67, why: "52! ≈ 8.07 × 10⁶⁷" },
    { q: "Air molecules in a 1-litre bottle at room temperature", a: 2.5e22, why: "1 L ÷ 24.5 L/mol × 6.02×10²³ ≈ 2.5 × 10²²" },
    { q: "Cells in the human body", a: 3.7e13, why: "current best estimate ≈ 3.7 × 10¹³" },
    { q: "Kilometres light travels in one day", a: 2.6e10, why: "3×10⁵ km/s × 86,400 s ≈ 2.6 × 10¹⁰" },
    { q: "Distinct 8-character passwords from 62 characters", a: 2.18e14, why: "62⁸ ≈ 2.2 × 10¹⁴" },
    { q: "Seconds since the Big Bang", a: 4.4e17, why: "1.38×10¹⁰ yr × 3.15×10⁷ s ≈ 4.4 × 10¹⁷" },
    { q: "$100 bills in a stack one kilometre tall", a: 9.1e6, why: "10⁶ mm ÷ 0.11 mm per note ≈ 9.1 × 10⁶" },
    { q: "Words in a typical 300-page novel", a: 9e4, why: "≈ 300 pages × 300 words ≈ 9 × 10⁴" },
    { q: "Hairs on an average human head", a: 1.1e5, why: "≈ 100,000–120,000" },
    { q: "Litres of water in an Olympic swimming pool", a: 2.5e6, why: "50 × 25 × 2 m = 2500 m³ = 2.5 × 10⁶ L" },
    { q: "Golf balls that fit inside a school bus", a: 5e5, why: "≈ 50 m³ usable × 0.6 ÷ 4×10⁻⁵ m³ ≈ 7×10⁵, commonly quoted 500k" },
    { q: "Kilometres of blood vessels in one human body", a: 1e5, why: "commonly cited figure ≈ 100,000 km, dominated by capillaries" },
    { q: "Times an average person blinks in a year", a: 5.3e6, why: "15/min × 60 × 16 waking h × 365 ≈ 5.3 × 10⁶" },
    { q: "Cubic kilometres of water in the Atlantic Ocean", a: 3.1e8, why: "≈ 3.1 × 10⁸ km³" },
    { q: "Atoms in a grain of table salt (0.3 mm cube)", a: 1.2e18, why: "2.7×10⁻⁵ g ÷ 58.4 g/mol × 6×10²³ × 2 ions ≈ 1.2 × 10¹⁸" },
    { q: "People who fit standing in one square kilometre", a: 4e6, why: "4 people/m² × 10⁶ m² ≈ 4 × 10⁶" },
    { q: "Breaths taken in an average human lifetime", a: 6.7e8, why: "16/min × 5.26×10⁵ min/yr × 78 ≈ 6.6 × 10⁸" }
  ];

  function sci(v) {
    if (v < 1000) return u.round(v, v < 10 ? 2 : 0) + "";
    var e = Math.floor(Math.log10(v));
    var m = v / Math.pow(10, e);
    return u.round(m, 2) + " × 10" + sup(e);
  }
  function sup(n) {
    var m = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
    return String(n).split("").map(function (c) { return m[c] || c; }).join("");
  }

  QA.registerGame({
    id: "fermi", n: 15, name: "Fermi Desk", cat: "math",
    blurb: "No formula will save you. Decompose the quantity into things you actually know and land inside the right order of magnitude.",
    skills: ["Decomposition into knowns", "Order-of-magnitude arithmetic", "Calibrated confidence", "Sanity-checking a number"],
    rules: "<p>Drag the slider — it moves on a <b>logarithmic</b> scale, so one nudge is a multiplicative step. Press <kbd>Enter</kbd> to lock in.</p>" +
      "<p>Scoring is on log error. Standard gives full marks within about a <b>factor of 3</b> and partial credit out to a factor of ~16; Hard tightens that hard.</p>",
    variants: {
      standard: {
        label: "Standard", note: "Full credit within ~3×, credit out to ~16×", duration: 80, pts: 230, par: 12000,
        tol: 1.2, full: 0.5,
        th: { p50: 170, p90: 940, p95: 1450, p99: 2225 }
      },
      hard: {
        label: "Hard", note: "Full credit within ~1.6×, nothing past 4×", duration: 80, pts: 300, par: 12000,
        tol: 0.6, full: 0.2,
        th: { p50: 230, p90: 1225, p95: 1875, p99: 2900 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      var pool = rng.shuffle(Q.slice());
      var i = 0, errs = [];

      while (ctx.running) {
        var it = pool[i++ % pool.length];
        var E = Math.log10(it.a);
        var below = rng.uni(2.4, 5.6), span = 8;
        var lo = u.round(E - below, 1), hi = u.round(lo + span, 1);

        var res = await w.slider(ctx, {
          eyebrow: "ESTIMATE THE ORDER OF MAGNITUDE",
          q: it.q + " ?",
          sub: "The slider is logarithmic — each step multiplies.",
          min: lo, max: hi, step: 0.05, start: u.round((lo + hi) / 2, 2),
          fmt: function (x) { return sci(Math.pow(10, x)); },
          pts: cfg.pts,
          passAt: 0.5,
          score: function (x) {
            var e = Math.abs(x - E);
            errs.push(e);
            if (e <= cfg.full) return 1;
            return u.clamp(1 - (e - cfg.full) / (cfg.tol - cfg.full), 0, 1);
          },
          feedbackMs: 1600,
          explain: function (x, acc) {
            var ratio = Math.pow(10, Math.abs(x - E));
            return (acc >= 0.75 ? "✔ " : acc > 0 ? "~ " : "✘ ") + "actual ≈ <b>" + sci(it.a) + "</b> · you were off by <b>" +
              u.round(ratio, 1) + "×</b><div style='margin-top:6px;color:#7d8ea3'>" + it.why + "</div>";
          }
        });
        if (res.aborted) break;
      }

      if (errs.length) ctx.extra = [{ label: "MEDIAN LOG ERR", value: u.round(errs.slice().sort(function (a, b) { return a - b; })[Math.floor(errs.length / 2)], 2) }];
      ctx.notes = "The technique is always the same: <b>write the quantity as a product</b> of three or four things you can bound, round each to one significant figure, and add the exponents. Estimating the answer directly is how people end up three decades out.";
    }
  });
})();
