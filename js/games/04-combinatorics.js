/* 04 — Combinatorics Counter : exact counts, typed under a clock */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  var WORDS = ["BANANA", "LEVEL", "SUCCESS", "TRADER", "OPTION", "GAMMA", "VOLATILE", "ARBITRAGE", "SETTLE", "MISSISSIPPI"];

  var FAM = {
    paths: function (rng) {
      var m = rng.int(3, 7), n = rng.int(3, 7);
      return {
        q: "How many shortest routes?",
        sub: "A courier walks from the bottom-left to the top-right of a <b>" + m + " × " + n + "</b> grid of city blocks, only ever moving right or up.",
        a: u.nCk(m + n, m),
        why: "C(" + (m + n) + "," + m + ")"
      };
    },
    pathsBlocked: function (rng) {
      var m = rng.int(4, 7), n = rng.int(4, 7);
      var bx = rng.int(1, m - 1), by = rng.int(1, n - 1);
      var total = u.nCk(m + n, m);
      var through = u.nCk(bx + by, bx) * u.nCk(m - bx + n - by, m - bx);
      return {
        q: "How many shortest routes avoid the closed junction?",
        sub: "Bottom-left to top-right of a <b>" + m + " × " + n + "</b> grid, right/up moves only. The junction <b>(" + bx + ", " + by + ")</b> is closed.",
        a: total - through,
        why: "C(" + (m + n) + "," + m + ") − C(" + (bx + by) + "," + bx + ")·C(" + (m - bx + n - by) + "," + (m - bx) + ") = " + total + " − " + through
      };
    },
    anagram: function (rng) {
      var word = rng.pick(WORDS);
      var counts = {};
      word.split("").forEach(function (c) { counts[c] = (counts[c] || 0) + 1; });
      var d = 1, parts = [];
      Object.keys(counts).forEach(function (k) { d *= u.fact(counts[k]); if (counts[k] > 1) parts.push(counts[k] + "!"); });
      return {
        q: "How many distinct arrangements?",
        sub: "Rearrange every letter of <b class='mono'>" + word + "</b>.",
        a: Math.round(u.fact(word.length) / d),
        why: word.length + "! / (" + (parts.join("·") || "1") + ")"
      };
    },
    committee: function (rng) {
      var a = rng.int(4, 8), b = rng.int(4, 8), k = rng.int(3, 5);
      var need = rng.int(1, 2);
      var tot = 0;
      for (var i = need; i <= Math.min(a, k); i++) tot += u.nCk(a, i) * u.nCk(b, k - i);
      return {
        q: "How many possible desks?",
        sub: "A desk of <b>" + k + "</b> is drawn from <b>" + a + " traders</b> and <b>" + b + " quants</b>, and must contain <b>at least " + need + " trader" + (need > 1 ? "s" : "") + "</b>.",
        a: tot,
        why: "Σ C(" + a + ",i)·C(" + b + "," + k + "−i) for i = " + need + "…" + Math.min(a, k)
      };
    },
    starsBars: function (rng) {
      var n = rng.int(6, 14), k = rng.int(3, 5), min = rng.bool(0.45) ? 1 : 0;
      var nn = n - min * k;
      return {
        q: "In how many ways?",
        sub: "<b>" + n + " identical lots</b> are allocated across <b>" + k + " books</b>" + (min ? ", each book taking <b>at least one</b>" : " (a book may get none)") + ".",
        a: u.nCk(nn + k - 1, k - 1),
        why: "stars and bars: C(" + (nn + k - 1) + "," + (k - 1) + ")"
      };
    },
    circular: function (rng) {
      var n = rng.int(5, 8), pair = rng.bool(0.5);
      return pair ? {
        q: "How many seatings?",
        sub: "<b>" + n + " people</b> sit at a round table (rotations count as the same seating) and <b>two named people must sit together</b>.",
        a: u.fact(n - 2) * 2,
        why: "glue the pair: (" + (n - 1) + "−1)! × 2 = " + u.fact(n - 2) + "×2"
      } : {
        q: "How many seatings?",
        sub: "<b>" + n + " people</b> sit at a round table. Rotations count as the same seating.",
        a: u.fact(n - 1),
        why: "(" + n + "−1)!"
      };
    },
    noAdjacent: function (rng) {
      var n = rng.int(6, 12);
      var f = [1, 2];
      for (var i = 2; i <= n; i++) f.push(f[i - 1] + f[i - 2]);
      return {
        q: "How many valid schedules?",
        sub: "A <b>" + n + "-day</b> schedule marks each day 'trade' or 'flat'. You may <b>never trade two days in a row</b>.",
        a: f[n],
        why: "Fibonacci: F(" + (n + 2) + ") = " + f[n]
      };
    },
    derange: function (rng) {
      var n = rng.int(4, 7);
      var d = [1, 0];
      for (var i = 2; i <= n; i++) d.push((i - 1) * (d[i - 1] + d[i - 2]));
      return {
        q: "How many ways does nobody get their own?",
        sub: "<b>" + n + " analysts</b> each hand in a report; the reports are shuffled and returned at random. Count the permutations in which <b>no one</b> receives their own report.",
        a: d[n],
        why: "derangements D(" + n + ") = " + d[n] + " out of " + u.fact(n)
      };
    },
    pairing: function (rng) {
      var n = rng.pick([4, 6, 8, 10]);
      var a = 1;
      for (var i = n - 1; i >= 1; i -= 2) a *= i;
      return {
        q: "How many pairings?",
        sub: "<b>" + n + " desks</b> are split into <b>" + (n / 2) + " unordered pairs</b> for a shadowing rotation.",
        a: a,
        why: "(" + (n - 1) + ")!! = " + a
      };
    },
    hands: function (rng) {
      var r = rng.int(5, 9), b = rng.int(5, 9), g = rng.int(3, 6);
      var kr = rng.int(1, 2), kb = rng.int(1, 2), kg = rng.int(1, 2);
      return {
        q: "How many selections?",
        sub: "From <b>" + r + " red</b>, <b>" + b + " blue</b> and <b>" + g + " green</b> tokens, take exactly <b>" + kr + " red, " + kb + " blue and " + kg + " green</b>.",
        a: u.nCk(r, kr) * u.nCk(b, kb) * u.nCk(g, kg),
        why: "C(" + r + "," + kr + ")·C(" + b + "," + kb + ")·C(" + g + "," + kg + ")"
      };
    }
  };

  QA.registerGame({
    id: "combinatorics", n: 4, name: "Combinatorics Counter", cat: "prob",
    blurb: "Lattice paths, anagrams, stars and bars, derangements. Type the exact integer — no partial credit, no rounding to hide behind.",
    skills: ["Choosing the right counting frame", "Inclusion–exclusion", "Stars and bars", "Fast factorial arithmetic"],
    rules: "<p>Each item asks for an <b>exact count</b>. Type the integer and press <kbd>Enter</kbd>.</p>" +
      "<p>No multiple choice — this is the one game where a near-miss is simply wrong, which is exactly how these get marked in an interview.</p>",
    variants: {
      standard: {
        label: "Standard", note: "Paths, anagrams, committees, stars & bars", duration: 75, pts: 150, par: 11000, penalty: 0.25,
        fams: ["paths", "anagram", "committee", "starsBars", "circular", "hands", "pairing"],
        th: { p50: 220, p90: 880, p95: 1225, p99: 1725 }
      },
      hard: {
        label: "Hard", note: "Adds blocked paths, derangements, Fibonacci counts", duration: 75, pts: 210, par: 14000, penalty: 0.3,
        fams: ["pathsBlocked", "derange", "noAdjacent", "committee", "starsBars", "anagram", "pairing"],
        th: { p50: 230, p90: 850, p95: 1225, p99: 1825 }
      }
    },

    play: async function (ctx) {
      while (ctx.running) {
        var it = FAM[ctx.rng.pick(ctx.cfg.fams)](ctx.rng);
        var res = await w.numeric(ctx, {
          eyebrow: "EXACT COUNT",
          q: it.q, sub: it.sub,
          answer: it.a, tol: 0, dp: 0,
          hint: "integer answer · ENTER to submit",
          explain: function (v, ok) { return (ok ? "✔ " : "✘ ") + u.fmt(it.a) + " &nbsp;·&nbsp; " + it.why; }
        });
        if (res.aborted) break;
      }
      ctx.notes = "When you freeze, name the frame first: <b>ordered or unordered</b>, <b>with or without repetition</b>. Almost all of these are one of four objects — C(n,k), n!/∏k!, stars-and-bars, or an inclusion–exclusion correction to one of them.";
    }
  });
})();
