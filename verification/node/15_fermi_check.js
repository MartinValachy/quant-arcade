/* Evidence runner for game 15. Calls the real fixed Q bank and slider helpers. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "15-fermi.js"));

const configs = {
  standard: { tol: 1.2, full: 0.5 },
  hard: { tol: 0.6, full: 0.2 },
};

function ranges(seed, cfg) {
  const rng = QA.makeRng(seed);
  return game.Q.map(item => {
    let minBelow = Infinity, maxBelow = -Infinity, minLo = Infinity, maxLo = -Infinity, minHi = Infinity, maxHi = -Infinity;
    let valid = true;
    for (let i = 0; i < 10000; i += 1) {
      const row = game.sliderRange(rng, item);
      minBelow = Math.min(minBelow, row.below); maxBelow = Math.max(maxBelow, row.below);
      minLo = Math.min(minLo, row.lo); maxLo = Math.max(maxLo, row.lo);
      minHi = Math.min(minHi, row.hi); maxHi = Math.max(maxHi, row.hi);
      if (!(row.lo < row.E && row.E < row.hi) || Math.abs(row.hi - row.lo - 8) > 1e-9) valid = false;
    }
    const errors = [0, cfg.full, (cfg.full + cfg.tol) / 2, cfg.tol, cfg.tol + 0.2];
    return {
      q: item.q, answer: item.a, E: Math.log10(item.a),
      minBelow, maxBelow, minLo, maxLo, minHi, maxHi, valid,
      scoreSamples: errors.map(error => ({ error, score: game.scoreEstimate(error, cfg) })),
    };
  });
}

process.stdout.write(JSON.stringify({ game: 15, drawsPerQuestion: 10000, questions: game.Q,
  standard: ranges(1515000, configs.standard), hard: ranges(1516000, configs.hard) }) + "\n");
