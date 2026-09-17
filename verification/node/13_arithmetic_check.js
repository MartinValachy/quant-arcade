/* Evidence runner for game 13. Calls the real shipped arithmetic generator. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "13-arithmetic.js"));

const configs = {
  standard: {
    lo: 12, hi: 99, negatives: false,
    kinds: ["add", "sub", "mul1", "div", "dec", "chain", "sq", "frac"],
  },
  hard: {
    lo: 120, hi: 999, negatives: true,
    kinds: ["add", "sub", "mul2", "divdec", "dec2", "chain2", "chain3", "neg", "negmul", "sq", "frac"],
  },
};

function collect(seed, variant, kinds) {
  const rng = QA.makeRng(seed);
  const rows = {};
  for (const kind of kinds) {
    rows[kind] = [];
    for (let i = 0; i < 10000; i += 1) {
      const item = game.gen(rng, { ...configs[variant], kinds: [kind] });
      rows[kind].push({ q: item.q, answer: item.a, dp: item.dp, tolerance: game.tolerance(item.dp) });
    }
  }
  return rows;
}

process.stdout.write(JSON.stringify({
  game: 13,
  drawsPerKind: 10000,
  standard: collect(1313000, "standard", configs.standard.kinds),
  hard: collect(1314000, "hard", configs.hard.kinds),
}) + "\n");
