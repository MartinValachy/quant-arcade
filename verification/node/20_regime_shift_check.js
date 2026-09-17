/* Evidence runner for game 20. Calls the real shipped regime/increment functions. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "20-regime-shift.js"));

const configs = QA.byId["regime-shift"].variants;
const n = 20000;
const results = Object.keys(configs).map(variant => {
  const cfg = configs[variant];
  const paramRng = QA.makeRng(2000000 + (variant === "hard" ? 100000 : 0));
  const tauCounts = {};
  let volShifts = 0, posDrift = 0, negDrift = 0, minTau = Infinity, maxTau = -Infinity;
  for (let i = 0; i < n; i += 1) {
    const round = game.makeRound(paramRng, cfg);
    tauCounts[round.tau] = (tauCounts[round.tau] || 0) + 1;
    if (round.volShift) volShifts += 1;
    if (round.drift > 0) posDrift += 1; else negDrift += 1;
    minTau = Math.min(minTau, round.tau); maxTau = Math.max(maxTau, round.tau);
  }

  const fixedRound = game.makeRound(QA.makeRng(2026000 + (variant === "hard" ? 100000 : 0)), cfg);
  const pre = game.regimeAt(fixedRound, fixedRound.tau, cfg);
  const post = game.regimeAt(fixedRound, fixedRound.tau + 1, cfg);
  const sampleRng = QA.makeRng(2030000 + (variant === "hard" ? 100000 : 0));
  function sampleAt(i) {
    let sum = 0, sum2 = 0;
    for (let j = 0; j < n; j += 1) {
      const x = game.increment(fixedRound, i, sampleRng, cfg).value;
      sum += x; sum2 += x * x;
    }
    const mean = sum / n;
    return { n, mean, variance: (sum2 - n * mean * mean) / (n - 1) };
  }
  return { variant, cfg, n, tauCounts, volShifts, posDrift, negDrift, minTau, maxTau, fixedRound, pre, post, preSample: sampleAt(fixedRound.tau), postSample: sampleAt(fixedRound.tau + 1) };
});

process.stdout.write(JSON.stringify({ game: 20, rounds: n, results }) + "\n");
