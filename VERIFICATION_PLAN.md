# Quant Arcade — Game Logic Verification & Refactor Plan

> This is the approved plan for the completed logic-verification pass on all 24 games in this repo.
> It is exported here (rather than kept only in Claude's local plan-mode file) so that
> another tool or person — including a different AI — can pick up individual games and
> help, without needing the conversation that produced it. The execution record is in
> `STATUS.md`, the task cards, and the independent evidence under `verification/`.

## Context

Kirill (QFC board) wants `quant-arcade` folded into the QFC GitHub/website for a
sponsor-facing hackathon page (Jane Street, HRT, Citadel, Flow Traders will see it), and
has named the exact risk to close first: **mechanics and random-number distribution
correctness**. This is codified in
`QuantArcade_Logic_Verification_Guidelines_Sep2026.md` (the original brief, not included
in this repo), which asks for independent Python ground-truth re-derivation of each
game's core generator+scorer logic (separated from rendering), ≥10,000-draw Monte Carlo
for anything probabilistic, a per-game ✅/🔧/⏳ status table, and actual fixes landed in
`js/games/NN-*.js`.

Non-goals from that doc: no CSS/UI work, no new games, no edits to `app.js`/`index.html`,
and no silent edits to `CALIBRATION.md`'s percentile thresholds — if a fix changes a
game's achievable score range, **flag it, don't re-derive it**.

Two things added on top of the doc by the repo owner:
- **Multistage, not one shot.** Work happens in discrete, checkpointed stages matching
  the doc's own Tier 1→2→3 priority order, pausing for explicit go-ahead between stages.
- **Export this plan into the repo itself**, broken down per game, so another tool (e.g.
  ChatGPT) can pick up individual games without needing the original conversation's
  context. (Per-game task cards under `verification/tasks/` are part of Stage 0 below —
  not yet created as of this file's writing.)

During the staged review, changes were kept local until every stage and the final
browser/diff checks were complete. The repo owner then explicitly authorized the final
commit and push titled `game validity and accuracy check`.

## What the exploration found

Three parallel agents read all 24 games plus the shared core (`js/core/rng.js`,
`util.js`, `engine.js`, `percentile.js`, `widgets.js`) line-by-line. A fourth agent
independently re-derived the relevant math and validated every finding below against
the actual code before this plan was finalized.

### Confirmed bugs — real, reachable, will be fixed

1. **`js/games/11-delta-hedge.js` `netBeta`** — `net = (w1*b1 + (shrt?-1:1)*w2*b2) / (w1 + (shrt?-1:1)*w2)`.
   `w1,w2` are independent `rng.int(1,9)*100000` draws; when `shrt` is true and
   `w1===w2` (~1/18 of `netBeta` rounds), the denominator is exactly 0 → `net`/`tol`
   become `NaN`/`Infinity`, and since `Math.abs(v-spec.answer)<=tol+1e-9` is `false` for
   any `NaN` comparison, the round is **unconditionally** marked wrong, not merely
   unpredictable.
2. **`js/games/21-param-estimate.js`** — the `tank` and `unif` families' `se` values
   don't match the true closed-form sampling variance of their own correct MVUE point
   estimators (`unif`'s true `Var(θ̂)=θ²/(n(n+2))` vs. the shipped `se: th/n`; `tank`'s
   shipped `se` is an ad hoc expression with no evident derivation). `se` directly sets
   the scoring tolerance band, so this is a real calibration bug in the game's own
   claimed rigor. `sd` family's `se=sd/√(2n)` is a large-sample approximation used at
   small n∈[6,14] — quantify via Monte Carlo, likely acceptable to keep with a
   documented note rather than rewrite.
3. **`js/games/09-order-book.js` `imbalance`** — no tie-break (`correct: sb>sa` /
   `correct: sa>sb`); an exact `sb===sa` (reachable — integer sizes summed over up to 3
   levels) makes both choices wrong, an unscorable round. Every other degenerate case in
   this file (`sweepQ`, `depth`) already `return null`s and gets retried by the caller's
   guard loop — this one doesn't.
4. **`js/games/23-drift-hunt.js`** — the displayed "theoretical z" formula omits
   `/cfg.sigma` (`mu*Math.sqrt(n)`); currently invisible only because both shipped
   variants hard-code `sigma:1`. Display text only, doesn't affect scoring, still a real
   formula bug worth fixing for correctness and any future variant.
5. **`js/games/09-order-book.js`** (secondary) — the random distractor-filler padding
   loop never checks new fillers against existing options, so two answer buttons could
   show identical rounded text (scoring itself stays correct via a tight float epsilon;
   this is a display collision, not a scoring bug).

### Design-decision findings — reasoned fix chosen, flagged rather than silently applied

6. **`js/games/10-toxic-flow.js`** — the only Tier-1 PnL game that scores through
   `w.ask()`'s automatic `ctx.resolve()` (`base×speed×streak`, using engine defaults
   since this game sets neither `cfg.pts` nor `cfg.par`) **and** a separate manual
   `ctx.addScore(real*scale)` on top — every accepted trade is scored twice, through two
   different formulas. Every sibling PnL game (07/08/12/24) avoids this deliberately via
   `w.live`/`w.slider({manual:true})`.
   **Fix:** add a `manual:true` escape hatch to `w.ask()` in `js/core/widgets.js`
   (mirroring the one `w.slider()` already has), use it here, collapse to the single
   PnL-driven score. Keep realized-outcome-based `correct`/`mark()` (matches the sibling
   games' pattern; a real desk is judged on realized PnL too).
   **⚠ Calibration exposure — confirmed by design review:** `CALIBRATION.md` §5b
   explicitly Monte-Carlo'd this game's *actual shipped scoring pipeline* to set its
   `th:` anchors, under a policy comparison where `ctx.resolve()`'s contribution and the
   manual PnL contribution are comparable in magnitude. Collapsing to one score very
   likely lowers the real achievable score range. **We fix the bug but do not touch
   `CALIBRATION.md`.** This gets a prominent flag in `STATUS.md` as a standalone
   follow-up requiring the repo owner's decision (re-derive anchors, or accept
   score-range drift) — completely separate from and after this verification pass.
7. **`js/games/08-inventory-skew.js`** — rules text says a breach gets you
   "force-liquidated"; code only halves the position. **Fix:** change code to fully
   flatten to 0 on breach (clearer, more standard loss limit than softening the prose).
   **⚠ Same calibration exposure as #6** — `CALIBRATION.md` §5b names this game's
   liquidation mechanic specifically as something already tuned during calibration (the
   capital-charge fix from the original build). Flag in `STATUS.md`, do not touch
   `CALIBRATION.md`.
8. **`js/games/22-correlation.js`** — hard-mode rules text claims outliers are
   "planted"; code can draw 0 (`rng.int(0,cfg.outliers)`). **Fix:**
   `rng.int(1,cfg.outliers)` in hard mode. Low calibration risk (Tier 2, scored via the
   abstract accuracy-rate model, not a PnL Monte-Carlo) — one-line note in `STATUS.md`,
   no hard flag needed.

### Defensive hardening — cheap, currently unreachable given shipped configs, still fixed

9. `js/core/rng.js` `int(a,b)` — add a guard/assert for `a>b` (shared core, touches
   every game; fixed once in Stage 0).
10. `js/core/percentile.js` `invNorm(p)` — add an internal guard for `p≤0`/`p≥1`
    (shared core; fixed once in Stage 0).
11. `js/games/01-bayes-urn.js` — cap the distractor-filler loop's iterations (matches
    the pattern already used correctly elsewhere in the same file).
