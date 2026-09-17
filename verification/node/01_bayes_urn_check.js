/* Evidence runner for game 01. Calls the real shipped generator and posterior. */
const fs = require("fs");
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "01-bayes-urn.js"));

const source = fs.readFileSync(path.join(root, "js", "games", "01-bayes-urn.js"), "utf8");
const configs = QA.byId["bayes-urn"].variants;
const n = 10000;
const results = Object.keys(configs).map(variant => {
  const cfg = configs[variant];
  const rng = QA.makeRng(1010000 + (variant === "hard" ? 100000 : 0));
  const records = [];
  for (let i = 0; i < n; i += 1) {
    const item = game.makeItem(rng, cfg);
    records.push({ A: item.A, B: item.B, priorA: item.priorA, seq: item.seq, post: item.post, opts: item.opts, noPrior: item.noPrior });
  }
  return { variant, n, records };
});

const edgeCases = [
  { A: { r: 4, b: 1 }, B: { r: 1, b: 4 }, prior: 0.5, seq: ["R", "R", "R", "R"] },
  { A: { r: 4, b: 1 }, B: { r: 1, b: 4 }, prior: 0.5, seq: ["B", "B", "B", "B"] },
  { A: { r: 4, b: 1 }, B: { r: 1, b: 4 }, prior: 0.2, seq: ["R", "R", "R", "R"] },
  { A: { r: 4, b: 1 }, B: { r: 1, b: 4 }, prior: 0.8, seq: ["B", "B", "B", "B"] }
].map(x => Object.assign(x, { post: game.posterior(x.A, x.B, x.prior, x.seq) }));

// A hostile deterministic RNG forces the filler retry guard to exhaust.
const hostile = {
  int: function (a) { return a; },
  pick: function (arr) { return arr[0]; },
  bool: function () { return true; },
  uni: function (a, b) { return (a + b) / 2; },
  shuffle: function (arr) { return arr; }
};
const hostileItem = game.makeItem(hostile, { draws: [2, 2], skewPrior: false });

process.stdout.write(JSON.stringify({
  game: 1,
  drawsPerVariant: n,
  results,
  edgeCases,
  hostile: { optionCount: hostileItem.opts.length, options: hostileItem.opts, posterior: hostileItem.post },
  boundedFiller: /while \(opts\.length < 4 && fillGuard\+\+ < 200\)/.test(source)
}) + "\n");
