/* Evidence runner for game 10. Calls the pure mechanics used by the live game. */
const fs = require("fs");
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "10-toxic-flow.js"));

const source = fs.readFileSync(path.join(root, "js", "games", "10-toxic-flow.js"), "utf8");
const widgetSource = fs.readFileSync(path.join(root, "js", "core", "widgets.js"), "utf8");
const configs = QA.byId["toxic-flow"].variants;
const n = 20000;

const results = Object.keys(configs).map(variant => {
  const cfg = Object.assign({}, configs[variant], { drift: 0 });
  const rng = QA.makeRng(1000000 + (variant === "hard" ? 100000 : 0));
  const cps = game.makeCounterparties(rng, cfg);
  let informed = 0, edgeSum = 0, realSum = 0, buy = 0, sell = 0;
  let minTox = Infinity, maxTox = -Infinity, outOfBounds = 0;
  const perCp = cps.map(() => ({ n: 0, informed: 0 }));
  for (let i = 0; i < n; i += 1) {
    const trade = game.nextTrade(rng, cps, cfg);
    const cpIndex = cps.indexOf(trade.c);
    if (trade.informed) informed += 1;
    edgeSum += trade.edge;
    realSum += trade.real;
    if (trade.side === "BUY") buy += 1; else sell += 1;
    minTox = Math.min(minTox, trade.c.tox);
    maxTox = Math.max(maxTox, trade.c.tox);
    if (trade.c.tox < 0.03 || trade.c.tox > 0.95) outOfBounds += 1;
    perCp[cpIndex].n += 1;
    if (trade.informed) perCp[cpIndex].informed += 1;
  }
  const cleanCount = cps.filter(c => c.tox <= cfg.clean[1]).length;
  return {
    variant,
    n,
    cfg,
    counterparties: cps.map(c => c.tox),
    cleanCount,
    toxicCount: cps.length - cleanCount,
    informedRate: informed / n,
    edgeMean: edgeSum / n,
    realMean: realSum / n,
    buyRate: buy / n,
    sellRate: sell / n,
    minTox,
    maxTox,
    outOfBounds,
    perCp,
    scoreExamples: [-2.4, -1.25, 0, 0.75, 1.6].map(real => ({ real, score: game.tradeScore(real, cfg) })),
    manualAsk: source.includes("manual: true"),
    askManualBranch: widgetSource.includes("var pts = spec.manual ? 0"),
    manualMark: source.includes("ctx.mark(real > 0)")
  };
});

process.stdout.write(JSON.stringify({ game: 10, drawsPerVariant: n, results }) + "\n");
