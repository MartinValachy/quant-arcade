/* Evidence runner for game 11. Calls the real shipped question families. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "11-delta-hedge.js"));

const families = Object.keys(game.FAM);
const n = 10000;

function recordingRng(seed) {
  const rng = QA.makeRng(seed);
  const calls = [];
  const wrapped = Object.create(rng);
  ["int", "uni", "pick", "bool"].forEach(method => {
    wrapped[method] = function (...args) {
      const value = rng[method].apply(rng, args);
      calls.push({ method, args, value });
      return value;
    };
  });
  return { rng: wrapped, calls };
}

const results = families.map((family, familyIndex) => {
  const rng = QA.makeRng(1100000 + familyIndex * 1000);
  const records = [];
  for (let i = 0; i < n; i += 1) {
    const calls = [];
    const wrapped = Object.create(rng);
    ["int", "uni", "pick", "bool"].forEach(method => {
      wrapped[method] = function (...args) {
        const value = rng[method].apply(rng, args);
        calls.push({ method, args, value });
        return value;
      };
    });
    const item = game.FAM[family](wrapped);
    records.push({ calls, answer: item.a, tolerance: item.tol, finite: Number.isFinite(item.a) && Number.isFinite(item.tol) });
  }
  return { family, n, records };
});

// A deterministic equal-notional short case proves the guard is exercised.
let intCalls = 0;
const forced = {
  int: function () { intCalls += 1; return intCalls <= 2 ? 3 : 4; },
  uni: function (a, b) { return (a + b) / 2; },
  bool: function () { return true; },
  ticker: function () { return "TEST"; }
};
const forcedItem = game.FAM.netBeta(forced);

process.stdout.write(JSON.stringify({ game: 11, families: results, forced: {
  intCalls,
  answer: forcedItem.a,
  tolerance: forcedItem.tol,
  finite: Number.isFinite(forcedItem.a) && Number.isFinite(forcedItem.tol)
} }) + "\n");
