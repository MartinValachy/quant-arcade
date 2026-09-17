/* 05 — Pattern Race : Penney's game and coin-pattern waiting times */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  /* Conway leading number L(X,Y): Σ 2^(k-1) over k where suffix_k(X) == prefix_k(Y) */
  function L(X, Y) {
    var s = 0;
    for (var k = 1; k <= Math.min(X.length, Y.length); k++) {
      if (X.slice(X.length - k) === Y.slice(0, k)) s += Math.pow(2, k - 1);
    }
    return s;
  }
  /** P(A appears before B) in a fair coin stream */
  function pFirst(A, B) {
    var oddsA = L(B, B) - L(B, A);
    var oddsB = L(A, A) - L(A, B);
    return oddsA / (oddsA + oddsB);
  }
  /** E[flips until pattern A] = 2 * L(A,A) for a fair coin */
  function wait(A) { return 2 * L(A, A); }

  function randPat(rng, n) {
    var s = "";
    for (var i = 0; i < n; i++) s += rng.bool() ? "H" : "T";
    return s;
  }
  function fallbackOpponent(A, n, minEdge) {
    var best = null, bestEdge = -1;
    for (var mask = 0; mask < Math.pow(2, n); mask++) {
      var B = "";
      for (var bit = n - 1; bit >= 0; bit--) B += (mask & Math.pow(2, bit)) ? "H" : "T";
      if (B === A) continue;
      var edge = Math.abs(pFirst(A, B) - 0.5);
      if (edge > bestEdge) { best = B; bestEdge = edge; }
      if (edge >= minEdge) return B;
    }
    return best;
  }
  function makePair(rng, n, minEdge) {
    var A = randPat(rng, n), B = randPat(rng, n), guard = 0;
    while ((B === A || Math.abs(pFirst(A, B) - 0.5) < minEdge) && guard++ < 120) B = randPat(rng, n);
    if (B === A || Math.abs(pFirst(A, B) - 0.5) < minEdge) B = fallbackOpponent(A, n, minEdge);
    return { A: A, B: B, pA: pFirst(A, B) };
  }
  function patHTML(p, color) {
    return p.split("").map(function (c) {
      return '<span style="display:inline-block;width:30px;height:30px;line-height:30px;border-radius:8px;margin:0 2px;' +
        'font-family:var(--mono);font-weight:700;background:' + (c === "H" ? "#1a2b22" : "#2b1a20") +
        ';color:' + (c === "H" ? "#00e08a" : "#ff4d5e") + ';border:1px solid ' + (color || "#28374a") + '">' + c + "</span>";
    }).join("");
  }

  /** simulate one race, return the flip string that ended it */
  function race(rng, A, B, cap) {
    var s = "";
    for (var i = 0; i < cap; i++) {
      s += rng.bool() ? "H" : "T";
      if (s.slice(-A.length) === A) return { s: s, win: "A" };
      if (s.slice(-B.length) === B) return { s: s, win: "B" };
    }
    return { s: s, win: null };
  }
  function stripHTML(s, A, B) {
    return s.split("").map(function (c, i) {
      var tailA = i >= A.length - 1 && s.slice(i - A.length + 1, i + 1) === A;
      var tailB = i >= B.length - 1 && s.slice(i - B.length + 1, i + 1) === B;
      var ring = tailA ? "#00e08a" : tailB ? "#ffb020" : "transparent";
      return '<span style="display:inline-block;width:20px;height:20px;line-height:20px;border-radius:5px;margin:1px;font-size:11px;' +
        'font-family:var(--mono);background:#121a25;color:' + (c === "H" ? "#00e08a" : "#ff4d5e") + ';' +
        'border:1px solid ' + ring + ';opacity:0;animation:tin .2s ease ' + (i * 0.035) + 's forwards">' + c + "</span>";
    }).join("");
  }

  QA.registerGame({
    id: "pattern-race", n: 5, name: "Pattern Race", cat: "prob",
    blurb: "Penney's game. Two coin patterns, one fair coin, and an answer that is almost never the one your gut offers. Intransitivity you can feel.",
    skills: ["Non-transitive reasoning", "Markov chains on strings", "Expected waiting times", "Resisting symmetry intuition"],
    rules: "<p>A fair coin is flipped forever. Two patterns are shown. Pick the one <b>more likely to appear first</b> — keys <kbd>1</kbd> / <kbd>2</kbd>.</p>" +
      "<p>Hard mode also asks for <b>expected flips until a pattern appears</b>, typed as an integer. Useful fact: for a fair coin that expectation is <b>2 × Conway's L(A,A)</b> — add 2^k for every k where the pattern's last k letters equal its first k.</p>",
    variants: {
      standard: {
        label: "Standard", note: "3-letter patterns, pick the favourite", duration: 75, pts: 115, par: 6000, penalty: 0.4,
        len: 3, waitRate: 0, minEdge: 0.08,
        th: { p50: 250, p90: 1150, p95: 1500, p99: 2175 }
      },
      hard: {
        label: "Hard", note: "4-letter patterns + waiting-time maths", duration: 75, pts: 160, par: 8500, penalty: 0.4,
        len: 4, waitRate: 0.4, minEdge: 0.05,
        th: { p50: 250, p90: 1250, p95: 1650, p99: 2250 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      while (ctx.running) {
        if (rng.bool(cfg.waitRate)) {
          var P = randPat(rng, rng.int(3, 4));
          var res0 = await w.numeric(ctx, {
            eyebrow: "EXPECTED WAITING TIME",
            q: "How many flips, on average, until this appears?",
            sub: "A fair coin is flipped until the pattern first shows up.",
            build: function (host) {
              var d = w.el("div", "center"); d.style.marginBottom = "14px";
              d.innerHTML = "<div>" + patHTML(P) + "</div>";
              host.appendChild(d);
            },
            answer: wait(P), tol: 0, dp: 0, hint: "integer · ENTER",
            explain: function (v, ok) {
              return (ok ? "✔ " : "✘ ") + wait(P) + " flips &nbsp;·&nbsp; L(" + P + "," + P + ") = " + L(P, P) + ", E = 2·L";
            }
          });
          if (res0.aborted) break;
          continue;
        }

        var pair = makePair(rng, cfg.len, cfg.minEdge), A = pair.A, B = pair.B, pA = pair.pA;
        var sim = race(rng, A, B, 26);

        var res = await w.ask(ctx, {
          eyebrow: "WHICH PATTERN LANDS FIRST?",
          q: "Fair coin, flipped forever.",
          sub: "Pick the pattern with the higher probability of appearing first.",
          cols: 2,
          choices: [
            { label: A, sub: "pattern 1", correct: pA > 0.5 },
            { label: B, sub: "pattern 2", correct: pA < 0.5 }
          ],
          build: function (host) {
            var r = w.el("div", "row"); r.style.marginBottom = "16px";
            r.innerHTML = '<div style="text-align:center"><div class="mono" style="font-size:10px;letter-spacing:.16em;color:#4c5c70;margin-bottom:7px">PATTERN 1</div>' + patHTML(A) + "</div>" +
              '<div class="mono" style="color:#4c5c70;font-size:18px">vs</div>' +
              '<div style="text-align:center"><div class="mono" style="font-size:10px;letter-spacing:.16em;color:#4c5c70;margin-bottom:7px">PATTERN 2</div>' + patHTML(B) + "</div>";
            host.appendChild(r);
          },
          feedbackMs: 1500,
          explain: function (i, ok) {
            return (ok ? "✔ " : "✘ ") + "P(" + A + " first) = <b>" + u.pct(pA, 1) + "</b>" +
              '<div style="margin-top:9px;line-height:1.9">' + stripHTML(sim.s, A, B) + "</div>" +
              '<div style="margin-top:4px;font-size:11px;color:#7d8ea3">sample race → ' + (sim.win ? (sim.win === "A" ? A : B) + " landed first" : "no hit in 26 flips") + "</div>";
          }
        });
        if (res.aborted) break;
      }
      ctx.notes = "Penney's game is <b>non-transitive</b>: for any pattern your opponent names, you can name one that beats it. The rule of thumb for 3-letter patterns — take their first two letters, prepend the opposite of their <em>second</em> letter.";
    }
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { L: L, pFirst: pFirst, wait: wait, randPat: randPat, fallbackOpponent: fallbackOpponent, makePair: makePair };
  }
})();
