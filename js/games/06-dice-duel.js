/* 06 — Dice Duel : non-transitive dice, you always choose second */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  var COLORS = ["#00e08a", "#3aa9ff", "#ffb020", "#a97bff", "#22d3ee"];

  /** P(X beats Y) with ties re-rolled */
  function beats(X, Y) {
    var win = 0, lose = 0;
    for (var i = 0; i < X.length; i++) for (var j = 0; j < Y.length; j++) {
      if (X[i] > Y[j]) win++; else if (X[i] < Y[j]) lose++;
    }
    return win / (win + lose);
  }

  var SETS = {
    efron: [
      { name: "A", f: [4, 4, 4, 4, 0, 0] },
      { name: "B", f: [3, 3, 3, 3, 3, 3] },
      { name: "C", f: [6, 6, 2, 2, 2, 2] },
      { name: "D", f: [5, 5, 5, 1, 1, 1] }
    ],
    miwin: [
      { name: "A", f: [1, 2, 5, 6, 7, 9] },
      { name: "B", f: [1, 3, 4, 5, 8, 9] },
      { name: "C", f: [2, 3, 4, 6, 7, 8] }
    ],
    grime: [
      { name: "A", f: [2, 2, 2, 7, 7, 7] },
      { name: "B", f: [1, 1, 6, 6, 6, 6] },
      { name: "C", f: [0, 5, 5, 5, 5, 5] },
      { name: "D", f: [3, 3, 3, 3, 3, 8] },
      { name: "E", f: [4, 4, 4, 4, 4, 9] }
    ]
  };

  function randomSet(rng, k, spread) {
    var dice = [];
    for (var i = 0; i < k; i++) {
      var base = rng.int(0, 3);
      var hi = base + rng.int(3, spread);
      var nHi = rng.int(1, 5);
      var f = [];
      for (var j = 0; j < 6; j++) f.push(j < nHi ? hi : base);
      rng.shuffle(f);
      dice.push({ name: "ABCDE"[i], f: f });
    }
    return dice;
  }

  function dieHTML(d, color, dim) {
    return '<div style="opacity:' + (dim ? .5 : 1) + ';text-align:center">' +
      '<div class="mono" style="font-size:10px;letter-spacing:.16em;color:' + color + ';margin-bottom:6px">DIE ' + d.name + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,30px);gap:4px">' +
      d.f.map(function (v) {
        return '<span style="height:30px;line-height:30px;border-radius:7px;background:#121a25;border:1px solid ' + color +
          '55;font-family:var(--mono);font-weight:700;color:#dbe4ee">' + v + "</span>";
      }).join("") + "</div></div>";
  }

  function makeItem(rng, cfg) {
    var dice;
    if (cfg.useKnown && rng.bool(0.55)) {
      var s = rng.pick(cfg.knownSets);
      dice = SETS[s].map(function (d) { return { name: d.name, f: d.f.slice() }; });
      if (dice.length > cfg.k) dice = rng.shuffle(dice).slice(0, cfg.k);
    } else {
      dice = randomSet(rng, cfg.k, cfg.spread);
    }
    var oppIdx = rng.int(0, dice.length - 1);
    var opp = dice[oppIdx];
    var mine = dice.filter(function (_, i) { return i !== oppIdx; });
    var probs = mine.map(function (d) { return beats(d.f, opp.f); });
    var best = Math.max.apply(null, probs);
    var sorted = probs.slice().sort(function (a, b) { return b - a; });
    if (sorted.length > 1 && sorted[0] - sorted[1] < 0.035) return null;  // ambiguous, redraw
    if (best < 0.5) return null;                                          // no winning response, redraw
    return { dice: dice, opp: opp, oppIdx: oppIdx, mine: mine, probs: probs, best: best };
  }

  QA.registerGame({
    id: "dice-duel", n: 6, name: "Dice Duel", cat: "prob",
    blurb: "Your counterparty picks a die first. Pick the one that beats it. Nothing here is transitive, so ranking the dice by average will lose you money.",
    skills: ["Pairwise dominance vs. average", "Non-transitive structures", "Fast 6×6 outcome counting", "Second-mover advantage"],
    rules: "<p>Several dice with unusual faces. The counterparty commits to one first — you then choose from the rest. Higher roll wins; ties are re-rolled.</p>" +
      "<p>Pick the die with the <b>highest probability of beating theirs</b>, keys <kbd>1</kbd>–<kbd>4</kbd>. Count the 36 pairings, not the means: the die with the lower average often wins the duel.</p>",
    variants: {
      standard: {
        label: "Standard", note: "3 dice, Efron & Miwin families", duration: 75, pts: 130, par: 8000, penalty: 0.35,
        k: 3, spread: 7, useKnown: true, knownSets: ["efron", "miwin"],
        th: { p50: 200, p90: 850, p95: 1175, p99: 1700 }
      },
      hard: {
        label: "Hard", note: "4 dice, wider faces, tighter margins", duration: 75, pts: 175, par: 10500, penalty: 0.4,
        k: 4, spread: 9, useKnown: true, knownSets: ["efron", "grime"],
        th: { p50: 210, p90: 990, p95: 1218, p99: 1750 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng;
      while (ctx.running) {
        var it = null, guard = 0;
        while (!it && guard++ < 60) it = makeItem(rng, ctx.cfg);
        if (!it) { it = makeItem(rng, { k: 3, spread: 7, useKnown: true, knownSets: ["efron"] }) || null; }
        if (!it) break;

        var res = await w.ask(ctx, {
          eyebrow: "THEY CHOSE DIE " + it.opp.name + " — YOU CHOOSE SECOND",
          q: "Which die beats theirs?",
          sub: "Higher roll wins, ties are re-rolled.",
          build: function (host) {
            var r = w.el("div", "row"); r.style.marginBottom = "18px";
            it.dice.forEach(function (d, i) {
              r.innerHTML += dieHTML(d, i === it.oppIdx ? "#ff4d5e" : COLORS[i % COLORS.length], false);
            });
            host.appendChild(r);
          },
          choices: it.mine.map(function (d, i) {
            return { label: "DIE " + d.name, sub: "avg " + u.round(u.mean(d.f), 2), correct: Math.abs(it.probs[i] - it.best) < 1e-12 };
          }),
          feedbackMs: 1400,
          explain: function (i, ok) {
            return (ok ? "✔ " : "✘ ") + it.mine.map(function (d, j) {
              return d.name + " beats " + it.opp.name + " " + u.pct(it.probs[j], 1);
            }).join(" &nbsp;·&nbsp; ");
          }
        });
        if (res.aborted) break;
      }
      ctx.notes = "Non-transitivity is the whole point: A→B→C→A cycles exist because <b>P(X&gt;Y) is not a ranking</b>. On a real desk this is the same error as ranking strategies by mean return while ignoring the joint distribution against the specific thing you are trading against.";
    }
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { COLORS: COLORS, SETS: SETS, beats: beats, randomSet: randomSet, makeItem: makeItem };
  }
})();
