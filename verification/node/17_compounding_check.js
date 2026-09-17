/* Evidence runner for game 17. Calls every shipped compounding family directly. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "17-compounding.js"));

const names = ["rule72", "fv", "pv", "cagr", "annualize", "volUp", "volDown", "sharpe", "cont", "breakeven", "halflife", "perpetuity"];
const records = {};
names.forEach((name, index) => {
  const rng = QA.makeRng(1717000 + index);
  records[name] = [];
  for (let i = 0; i < 10000; i += 1) {
    const item = game.FAM[name](rng);
    records[name].push({ q: item.q, answer: item.a, tolerance: item.tol, dp: item.dp });
  }
});

process.stdout.write(JSON.stringify({ game: 17, drawsPerFamily: 10000, records }) + "\n");
