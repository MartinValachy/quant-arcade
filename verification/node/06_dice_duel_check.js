/* Evidence runner for game 06. Calls the real shipped beats/makeItem logic. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "06-dice-duel.js"));

function collect(seed, cfg, target) {
  const rng = QA.makeRng(seed);
  const rows = [];
  let attempts = 0;
  while (rows.length < target && attempts < 1000000) {
    attempts += 1;
    const item = game.makeItem(rng, cfg);
    if (item) rows.push({ dice: item.dice, oppIdx: item.oppIdx, probs: item.probs, best: item.best });
  }
  return { rows, attempts };
}

const known = {};
Object.keys(game.SETS).forEach(setName => {
  const dice = game.SETS[setName];
  known[setName] = {
    dice,
    matrix: dice.map(x => dice.map(y => game.beats(x.f, y.f))),
  };
});

process.stdout.write(JSON.stringify({
  game: 6,
  target: 10000,
  known,
  standard: collect(6063000, { k: 3, spread: 7, useKnown: true, knownSets: ["efron", "miwin"] }, 10000),
  hard: collect(6064000, { k: 4, spread: 9, useKnown: true, knownSets: ["efron", "grime"] }, 10000),
}) + "\n");
