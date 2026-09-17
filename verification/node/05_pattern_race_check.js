/* Evidence runner for game 05. Calls the shipped Conway and pair-generation logic. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "05-pattern-race.js"));

function collectPairs(seed, n, minEdge) {
  const rng = QA.makeRng(seed);
  const rows = [];
  for (let i = 0; i < 10000; i += 1) rows.push(game.makePair(rng, n, minEdge));
  return rows;
}

function collectWaits(seed, n) {
  const rng = QA.makeRng(seed);
  const rows = [];
  for (let i = 0; i < 10000; i += 1) {
    const pattern = game.randPat(rng, n);
    rows.push({ pattern, wait: game.wait(pattern) });
  }
  return rows;
}

function forced(boolValue, n, minEdge) {
  const rng = { bool: () => boolValue };
  const pair = game.makePair(rng, n, minEdge);
  return { pair, same: pair.A === pair.B, edge: Math.abs(pair.pA - 0.5) };
}

process.stdout.write(JSON.stringify({
  game: 5,
  drawsPerGroup: 10000,
  pairs3: collectPairs(5053000, 3, 0.08),
  pairs4: collectPairs(5054000, 4, 0.05),
  waits3: collectWaits(5055000, 3),
  waits4: collectWaits(5056000, 4),
  forced3: forced(false, 3, 0.08),
  forced4: forced(true, 4, 0.05),
}) + "\n");
