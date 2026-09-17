/* Evidence runner for game 18. Calls the real shipped grid and terminal logic. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "18-target-sum.js"));

const configs = {
  standard: { size: 4, lo: 3, hi: 29, k: 3, negatives: false, exact: false },
  hard: { size: 5, lo: 4, hi: 48, k: 4, negatives: true, exact: true },
};

function collect(seed, cfg) {
  const rng = QA.makeRng(seed);
  const rows = [];
  for (let i = 0; i < 10000; i += 1) rows.push(game.makeGrid(rng, cfg));
  return rows;
}

process.stdout.write(JSON.stringify({
  game: 18,
  drawsPerVariant: 10000,
  standard: collect(1818000, configs.standard),
  hard: collect(1819000, configs.hard),
  terminal: {
    standardTrue: game.solved(10, 10, 1, configs.standard),
    standardWrongSum: game.solved(9, 10, 1, configs.standard),
    hardTrue: game.solved(10, 10, 4, configs.hard),
    hardWrongCount: game.solved(10, 10, 3, configs.hard),
    hardWrongSum: game.solved(9, 10, 4, configs.hard),
  },
}) + "\n");
