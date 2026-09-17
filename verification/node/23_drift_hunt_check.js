/* Evidence runner for game 23. Calls the shipped normal increment and z formula. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "23-drift-hunt.js"));

function simulate(seed, mu, sigma, n, paths) {
  const rng = QA.makeRng(seed);
  const finals = [];
  for (let pathIndex = 0; pathIndex < paths; pathIndex += 1) {
    let total = 0;
    for (let i = 0; i < n; i += 1) total += game.drawIncrement(rng, mu, sigma);
    finals.push(total);
  }
  const mean = finals.reduce((a, b) => a + b, 0) / finals.length;
  const variance = finals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (finals.length - 1);
  return { mu, sigma, n, paths, mean, variance, theoreticalMean: mu * n, theoreticalVariance: sigma * sigma * n };
}

process.stdout.write(JSON.stringify({
  game: 23,
  pathsPerCase: 10000,
  cases: [
    simulate(2323000, 0.35, 1, 100, 10000),
    simulate(2324000, 0.16, 1, 100, 10000),
    simulate(2325000, 0.35, 2.5, 100, 10000),
  ],
  zChecks: [
    { mu: 0.35, sigma: 1, n: 100, actual: game.theoreticalZ(0.35, 1, 100), expected: 3.5 },
    { mu: 0.35, sigma: 2.5, n: 100, actual: game.theoreticalZ(0.35, 2.5, 100), expected: 1.4 },
    { mu: 0.16, sigma: 0.5, n: 25, actual: game.theoreticalZ(0.16, 0.5, 25), expected: 1.6 },
  ],
}) + "\n");
