/* Evidence runner for game 21. Calls the real shipped estimator families. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "21-param-estimate.js"));

const families = Object.keys(game.FAM);
const n = 10000;
function recordFamily(family, familyIndex) {
  const rng = QA.makeRng(2100000 + familyIndex * 1000);
  const records = [];
  for (let i = 0; i < n; i += 1) {
    const calls = [];
    const wrapped = Object.create(rng);
    ["int", "uni"].forEach(method => {
      wrapped[method] = function (...args) {
        const value = rng[method].apply(rng, args);
        calls.push({ method, args, value });
        return value;
      };
    });
    const item = game.FAM[family](wrapped);
    records.push({ calls, truth: item.truth, se: item.se, finite: Number.isFinite(item.truth) && Number.isFinite(item.se) });
  }
  return { family, n, records };
}

process.stdout.write(JSON.stringify({ game: 21, families: families.map(recordFamily) }) + "\n");
