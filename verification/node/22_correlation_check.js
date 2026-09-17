/* Evidence runner for game 22. Calls the real shipped sample/correlation functions. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "22-correlation.js"));

const configs = QA.byId["correlation"].variants;
const n = 10000;
const exact = [];
const results = Object.keys(configs).map(variant => {
  const cfg = configs[variant];
  const rng = QA.makeRng(2200000 + (variant === "hard" ? 100000 : 0));
  let sum = 0, sum2 = 0, minN = Infinity, maxN = -Infinity, minOutliers = Infinity, maxOutliers = -Infinity, invalid = 0;
  for (let i = 0; i < n; i += 1) {
    const round = game.makeRound(rng, cfg);
    const r = round.sample.r;
    sum += r; sum2 += r * r;
    minN = Math.min(minN, round.n); maxN = Math.max(maxN, round.n);
    minOutliers = Math.min(minOutliers, round.outliersRequested);
    maxOutliers = Math.max(maxOutliers, round.outliersRequested);
    if (!Number.isFinite(r) || round.sample.xs.length !== round.n || round.sample.ys.length !== round.n) invalid += 1;
    if (exact.length < 200) exact.push({ variant, xs: round.sample.xs, ys: round.sample.ys, r: r });
  }
  const mean = sum / n;
  return { variant, n, cfg, minN, maxN, minOutliers, maxOutliers, invalid, meanR: mean, varianceR: (sum2 - n * mean * mean) / (n - 1) };
});

process.stdout.write(JSON.stringify({ game: 22, drawsPerVariant: n, results, exact }) + "\n");
