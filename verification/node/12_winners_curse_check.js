/* Evidence runner for game 12. Calls the real shipped round/scoring functions. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "12-winners-curse.js"));

const configs = QA.byId["winners-curse"].variants;
const n = 20000;
const results = Object.keys(configs).map(variant => {
  const cfg = configs[variant];
  const rng = QA.makeRng(1200000 + (variant === "hard" ? 100000 : 0));
  let lowerExcluded = 0, upperExcluded = 0, positiveOptimum = 0, totalProfitGap = 0;
  let boundErrors = 0, scoreErrors = 0, minWidth = Infinity;
  const samples = [];
  for (let i = 0; i < n; i += 1) {
    const round = game.makeRound(rng, cfg);
    if (round.lo > round.hi) boundErrors += 1;
    minWidth = Math.min(minWidth, round.hi - round.lo + 1);
    const profitableOptimum = round.topRival < round.V;
    let optimalBid = null;
    if (profitableOptimum) {
      positiveOptimum += 1;
      optimalBid = Math.floor(round.topRival) + 1;
      if (optimalBid < round.lo) lowerExcluded += 1;
      if (optimalBid > round.hi) upperExcluded += 1;
    }
    let boundBest = -Infinity;
    for (let bid = round.lo; bid <= round.hi; bid += 1) boundBest = Math.max(boundBest, game.profitAt(round, bid));
    const optimalProfit = optimalBid === null ? 0 : game.profitAt(round, optimalBid);
    totalProfitGap += Math.max(0, optimalProfit - boundBest);
    const testProfit = round.V - round.lo;
    if (game.scoreProfit(testProfit, cfg) !== Math.round(testProfit * cfg.scale)) scoreErrors += 1;
    if (samples.length < 5) samples.push({ V: round.V, sd: round.sd, N: round.N, mySig: round.mySig, topRival: round.topRival, lo: round.lo, hi: round.hi, optimalBid, optimalProfit, boundBest });
  }
  return {
    variant, n, cfg, positiveOptimum, lowerExcluded, upperExcluded,
    exclusionRate: (lowerExcluded + upperExcluded) / Math.max(1, positiveOptimum),
    lowerRate: lowerExcluded / Math.max(1, positiveOptimum),
    upperRate: upperExcluded / Math.max(1, positiveOptimum),
    meanProfitGap: totalProfitGap / n,
    boundErrors, scoreErrors, minWidth, samples
  };
});

process.stdout.write(JSON.stringify({ game: 12, drawsPerVariant: n, results }) + "\n");
