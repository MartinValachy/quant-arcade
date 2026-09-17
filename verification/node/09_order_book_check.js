/* Evidence runner for game 09. Calls the real book, query, and option logic. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "09-order-book.js"));

function collect(seed, cfg) {
  const rng = QA.makeRng(seed);
  const rows = [];
  const names = cfg.qs;
  for (let i = 0; i < 10000; i += 1) {
    const book = game.makeBook(rng, cfg);
    const name = names[i % names.length];
    const spec = game.Q[name](book, rng);
    if (!spec) throw new Error(`${name} unexpectedly returned null`);
    const options = spec.choices ? null : game.buildOptions(spec, rng);
    rows.push({ name, book, spec, labels: options && options.map(o => game.displayValue(o, spec.fmt)) });
  }
  return rows;
}

const tieBook = {
  tick: 0.01,
  bids: [{ p: 99.98, s: 10 }, { p: 99.97, s: 20 }, { p: 99.96, s: 30 }, { p: 99.95, s: 5 }],
  asks: [{ p: 100.02, s: 30 }, { p: 100.03, s: 20 }, { p: 100.04, s: 10 }, { p: 100.05, s: 5 }],
  mid: 100,
};

process.stdout.write(JSON.stringify({
  game: 9,
  drawsPerVariant: 10000,
  standard: collect(9093000, { levels: 4, qs: ["mid", "bestSize", "imbalance", "total", "depth"] }),
  hard: collect(9094000, { levels: 6, qs: ["micro", "sweepQ", "imbalance", "total", "depth"] }),
  tie: game.Q.imbalance(tieBook, {}),
}) + "\n");