12. `js/games/05-pattern-race.js` — add a fallback after the retry-loop guard exhausts
    (mirroring `js/games/06-dice-duel.js`'s existing
    `if (!it) it = makeItem(rng, {...}) || null;` pattern), since without one a `B===A`
    survival produces `pFirst=0/0=NaN` and both choices wrong.
13. Several Tier-3 items are provably unreachable given the exact rng ranges in shipped
    configs (`js/games/04-combinatorics.js` `committee`,
    `js/games/17-compounding.js` `perpetuity`) — these are **documented in `STATUS.md`,
    no code change**, since adding guards for genuinely unreachable states adds
    complexity without a live bug to justify it.

### Confirmed correct — no code change, straight ✅ in the status table

`02-ev-sprint`, `03-cond-prob`, `04-combinatorics`, `06-dice-duel`, `13-arithmetic`,
`14-percent-sprint`, `15-fermi`, `16-sequences`, `17-compounding`, `18-target-sum`,
`01-bayes-urn`'s core Bayes'-rule posterior math, `19-biased-coin`, `20-regime-shift`
(including its tick/tau off-by-one convention — explicitly traced and internally
consistent), and every shared-core primitive in `rng.js`/`util.js` (uni/int/bool/pick/
norm/binom/pois, nCk, fact, sd, corr, ncdf — Box-Muller, Knuth's Poisson algorithm, and
the Zelen-Severo normal-CDF approximation are all textbook-correct constructions).

## Architecture — how the verification is meant to run

