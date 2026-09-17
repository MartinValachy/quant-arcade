/* Evidence runner for game 19. Calls the real shipped round generator and RNG. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "19-biased-coin.js"));

const configs = QA.byId["biased-coin"].variants;
const n = 20000;
const results = Object.keys(configs).map(variant => {
  const cfg = configs[variant];
  const rng = QA.makeRng(1900000 + (variant === "hard" ? 100000 : 0));
  const targets = Array(cfg.coins).fill(0);
  let positive = 0, negative = 0, minAbs = Infinity, maxAbs = -Infinity, badRounds = 0;
  for (let i = 0; i < n; i += 1) {
    const round = game.makeRound(rng, cfg);
    targets[round.target] += 1;
    if (round.bias > 0) positive += 1; else negative += 1;
    minAbs = Math.min(minAbs, Math.abs(round.bias));
    maxAbs = Math.max(maxAbs, Math.abs(round.bias));
    if (round.ps.filter(p => p !== 0.5).length !== 1 || round.ps.some(p => p <= 0 || p >= 1)) badRounds += 1;
  }
  const fixed = cfg.bias.reduce((all, mag) => all.concat([0.5 + mag, 0.5 - mag]), []).map((p, pIndex) => {
    const coinRng = QA.makeRng(1910000 + pIndex * 100 + (variant === "hard" ? 100000 : 0));
    let heads = 0;
    for (let i = 0; i < n; i += 1) if (coinRng.bool(p)) heads += 1;
    const mean = heads / n;
    return { p, n, heads, mean, variance: mean * (1 - mean) };
  });
  return { variant, cfg, n, targets, positive, negative, minAbs, maxAbs, badRounds, fixed };
});

process.stdout.write(JSON.stringify({ game: 19, drawsPerCheck: n, results }) + "\n");
