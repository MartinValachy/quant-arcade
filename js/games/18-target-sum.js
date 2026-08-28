/* 18 — Target Sum : working memory plus arithmetic, under a clock */
(function () {
  var QA = window.QA, u = QA.u, w = QA.w;

  function makeGrid(rng, cfg) {
    var cells = [];
    var n = cfg.size * cfg.size;
    for (var i = 0; i < n; i++) {
      var v = rng.int(cfg.lo, cfg.hi);
      if (cfg.negatives && rng.bool(0.3)) v = -v;
      cells.push(v);
    }
    var idx = rng.shuffle(cells.map(function (_, i) { return i; })).slice(0, cfg.k);
    var target = u.sum(idx.map(function (i) { return cells[i]; }));
    return { cells: cells, target: target, sol: idx };
  }

  QA.registerGame({
    id: "target-sum", n: 18, name: "Target Sum", cat: "math",
    blurb: "A grid of numbers and a target. Find a subset that hits it exactly — then do it again, faster, while the clock eats your working memory.",
    skills: ["Subset arithmetic", "Working memory under load", "Search strategy", "Recovering from a dead end"],
    rules: "<p>Click cells to add them to your running total. Hit the <b>target exactly</b> and the grid resets with a new one.</p>" +
      "<p>Click a selected cell again to drop it. Hard mode requires <b>exactly the stated number of cells</b> and mixes in negatives, so overshooting is recoverable in a way it is not in Standard.</p>" +
      "<p><kbd>Space</kbd> clears your selection. Every solved grid scores; speed is the multiplier.</p>",
    variants: {
      standard: {
        label: "Standard", note: "4×4, positive, any subset size", duration: 80, pts: 200, par: 11000, penalty: 0,
        size: 4, lo: 3, hi: 29, k: 3, negatives: false, exact: false,
        th: { p50: 920, p90: 1775, p95: 2175, p99: 3025 }
      },
      hard: {
        label: "Hard", note: "5×5, negatives, exact cell count", duration: 80, pts: 300, par: 15000, penalty: 0,
        size: 5, lo: 4, hi: 48, k: 4, negatives: true, exact: true,
        th: { p50: 1075, p90: 1825, p95: 2350, p99: 2975 }
      }
    },

    play: async function (ctx) {
      var rng = ctx.rng, cfg = ctx.cfg;
      var solved = 0, resets = 0;

      while (ctx.running) {
        var g = makeGrid(rng, cfg);
        var t0 = performance.now();

        var out = await w.live(ctx, function (host, finish, onKey) {
          host.appendChild(w.promptEl({
            eyebrow: "TARGET" + (cfg.exact ? " · EXACTLY " + cfg.k + " CELLS" : ""),
            q: '<span class="mono" style="color:#00e08a">' + g.target + "</span>",
            sub: cfg.exact ? "Select exactly " + cfg.k + " cells that sum to the target." : "Select any cells that sum to the target."
          }));

          var sel = {};
          var grid = w.el("div", "");
          grid.style.cssText = "display:grid;grid-template-columns:repeat(" + cfg.size + ",minmax(56px,72px));gap:8px;justify-content:center;margin:0 auto";
          var btns = [];
          g.cells.forEach(function (v, i) {
            var b = w.el("button", "mono", String(v));
            b.style.cssText = "aspect-ratio:1;border-radius:10px;border:1px solid #28374a;background:#121a25;color:#dbe4ee;" +
              "font-size:19px;font-weight:700;cursor:pointer;transition:.12s";
            b.onclick = function () { toggle(i); };
            grid.appendChild(b); btns.push(b);
          });
          host.appendChild(grid);

          var readout = w.el("div", "center");
          readout.style.marginTop = "18px";
          var sum = w.el("div", "mono");
          sum.style.cssText = "font-size:30px;font-weight:700";
          readout.appendChild(sum);
          readout.appendChild(w.el("div", "hint", "click to select · SPACE to clear"));
          host.appendChild(readout);

          function total() {
            return Object.keys(sel).reduce(function (a, k) { return a + g.cells[k]; }, 0);
          }
          function count() { return Object.keys(sel).length; }
          function paint() {
            var t = total(), c = count();
            sum.textContent = t + (cfg.exact ? "  (" + c + "/" + cfg.k + ")" : "");
            sum.style.color = t === g.target ? "#00e08a" : (t > g.target && !cfg.negatives) ? "#ff4d5e" : "#dbe4ee";
            btns.forEach(function (b, i) {
              var on = !!sel[i];
              b.style.background = on ? "#0f2a22" : "#121a25";
              b.style.borderColor = on ? "#00e08a" : "#28374a";
              b.style.color = on ? "#00e08a" : "#dbe4ee";
              b.style.transform = on ? "scale(.94)" : "none";
            });
          }
          function check() {
            var ok = total() === g.target && (!cfg.exact || count() === cfg.k);
            if (!ok) return;
            btns.forEach(function (b) { b.disabled = true; });
            sum.style.color = "#00e08a";
            solved++;
            ctx.resolve({ correct: true, pts: cfg.pts, ms: performance.now() - t0, el: sum });
            setTimeout(function () { finish({ ok: true }); }, 320);
          }
          function toggle(i) {
            if (sel[i]) delete sel[i];
            else {
              if (cfg.exact && count() >= cfg.k) { ctx.toast("that would be " + (cfg.k + 1) + " cells", "bad"); return; }
              sel[i] = 1;
            }
            paint(); check();
          }
          onKey(function (e) {
            if (e.key === " ") { e.preventDefault(); sel = {}; resets++; paint(); }
          });
          paint();
        });
        if (out.aborted) break;
      }

      ctx.extra = [{ label: "GRIDS SOLVED", value: solved }, { label: "CLEARS", value: resets }];
      ctx.notes = "Work from the <b>largest cell below the target</b> downwards and track the remainder, rather than adding upward from small numbers. In hard mode the negatives are the escape hatch — an overshoot is a solvable position, not a dead end.";
    }
  });
})();
