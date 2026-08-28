/* 03 — Conditional Probability : the classic traps, generated fresh */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  function cond(space, condFn, evtFn) {
    var c = 0, j = 0;
    space.forEach(function (o) { if (condFn(o)) { c += o.p; if (evtFn(o)) j += o.p; } });
    return { p: j / c, cond: c, joint: j };
  }
  function dice(n) {
    var out = [[]];
    for (var k = 0; k < n; k++) {
      var nx = [];
      out.forEach(function (s) { for (var f = 1; f <= 6; f++) nx.push(s.concat([f])); });
      out = nx;
    }
    return out.map(function (s) { return { p: 1 / out.length, d: s }; });
  }
  function coinSpace(n) {
    var out = [[]];
    for (var k = 0; k < n; k++) {
      var nx = [];
      out.forEach(function (s) { nx.push(s.concat(["H"])); nx.push(s.concat(["T"])); });
      out = nx;
    }
    return out.map(function (s) { return { p: 1 / out.length, d: s }; });
  }

  var FAM = {
    /* ---- 1. base rate / diagnostic test ---- */
    test: function (rng) {
      var prev = rng.pick([0.001, 0.002, 0.005, 0.01, 0.02, 0.05]);
      var se = rng.pick([0.9, 0.95, 0.98, 0.99]);
      var sp = rng.pick([0.9, 0.92, 0.95, 0.98]);
      var p = prev * se / (prev * se + (1 - prev) * (1 - sp));
      return {
        q: "P( actually flagged | screen says flagged ) = ?",
        sub: "A compliance screen flags <b>" + u.pct(se, 0) + "</b> of true breaches (sensitivity) and wrongly flags <b>" +
          u.pct(1 - sp, 0) + "</b> of clean accounts. <b>" + u.pct(prev, 1) + "</b> of accounts are true breaches.",
        p: p,
        traps: [se, 1 - sp, prev, se * prev],
        why: "P = πse / (πse + (1−π)(1−sp)) = " + u.round(prev * se, 5) + " / " + u.round(prev * se + (1 - prev) * (1 - sp), 5)
      };
    },
    /* ---- 2. dice conditioning ---- */
    dice: function (rng) {
      var n = rng.bool(0.6) ? 2 : 3;
      var sp = dice(n);
      var k = rng.int(n + 2, n * 5);
      var r = cond(sp, function (o) { return u.sum(o.d) >= k; }, function (o) { return o.d.indexOf(6) >= 0; });
      if (!isFinite(r.p) || r.cond < 0.02) return FAM.dice(rng);
      return {
        q: "P( at least one six | sum ≥ " + k + " ) = ?",
        sub: "You roll <b>" + n + " fair dice</b> behind a screen and are told only that the total came to <b>" + k + " or more</b>.",
        p: r.p,
        traps: [1 - Math.pow(5 / 6, n), r.cond, 1 - r.p],
        why: "conditioning set has probability " + u.round(r.cond, 4) + "; joint = " + u.round(r.joint, 4)
      };
    },
    /* ---- 3. coins with an 'at least' condition ---- */
    coins: function (rng) {
      var n = rng.int(3, 5), m = rng.int(1, 2);
      var sp = coinSpace(n);
      var heads = function (o) { return o.d.filter(function (x) { return x === "H"; }).length; };
      var target = rng.int(Math.max(m + 1, 2), n);
      var r = cond(sp, function (o) { return heads(o) >= m; }, function (o) { return heads(o) >= target; });
      return {
        q: "P( ≥ " + target + " heads | ≥ " + m + " head" + (m > 1 ? "s" : "") + " ) = ?",
        sub: "<b>" + n + " fair coins</b> are tossed. You are told there " + (m > 1 ? "were at least " + m + " heads" : "was at least one head") + ".",
        p: r.p,
        traps: [r.joint, 1 - r.p, Math.pow(0.5, n)],
        why: "favourable " + u.round(r.joint, 4) + " ÷ conditioning " + u.round(r.cond, 4)
      };
    },
    /* ---- 4. family / at-least-one paradox ---- */
    family: function (rng) {
      var n = rng.int(2, 4);
      var p = 1 / (Math.pow(2, n) - 1);
      return {
        q: "P( all " + n + " are boys | at least one is a boy ) = ?",
        sub: "A trader has <b>" + n + " children</b>, each independently a boy or girl with probability ½. You learn only that <b>at least one is a boy</b>.",
        p: p,
        traps: [Math.pow(0.5, n), Math.pow(0.5, n - 1), 0.5],
        why: "1 / (2^" + n + " − 1) = 1/" + (Math.pow(2, n) - 1)
      };
    },
    /* ---- 5. cards without replacement ---- */
    cards: function (rng) {
      var mode = rng.int(0, 2);
      if (mode === 0) {
        return {
          q: "P( second card is a heart | first card was a heart ) = ?",
          sub: "Two cards are dealt off a shuffled 52-card deck without replacement.",
          p: 12 / 51, traps: [13 / 52, 12 / 52, 13 / 51],
          why: "12 hearts left in 51 cards"
        };
      }
      if (mode === 1) {
        var pBoth = u.nCk(4, 2) / u.nCk(52, 2);
        var pAtLeast = 1 - u.nCk(48, 2) / u.nCk(52, 2);
        return {
          q: "P( both are aces | at least one is an ace ) = ?",
          sub: "Two cards are dealt off a shuffled deck.",
          p: pBoth / pAtLeast, traps: [pBoth, 3 / 51, pAtLeast],
          why: "C(4,2)/C(52,2) ÷ [1 − C(48,2)/C(52,2)]"
        };
      }
      var k = rng.int(2, 4);
      var pAll = u.nCk(13, k) / u.nCk(52, k);
      var pFirst = 13 / 52;
      return {
        q: "P( all " + k + " are hearts | the first is a heart ) = ?",
        sub: "<b>" + k + " cards</b> are dealt off a shuffled deck without replacement.",
        p: pAll / pFirst, traps: [pAll, Math.pow(13 / 52, k - 1), 12 / 51],
        why: "C(13," + k + ")/C(52," + k + ") ÷ ¼"
      };
    },
    /* ---- 6. generalised Monty Hall ---- */
    monty: function (rng) {
      var n = rng.int(3, 8);
      var k = rng.int(1, n - 2);
      var pSwitch = ((n - 1) / n) / (n - 1 - k);
      return {
        q: "P( win if you switch ) = ?",
        sub: "<b>" + n + " doors</b>, one prize. You pick one. The host — who knows where the prize is — opens <b>" + k +
          "</b> other door" + (k > 1 ? "s" : "") + ", all empty, then offers you a switch to <b>any one</b> of the remaining unopened doors.",
        p: pSwitch,
        traps: [1 / n, 1 - 1 / n, 1 / (n - k), 0.5],
        why: "(1 − 1/n) spread over " + (n - 1 - k) + " remaining door" + (n - 1 - k > 1 ? "s" : "")
      };
    },
    /* ---- 7. reversal / retrodiction ---- */
    reversal: function (rng) {
      var r = rng.int(2, 6), b = rng.int(2, 6);
      var N = r + b;
      // P(first red | second red) — by symmetry equals P(second red | first red)
      var p = (r - 1) / (N - 1);
      return {
        q: "P( the <em>first</em> ball was red | the <em>second</em> ball was red ) = ?",
        sub: "An urn holds <b>" + r + " red</b> and <b>" + b + " blue</b> balls. Two are drawn without replacement. You are shown only the second.",
        p: p, traps: [r / N, (r - 1) / N, r / (N - 1)],
        why: "exchangeability: it equals P(2nd red | 1st red) = (r−1)/(N−1)"
      };
    }
  };

  function build(rng, cfg) {
    var it = FAM[rng.pick(cfg.fams)](rng);
    var opts = [it.p];
    (it.traps || []).forEach(function (t) {
      if (opts.length >= 4) return;
      if (t > 0.0002 && t < 0.9999 && opts.every(function (o) { return Math.abs(o - t) > 0.012; })) opts.push(t);
    });
    var guard = 0;
    while (opts.length < 4 && guard++ < 200) {
      var c = u.clamp(it.p * rng.uni(0.35, 2.4), 0.0005, 0.998);
      if (opts.every(function (o) { return Math.abs(o - c) > 0.014; })) opts.push(c);
    }
    rng.shuffle(opts);
    it.opts = opts;
    return it;
  }

  function show(p) { return p < 0.01 ? u.pct(p, 3) : p < 0.1 ? u.pct(p, 2) : u.pct(p, 1); }

  QA.registerGame({
    id: "cond-prob", n: 3, name: "Conditional Traps", cat: "prob",
    blurb: "Base rates, at-least-one conditions, generalised Monty Hall and retrodiction. Every distractor is a real mistake candidates make on the floor.",
    skills: ["Conditioning on the right event", "Base-rate neglect", "Sampling without replacement", "Exchangeability arguments"],
    rules: "<p>A short conditional-probability scenario, four answers, keys <kbd>1</kbd>–<kbd>4</kbd>.</p>" +
      "<p>The wrong options are not random: they are the unconditional probability, the complement, the joint instead of the conditional, and the sensitivity mistaken for the posterior. Read what is actually being conditioned on.</p>",
    variants: {
      standard: {
        label: "Standard", note: "Tests, dice, coins, families, cards", duration: 75, pts: 120, par: 8000, penalty: 0.3,
        fams: ["test", "dice", "coins", "family", "cards"],
        th: { p50: 200, p90: 910, p95: 1225, p99: 1900 }
      },
      hard: {
        label: "Hard", note: "Adds n-door Monty and retrodiction", duration: 75, pts: 165, par: 10000, penalty: 0.35,
        fams: ["test", "dice", "coins", "cards", "monty", "reversal", "monty"],
        th: { p50: 220, p90: 940, p95: 1300, p99: 1900 }
      }
    },

    play: async function (ctx) {
      while (ctx.running) {
        var it = build(ctx.rng, ctx.cfg);
        var res = await w.ask(ctx, {
          eyebrow: "CONDITION ON WHAT YOU WERE TOLD",
          q: it.q,
          sub: it.sub,
          choices: it.opts.map(function (p) { return { label: show(p), correct: Math.abs(p - it.p) < 1e-12 }; }),
          explain: function (i, ok) { return (ok ? "✔ " : "✘ ") + show(it.p) + " &nbsp;·&nbsp; " + it.why; }
        });
        if (res.aborted) break;
      }
      ctx.notes = "The single most valuable habit here: write the conditioning event as a <b>set</b>, count its probability, then count the intersection. Nearly every trap in this game is someone dividing by the wrong denominator.";
    }
  });
})();
