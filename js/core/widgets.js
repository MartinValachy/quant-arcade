/* ============================================================
   widgets.js — reusable interaction primitives.
   Every "ask" returns a Promise that resolves when the player
   answers OR when the clock kills the run (aborted:true).
   ============================================================ */
(function () {
  var QA = (window.QA = window.QA || {});
  var u = QA.u;
  var el = u.el;

  var KEYS = ["1", "2", "3", "4", "5", "6", "7", "8"];

  function mount(ctx) {
    u.clear(ctx.stage);
    var host = el("div", "playhost");
    ctx.stage.appendChild(host);
    return host;
  }

  function promptEl(spec) {
    var p = el("div", "prompt");
    if (spec.eyebrow) p.appendChild(el("div", "eyebrow", spec.eyebrow));
    if (spec.q) p.appendChild(el("div", "q", spec.q));
    if (spec.sub) p.appendChild(el("div", "sub", spec.sub));
    return p;
  }

  /** shared plumbing: hook keyboard + abort, guarantee single resolution */
  function guarded(ctx, fn) {
    return new Promise(function (resolve) {
      var done = false;
      var cleanups = [];
      function finish(res) {
        if (done) return; done = true;
        cleanups.forEach(function (c) { try { c(); } catch (e) {} });
        var i = ctx._aborts.indexOf(abort);
        if (i >= 0) ctx._aborts.splice(i, 1);
        resolve(res);
      }
      function abort() { finish({ aborted: true }); }
      ctx._aborts.push(abort);
      function onCleanup(c) { cleanups.push(c); }
      function onKey(handler) {
        var h = function (e) { handler(e); };
        document.addEventListener("keydown", h);
        cleanups.push(function () { document.removeEventListener("keydown", h); });
      }
      fn(finish, onKey, onCleanup);
    });
  }

  /* ---------------- multiple choice ---------------- */
  /* spec: {eyebrow,q,sub, build(host), choices:[{label,sub,correct}],
            pts, cols, explain(idx)->html, feedbackMs, noKeys} */
  function ask(ctx, spec) {
    var host = spec.host || mount(ctx);
    if (!spec.host) host.appendChild(promptEl(spec));
    if (spec.build) spec.build(host);

    var wrap = el("div", "choices" + (spec.cols === 2 ? " two" : spec.cols === 1 ? " wide" : ""));
    host.appendChild(wrap);
    var fb = el("div", "fb neut", "");
    host.appendChild(fb);

    var t0 = performance.now();
    var btns = [];

    return guarded(ctx, function (finish, onKey) {
      function choose(i) {
        if (btns[0].disabled) return;
        var ms = performance.now() - t0;
        var ok = !!spec.choices[i].correct;
        btns.forEach(function (b, j) {
          b.disabled = true;
          // always show where the right answer was; redden the miss
          if (spec.choices[j].correct) b.classList.add("right");
          else b.classList.add(j === i ? "wrong" : "miss");
        });
        var pts = ctx.resolve({ correct: ok, pts: spec.pts, ms: ms, el: btns[i] });
        fb.className = "fb " + (ok ? "good" : "bad");
        fb.innerHTML = (spec.explain ? spec.explain(i, ok) : (ok ? "correct" : "wrong"));
        setTimeout(function () { finish({ correct: ok, idx: i, ms: ms, pts: pts }); },
          spec.feedbackMs === undefined ? (ok ? 420 : 1000) : spec.feedbackMs);
      }

      spec.choices.forEach(function (c, i) {
        var b = el("button", "choice");
        if (!spec.noKeys && i < KEYS.length) b.appendChild(el("span", "key", KEYS[i]));
        b.appendChild(el("span", "", c.label));
        if (c.sub) b.appendChild(el("small", "", c.sub));
        b.onclick = function () { choose(i); };
        wrap.appendChild(b); btns.push(b);
      });

      if (!spec.noKeys) onKey(function (e) {
        var k = KEYS.indexOf(e.key);
        if (k >= 0 && k < btns.length) { e.preventDefault(); choose(k); }
      });
    });
  }

  /* ---------------- numeric entry ---------------- */
  /* spec: {eyebrow,q,sub,build, answer, tol, pts, unit, hint, explain(val,ok), integer} */
  function numeric(ctx, spec) {
    var host = spec.host || mount(ctx);
    if (!spec.host) host.appendChild(promptEl(spec));
    if (spec.build) spec.build(host);

    var pad = el("div", "numpad");
    var input = el("input", "numin");
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.placeholder = spec.placeholder || "?";
    pad.appendChild(input);
    var goBtn = el("button", "btn primary", "Submit");
    goBtn.type = "button";
    pad.appendChild(goBtn);
    pad.appendChild(el("div", "hint", spec.hint || "type your answer, press ENTER"));
    host.appendChild(pad);
    var fb = el("div", "fb neut", "");
    host.appendChild(fb);
    setTimeout(function () { input.focus(); }, 30);

    var t0 = performance.now();

    return guarded(ctx, function (finish, onKey) {
      function submit() {
        if (input.disabled) return;
        var raw = input.value.trim().replace(/,/g, "").replace(/%/g, "");
        if (raw === "" || raw === "-") return;
        var v = parseFloat(raw);
        if (!isFinite(v)) return;
        var ms = performance.now() - t0;
        var tol = spec.tol === undefined ? 1e-9 : spec.tol;
        var ok = Math.abs(v - spec.answer) <= tol + 1e-9;
        input.disabled = true;
        input.style.borderColor = ok ? "var(--grn)" : "var(--red)";
        input.style.color = ok ? "var(--grn)" : "var(--red)";
        var pts = ctx.resolve({ correct: ok, pts: spec.pts, ms: ms, el: input });
        fb.className = "fb " + (ok ? "good" : "bad");
        fb.innerHTML = spec.explain ? spec.explain(v, ok) : (ok ? "correct" : "answer: " + u.fmt(spec.answer, spec.dp === undefined ? 2 : spec.dp));
        setTimeout(function () { finish({ correct: ok, value: v, ms: ms, pts: pts }); },
          spec.feedbackMs === undefined ? (ok ? 320 : 950) : spec.feedbackMs);
      }
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); submit(); }
      });
      goBtn.onclick = submit;
      onKey(function (e) {
        if (document.activeElement !== input && /[0-9.\-]/.test(e.key)) input.focus();
      });
    });
  }

  /* ---------------- slider estimate ---------------- */
  /* spec: {eyebrow,q,sub,build, min,max,step, answer, pts,
            score(v)->0..1 accuracy, fmt(v)->string, explain(v,acc)} */
  function slider(ctx, spec) {
    var host = spec.host || mount(ctx);
    if (!spec.host) host.appendChild(promptEl(spec));
    if (spec.build) spec.build(host);

    var box = el("div", "center");
    var read = el("div", "bignum", "");
    var s = el("input", "slider");
    s.type = "range"; s.min = spec.min; s.max = spec.max; s.step = spec.step;
    s.value = spec.start === undefined ? (spec.min + spec.max) / 2 : spec.start;
    var fmt = spec.fmt || function (v) { return u.round(v, 2); };
    function paint() { read.innerHTML = fmt(parseFloat(s.value)); }
    s.addEventListener("input", paint); paint();
    box.appendChild(read); box.appendChild(s);
    var go = el("button", "btn primary", spec.cta || "Lock it in");
    box.appendChild(go);
    box.appendChild(el("div", "hint", "← → to nudge · ENTER to lock"));
    host.appendChild(box);
    var fb = el("div", "fb neut", "");
    host.appendChild(fb);
    setTimeout(function () { s.focus(); }, 30);

    var t0 = performance.now();

    return guarded(ctx, function (finish, onKey) {
      function submit() {
        if (s.disabled) return;
        var v = parseFloat(s.value);
        var acc = spec.score ? u.clamp(spec.score(v), 0, 1) : 0;
        s.disabled = true; go.disabled = true;
        var ms = performance.now() - t0;
        // `manual` games (auctions, PnL games) do their own scoring inside explain()
        var pts = spec.manual ? 0
          : ctx.resolve({ correct: acc >= (spec.passAt === undefined ? 0.5 : spec.passAt), partial: acc, pts: spec.pts, ms: ms, el: read });
        fb.className = "fb " + (acc >= 0.75 ? "good" : acc >= 0.4 ? "neut" : "bad");
        fb.innerHTML = spec.explain ? spec.explain(v, acc) : "";
        setTimeout(function () { finish({ value: v, acc: acc, ms: ms, pts: pts }); }, spec.feedbackMs || 1100);
      }
      go.onclick = submit;
      onKey(function (e) { if (e.key === "Enter") { e.preventDefault(); submit(); } });
    });
  }

  /* ---------------- free-form live game hook ----------------
     For games that own their own loop (market making, detection).
     They render into host and call finish() themselves.        */
  function live(ctx, fn) {
    var host = mount(ctx);
    return guarded(ctx, function (finish, onKey, onCleanup) {
      fn(host, finish, onKey, onCleanup);
    });
  }

  /* ---------------- canvas helpers ---------------- */
  function canvas(host, w, h, cls) {
    var c = el("canvas", cls || "");
    var dpr = window.devicePixelRatio || 1;
    c.width = w * dpr; c.height = h * dpr;
    // Backing store stays at authored resolution (dpr-scaled); CSS scales the element
    // down to fit a narrow phone screen while keeping the aspect ratio, so the chart
    // never gets clipped by .stage's overflow:hidden on a small viewport.
    c.style.width = "100%";
    c.style.maxWidth = w + "px";
    c.style.height = "auto";
    c.style.aspectRatio = w + " / " + h;
    var g = c.getContext("2d");
    g.scale(dpr, dpr);
    c._w = w; c._h = h;
    if (host) host.appendChild(c);
    return c;
  }

  function axes(g, w, h, pad) {
    g.strokeStyle = "#1c2735"; g.lineWidth = 1;
    g.beginPath();
    g.moveTo(pad, h - pad); g.lineTo(w - pad / 2, h - pad);
    g.moveTo(pad, h - pad); g.lineTo(pad, pad / 2);
    g.stroke();
  }

  /** draw one or more price series on a canvas */
  function drawSeries(c, seriesList, opts) {
    opts = opts || {};
    var g = c.getContext("2d"), w = c._w, h = c._h, pad = opts.pad === undefined ? 10 : opts.pad;
    g.clearRect(0, 0, w, h);
    var all = [];
    seriesList.forEach(function (s) { all = all.concat(s.data); });
    if (!all.length) return;
    var lo = opts.lo !== undefined ? opts.lo : Math.min.apply(null, all);
    var hi = opts.hi !== undefined ? opts.hi : Math.max.apply(null, all);
    if (hi - lo < 1e-9) { hi = lo + 1; }
    var n = opts.n || Math.max.apply(null, seriesList.map(function (s) { return s.data.length; }));
    var X = function (i) { return pad + (i / Math.max(1, n - 1)) * (w - 2 * pad); };
    var Y = function (v) { return h - pad - ((v - lo) / (hi - lo)) * (h - 2 * pad); };

    if (opts.grid) {
      g.strokeStyle = "rgba(28,39,53,.9)"; g.lineWidth = 1;
      for (var k = 0; k <= 4; k++) {
        var yy = pad + (k / 4) * (h - 2 * pad);
        g.beginPath(); g.moveTo(pad, yy); g.lineTo(w - pad, yy); g.stroke();
      }
    }
    seriesList.forEach(function (s) {
      if (s.data.length < 1) return;
      g.strokeStyle = s.color || "#00e08a";
      g.lineWidth = s.width || 2;
      g.globalAlpha = s.alpha === undefined ? 1 : s.alpha;
      if (s.dash) g.setLineDash(s.dash); else g.setLineDash([]);
      g.beginPath();
      s.data.forEach(function (v, i) { var x = X(i), y = Y(v); i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.stroke();
      if (s.fill) {
        g.lineTo(X(s.data.length - 1), h - pad); g.lineTo(X(0), h - pad); g.closePath();
        g.globalAlpha = 0.12; g.fillStyle = s.color || "#00e08a"; g.fill();
      }
      if (s.dot) {
        g.globalAlpha = 1; g.fillStyle = s.color || "#00e08a";
        g.beginPath(); g.arc(X(s.data.length - 1), Y(s.data[s.data.length - 1]), 3.2, 0, 7); g.fill();
      }
      g.globalAlpha = 1; g.setLineDash([]);
    });
    if (opts.marker !== undefined && opts.marker >= 0) {
      g.strokeStyle = opts.markerColor || "#ffb020"; g.setLineDash([4, 4]); g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(X(opts.marker), pad); g.lineTo(X(opts.marker), h - pad); g.stroke();
      g.setLineDash([]);
    }
    return { X: X, Y: Y, lo: lo, hi: hi };
  }

  function drawScatter(c, xs, ys, opts) {
    opts = opts || {};
    var g = c.getContext("2d"), w = c._w, h = c._h, pad = 18;
    g.clearRect(0, 0, w, h);
    axes(g, w, h, pad);
    var xlo = Math.min.apply(null, xs), xhi = Math.max.apply(null, xs);
    var ylo = Math.min.apply(null, ys), yhi = Math.max.apply(null, ys);
    var X = function (v) { return pad + ((v - xlo) / (xhi - xlo || 1)) * (w - 1.6 * pad); };
    var Y = function (v) { return h - pad - ((v - ylo) / (yhi - ylo || 1)) * (h - 1.6 * pad); };
    g.fillStyle = opts.color || "rgba(58,169,255,.75)";
    for (var i = 0; i < xs.length; i++) {
      g.beginPath(); g.arc(X(xs[i]), Y(ys[i]), opts.r || 2.6, 0, 7); g.fill();
    }
  }

  QA.w = {
    mount: mount, promptEl: promptEl, ask: ask, numeric: numeric,
    slider: slider, live: live, guarded: guarded,
    canvas: canvas, drawSeries: drawSeries, drawScatter: drawScatter, axes: axes, el: el
  };
})();
