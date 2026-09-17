/* Evidence runner for game 02. Calls the real shipped bank and quote logic. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "02-ev-sprint.js"));

function collect(bank, seed, n) {
  const rng = QA.makeRng(seed);
  const records = [];
  for (let i = 0; i < n; i += 1) {
    const gamble = bank(rng);
    const fair = game.ev(gamble.o);
    records.push({ desc: gamble.d, outcomes: gamble.o, fair });
  }
  return records;
}

const fair = 100;
const quoteBoundary = [
  { price: 97.999999, truth: 0 },
  { price: 98, truth: 2 },
  { price: 98.000001, truth: 2 },
  { price: 101.999999, truth: 2 },
  { price: 102, truth: 2 },
  { price: 102.000001, truth: 1 },
].map(row => ({ ...row, actual: game.quoteTruth(fair, row.price) }));

process.stdout.write(JSON.stringify({
  game: 2,
  drawsPerVariant: 10000,
  standard: collect(game.easyBank, 20260917, 10000),
  hard: collect(game.hardBank, 20260918, 10000),
  quoteBoundary,
}) + "\n");