**Node harness, not a transcribed copy.** Each of the 24 game files is a browser IIFE
whose generator objects (`FAM`/`GEN`/`Q`/`BANK`/`makeItem`/etc.) are never exposed
outside the closure. Rather than hand-copy that logic into a separate test script (a
real transcription-drift risk — the harness could silently diverge from the shipped
file over time), each game file is meant to get one small, additive, browser-no-op line
appended when its stage reviews it:
```js
if (typeof module !== "undefined" && module.exports) module.exports = { FAM: FAM, ... };
```
This is a standard UMD-style guard — `module` is `undefined` in a classic `<script>`
load (confirmed by reading `index.html`'s script tags, all plain, no `type="module"`),
so it's a true no-op for every player. It should be added *only* to the file the
current stage is touching, landing alongside that file's real fix in the same
reviewable diff — not all 24 upfront.

The Node harness itself (never the shipped files) should do:
```js
global.window = global;   // rng.js/util.js/widgets.js/engine.js/percentile.js all do
                           // `window.QA = window.QA || {}` at load time; nothing in
                           // their load-time code touches document/performance, so no
                           // DOM mock or jsdom is needed — confirmed by tracing every
                           // core file.
require('../../js/core/rng.js');
require('../../js/core/util.js');
// ...then the specific game file, then call its exported generator with QA.makeRng(seed)
```

**Python is the independent ground truth**, per the doc's explicit instruction to start
with (B) before ever considering a JS-native refactor (A). Libraries by check type:
- Exact combinatorics/probability (dice-duel pairwise dominance, cond-prob's
  Monty-Hall family, combinatorics' counts): `math.comb`, `fractions.Fraction` for
  exact rationals — dice-duel's 36-pairing dominance especially benefits from exact
  fractions rather than floats, closing off any silent off-by-tie error.
- MVUE/standard-error re-derivation (param-estimate): `scipy.stats` closed-form
  variances (`norm`, `uniform`, `poisson`, `binom`) plus `numpy` for the ≥10k-draw
  empirical check.
- `invNorm`/`ncdf` cross-check (percentile.js, Stage 0): `scipy.stats.norm.ppf`/`.cdf`
  against the Acklam/Zelen-Severo JS implementations, to machine precision.
- Everything else probabilistic (doc's rule 4, ≥10,000 draws):
  `numpy.random.default_rng()` — Monte Carlo checks the *specification* (does the
  distribution/formula hold), not a bit-for-bit replica of mulberry32, so an
  independent NumPy generator is correct and simpler.

**Intended file layout** (none of this exists yet except this file):
```
quant-arcade/
  VERIFICATION_PLAN.md       — this file
  verification/
    tasks/
      01-bayes-urn.md         one self-contained task card per game — current findings,
      02-ev-sprint.md         the Python check(s) to run, the exact fix (or "none —
      ...                     confirmed ✅"), calibration-exposure flag if any
      24-kelly.md
    README.md                — methodology, how to run, links back to the guidelines doc
    requirements.txt          — numpy, scipy
    node/
      shim.js                — the window-stub + ordered core requires
      run_generator.js       — generic CLI: node run_generator.js <game-file> <fn> <seed> <n>
    python/
      common/
        mc.py                 — shared Monte Carlo harness (≥10k draws, mean/var/CI report)
        normal_checks.py      — scipy cross-checks for percentile.js
      tier1_pnl/               07, 08, 10, 11, 12, 24
      tier2_stats/              01, 19, 20, 21, 22
      tier3_deterministic/      02,03,04,05,06,09,13,14,15,16,17,18,23
  STATUS.md                   — root level, sibling to README.md/CALIBRATION.md — the
                                 final consolidated ✅/🔧/⏳ table, the actual meeting artifact
```
`verification/` is meant to **not** be gitignored wholesale once it exists — the Python
scripts and Node harness are the literal evidence behind every ✅/🔧, i.e. the real
technical contribution the doc's Deliverable section describes. Only true byproducts
should be ignored (`__pycache__/`, a venv if created, large raw dump files if any
script writes one instead of just printing a summary). This only governs what *would*
be committable later — nothing gets committed during this effort regardless, per the
standing rule above.

## Stages

**Stage 0 — scaffolding + shared-core hardening** (own short checkpoint; small,
low-risk, but touches files every later stage depends on)
1. Write the `verification/tasks/NN-gamename.md` task cards (all 24, including the
   confirmed-✅ ones — each a standalone card: what it claims to test, current
   findings, the check to run, expected outcome).
2. Create `verification/README.md`, `requirements.txt`, `node/shim.js`,
   `node/run_generator.js`, `python/common/mc.py`, `python/common/normal_checks.py`.
3. Fix `js/core/rng.js` `int(a,b)` (guard `a>b`) and `js/core/percentile.js`
   `invNorm(p)` (guard `p≤0`/`p≥1`) — additive, behavior-preserving for every current
   call site.
4. Cross-check `invNorm`/`ncdf` against `scipy.stats.norm.ppf`/`.cdf`.
5. Report back: files created, the two core fixes, confirmation nothing else changed.
   **Stop. Wait for explicit go-ahead before Stage 1.**

**Stage 1 — Tier 1, PnL games: 07, 08, 10, 11, 12, 24** (highest priority — cumulative
score, most exposed if wrong)
- Per game: append its export shim, run the Node harness (≥10,000 draws where
  probabilistic), independently re-derive the correct formula/value in Python, diff.
- Land fixes #1 (netBeta), #6 (toxic-flow double-scoring, flagged), #7
  (inventory-skew flatten, flagged).
- Specific checks beyond the bug list: re-verify 07's `pickoff()` tail-expectation
  against a Python re-derivation of the same 8-instrument bank; Monte Carlo how often
  Winner's Curse's slider bounds `[mySig-3.2sd, mySig+0.6sd]` could exclude the true
  optimal bid; Monte Carlo Kelly's mid-block floor-at-1-vs-ruin-at-25 interaction to
  quantify (not necessarily fix) that edge case.
- Update the 6 relevant `verification/tasks/*.md` cards and `STATUS.md` rows.
- **Stop. Report findings, especially the two calibration flags. Wait for go-ahead.**

**Stage 2 — Tier 2, named statistical procedures: 01, 19, 20, 21, 22**
- Land fix #2 (param-estimate `se` formulas — re-derive `tank`'s true closed-form
  variance, replace `unif`'s with `θ/√(n(n+2))`, Monte-Carlo-quantify `sd`'s small-n
  approximation error), fix #8 (correlation forced outlier), fix #12's sibling check
  (bayes-urn distractor loop cap).
- Independent Python Bayes'-rule re-derivation for bayes-urn, diffed against 10k random
  (urn, draw-sequence) combinations.
- Confirm biased-coin/regime-shift/drift-hunt's Bernoulli/Normal draws statistically
  match their claimed models (mean/variance vs. theory over ≥10k draws).
- Confirm `u.corr()` matches `scipy.stats.pearsonr` on identical generated data.
- Update the 5 relevant task cards and `STATUS.md` rows.
- **Stop. Report. Wait for go-ahead.**

**Stage 3 — Tier 3, deterministic/combinatorial:
02,03,04,05,06,09,13,14,15,16,17,18,23**
- Land fix #3 (order-book imbalance tie-break), #4 (drift-hunt sigma), #5 (order-book
  filler-dedup), #12's fallback in pattern-race, document (no code change) the
  provably-unreachable Tier-3 items from finding #13.
- Python cross-checks: exact-fraction dominance re-derivation for dice-duel's
  `beats()`; `math.comb`/known-sequence checks (derangement numbers, double
  factorials) for combinatorics' 9 families; exact re-derivation of cond-prob's 7
  families including the generalized Monty Hall and boy-girl retrodiction; Conway
  leading-number cross-check for pattern-race.
- Update the 13 relevant task cards and `STATUS.md` rows.
- **Stop. Report.**

**Final** — consolidate all three stages' rows into the single `STATUS.md` at repo root
(built incrementally stage by stage, not written from scratch at the end). Confirm no
edits landed in `app.js` or `index.html`. Findings #6 and #7 were resolved by
recalibrating the corrected games with the documented four-policy, 4,000-run method;
the resulting anchors are recorded in `CALIBRATION.md` and reproduced by
`verification/python/calibration/pnl_recalibration.py`.

## Verification (how each stage is meant to prove itself before moving on)

- Every fixed game file still parses (`node --check js/games/NN-*.js`) and still runs
  end-to-end in a real browser (`python -m http.server` + drive the game) — confirms a
  logic fix didn't break the render/score pipeline.
- Every Monte Carlo check reports its own sample size (≥10,000 where the doc requires
  it), empirical mean/variance, and the theoretical value it's compared against — not
  just a pass/fail, so the evidence is inspectable by anyone, not just asserted.
- `STATUS.md` is only as trustworthy as its rows are freshly re-derived — each row
  should link to the specific `verification/python/**` script and
  `verification/node/**` harness invocation that produced it.

---

## Notes for anyone (human or AI) picking up a single game from this plan

- Read the specific game's finding above (if it has one) and its file at
  `js/games/NN-gamename.js` before touching anything.
- The shared core it depends on is `js/core/rng.js`, `util.js`, `engine.js`,
  `widgets.js`, `percentile.js` — read `CALIBRATION.md` §1–§4 first for the scoring
  contract and how `th:` percentile anchors work, so you don't propose a fix that
  silently changes a game's score range without flagging it.
- Do not edit `app.js` or `index.html`. Change a `th:` value only when a corrected
  mechanic has a recorded, reproducible recalibration; otherwise flag the exposure.
- Do not commit intermediate stages. After all evidence and final browser checks pass,
  the owner may stage, commit, and push the complete review.
- If you find something not listed above, add it as a new numbered finding in this
  file's "What the exploration found" section (or, once it exists, as a new entry in
  that game's `verification/tasks/NN-gamename.md` card) rather than silently fixing it
  — the whole point of this pass is a reviewable trail, not just a diff.
