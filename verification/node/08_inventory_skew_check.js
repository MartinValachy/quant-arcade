/* Evidence runner for game 08. Calls the pure mechanics used by the live game. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "08-inventory-skew.js"));

const configs = QA.byId["inventory-skew"].variants;
const skews = [-4, -2, 0, 2, 4];
const n = 20000;
const results = Object.keys(configs).map(variant => {
  const cfg = configs[variant];
  const rows = skews.map(skew => {
    const rng = QA.makeRng(800000 + (variant === "hard" ? 10000 : 0) + skew + 4);
    let buys = 0, edgeSum = 0, invDeltaSum = 0;
    for (let i = 0; i < n; i += 1) {
      const step = game.flowStep(100, skew, 0, rng, cfg);
      if (step.side === "buy") buys += 1;
      edgeSum += step.edge;
      invDeltaSum += step.inv;
    }
    const q = game.quoteAt(100, skew, cfg);
    return {
      skew,
      pBuyEmpirical: buys / n,
      edgeEmpirical: edgeSum / n,
      invDeltaEmpirical: invDeltaSum / n,
      pBuyTheory: 1 / (1 + Math.exp(skew * cfg.beta)),
      edgeTheory: (1 / (1 + Math.exp(skew * cfg.beta))) * (q.ask - 100) +
        (1 - 1 / (1 + Math.exp(skew * cfg.beta))) * (100 - q.bid),
      invDeltaTheory: 1 - 2 / (1 + Math.exp(skew * cfg.beta)),
      quote: q
    };
  });
  const liquidation = [-100, -cfg.limit - 1, -1, 0, 1, cfg.limit + 1, 100].map(inv => ({
    inv,
    after: game.forceLiquidate(inv)
  }));
  const carry = [0, 1, 2, cfg.limit].map(inv => ({
    inv,
    charge: game.capitalCharge(inv, cfg),
    expected: Math.round(cfg.carry * inv * inv)
  }));
  return { variant, n, cfg, rows, liquidation, carry };
});

process.stdout.write(JSON.stringify({ game: 8, drawsPerRow: n, results }) + "\n");
