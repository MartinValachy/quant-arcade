/* 01 — Bayesian Urn : posterior updating from a draw sequence */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  function urnHTML(name, r, b, dim) {
    var chips = "";
    for (var i = 0; i < r; i++) chips += chip("#ff4d5e");
    for (var j = 0; j < b; j++) chips += chip("#3aa9ff");
    return '<div style="opacity:' + (dim ? .55 : 1) + ';background:#121a25;border:1px solid #28374a;border-radius:12px;padding:12px 14px;min-width:150px">' +
      '<div class="mono" style="font-size:11px;letter-spacing:.14em;color:#7d8ea3;margin-bottom:8px">URN ' + name + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:4px;max-width:170px">' + chips + '</div>' +
      '<div class="mono" style="font-size:11px;color:#4c5c70;margin-top:8px">' + r + 'R / ' + b + 'B</div></div>';
  }
  function chip(c) {
    return '<span style="width:15px;height:15px;border-radius:50%;background:' + c + ';display:inline-block;box-shadow:0 0 8px ' + c + '44"></span>';
  }

  function posterior(A, B, priorA, seq) {
    var LA = 1, LB = 1;
    var pA = A.r / (A.r + A.b), pB = B.r / (B.r + B.b);
    for (var i = 0; i < seq.length; i++) {
      if (seq[i] === "R") { LA *= pA; LB *= pB; }
      else { LA *= 1 - pA; LB *= 1 - pB; }
    }
    return priorA * LA / (priorA * LA + (1 - priorA) * LB);
  }

  function makeItem(rng, cfg) {
    var A = { r: rng.int(1, 5), b: rng.int(1, 5) };
    var B = { r: rng.int(1, 5), b: rng.int(1, 5) };
    var guard = 0;
    while (Math.abs(A.r / (A.r + A.b) - B.r / (B.r + B.b)) < 0.18 && guard++ < 60) {
      B = { r: rng.int(1, 5), b: rng.int(1, 5) };
    }
    var priorA = cfg.skewPrior ? rng.pick([0.2, 0.25, 0.3, 0.4, 0.6, 0.7, 0.75, 0.8]) : 0.5;
    var chosen = rng.bool(priorA) ? A : B;
    var pRed = chosen.r / (chosen.r + chosen.b);
    var n = rng.int(cfg.draws[0], cfg.draws[1]);
    var seq = [];
    for (var i = 0; i < n; i++) seq.push(rng.bool(pRed) ? "R" : "B");

    var post = posterior(A, B, priorA, seq);

    // classic wrong turns
    var noPrior = posterior(A, B, 0.5, seq);
    var lastOnly = posterior(A, B, priorA, [seq[seq.length - 1]]);
    var flipped = 1 - post;

    var cands = [noPrior, lastOnly, flipped, priorA, post * 0.6 + 0.2];
    var opts = [post];
    cands.forEach(function (c) {
      if (opts.length >= 4) return;
      if (c > 0.02 && c < 0.98 && opts.every(function (o) { return Math.abs(o - c) > 0.035; })) opts.push(c);
    });
    var fillGuard = 0;
    while (opts.length < 4 && fillGuard++ < 200) {
      var j = u.clamp(post + rng.uni(-0.3, 0.3), 0.03, 0.97);
      if (opts.every(function (o) { return Math.abs(o - j) > 0.04; })) opts.push(j);
    }
    // Deterministic fallback keeps the question scorable even if a supplied RNG
    // repeatedly returns a colliding distractor.
    for (var f = 0; opts.length < 4 && f <= 94; f++) {
      var fallback = 0.03 + f * 0.01;
      if (opts.every(function (o) { return Math.abs(o - fallback) > 0.04; })) opts.push(fallback);
    }
    rng.shuffle(opts);

    return { A: A, B: B, priorA: priorA, seq: seq, post: post, opts: opts, noPrior: noPrior };
  }

  QA.registerGame({
    id: "bayes-urn", n: 1, name: "Bayesian Urn", cat: "prob",
    blurb: "An urn is picked in secret, then balls are drawn with replacement. Read the sequence and price the posterior before the clock does it for you.",
    skills: ["Bayes rule under time pressure", "Likelihood ratios", "Base-rate discipline", "Mental fraction arithmetic"],
    rules: "<p>Two urns are shown with known compositions. One is chosen at random (the prior is stated), then <b>n balls are drawn with replacement</b> from that urn.</p>" +
      "<p>Pick the correct <b>P(Urn A | draws)</b>. Keys <kbd>1</kbd>–<kbd>4</kbd>. The tempting wrong answers are the real ones: likelihood without the prior, the complement, and updating on the last draw only.</p>",
    variants: {
      standard: {
        label: "Standard", note: "50/50 prior, 2–3 draws", duration: 75, pts: 130, par: 9000, penalty: 0.3,
        draws: [2, 3], skewPrior: false,
        th: { p50: 180, p90: 860, p95: 1200, p99: 1700 }
      },
      hard: {
        label: "Hard", note: "Skewed prior, 3–5 draws", duration: 75, pts: 185, par: 11000, penalty: 0.35,
        draws: [3, 5], skewPrior: true,
        th: { p50: 240, p90: 1050, p95: 1373, p99: 2125 }
      }
    },

    play: async function (ctx) {
      while (ctx.running) {
        var it = makeItem(ctx.rng, ctx.cfg);
        var res = await w.ask(ctx, {
          eyebrow: "POSTERIOR",
          q: "P( Urn A | draws ) = ?",
          sub: "Prior P(A) = <b class='mono'>" + u.pct(it.priorA, 0) + "</b> &nbsp;·&nbsp; drawn <b>with replacement</b>",
          build: function (host) {
            var row = w.el("div", "row");
            row.style.marginBottom = "16px";
            row.innerHTML = urnHTML("A", it.A.r, it.A.b) + urnHTML("B", it.B.r, it.B.b);
            host.appendChild(row);
            var seq = w.el("div", "row");
            seq.style.marginBottom = "18px";
            var lbl = w.el("span", "mono", "DRAWS &nbsp;");
            lbl.style.cssText = "font-size:11px;letter-spacing:.14em;color:#4c5c70";
            seq.appendChild(lbl);
            it.seq.forEach(function (s, i) {
              var c = w.el("span", "", "");
              c.style.cssText = "width:26px;height:26px;border-radius:50%;display:inline-block;opacity:0;transform:scale(.5);" +
                "transition:.28s cubic-bezier(.2,.9,.3,1.4);background:" + (s === "R" ? "#ff4d5e" : "#3aa9ff") +
                ";box-shadow:0 0 14px " + (s === "R" ? "#ff4d5e66" : "#3aa9ff66");
              seq.appendChild(c);
              setTimeout(function () { c.style.opacity = 1; c.style.transform = "scale(1)"; }, 90 + i * 130);
            });
            host.appendChild(seq);
          },
          choices: it.opts.map(function (p) {
            return { label: u.pct(p, 1), correct: Math.abs(p - it.post) < 1e-12 };
          }),
          explain: function (i, ok) {
            var lr = "";
            var pa = it.A.r / (it.A.r + it.A.b), pb = it.B.r / (it.B.r + it.B.b);
            var nR = it.seq.filter(function (s) { return s === "R"; }).length, nB = it.seq.length - nR;
            lr = "LR = (" + u.round(pa, 2) + "^" + nR + "·" + u.round(1 - pa, 2) + "^" + nB + ") / (" +
              u.round(pb, 2) + "^" + nR + "·" + u.round(1 - pb, 2) + "^" + nB + ")";
            return (ok ? "✔ " : "✘ ") + u.pct(it.post, 1) + " &nbsp;·&nbsp; " + lr +
              (Math.abs(it.priorA - 0.5) > 1e-9 ? " &nbsp;× prior odds " + u.round(it.priorA / (1 - it.priorA), 2) : "");
          }
        });
        if (res.aborted) break;
      }
      ctx.notes = "Posterior odds = prior odds × likelihood ratio. Under a clock, work in <b>odds</b>, not probabilities — the update is one multiplication instead of a division you cannot do in your head.";
    }
  });

  // Browser no-op; exposes the pure posterior/question generator to verification.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { makeItem: makeItem, posterior: posterior };
  }
})();
