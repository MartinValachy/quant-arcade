/* Evidence runner for game 16. Calls every shipped sequence generator directly. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "16-sequences.js"));

function collect(name, seed) {
  const rng = QA.makeRng(seed);
  const rows = [];
  for (let i = 0; i < 10000; i += 1) {
    const calls = [];
    const wrapped = Object.create(rng);
    wrapped.int = function (a, b) { const value = rng.int(a, b); calls.push({ method: "int", a, b, value }); return value; };
    wrapped.bool = function (p) { const value = rng.bool(p); calls.push({ method: "bool", p: p === undefined ? null : p, value }); return value; };
    wrapped.pick = function (values) { const value = rng.pick(values); calls.push({ method: "pick", values: values.slice(), value }); return value; };
    const g = game.GEN[name](wrapped);
    const terms = [];
    for (let n = 0; n < 7; n += 1) terms.push(g.f(n));
    rows.push({ terms, calls });
  }
  return rows;
}

const names = ["arith", "geom", "quad", "fib", "affine", "altern", "interleave", "cubic", "squarePlus", "triangular", "primes", "factorialish", "doubleDiff"];
const records = {};
names.forEach((name, index) => { records[name] = collect(name, 1616000 + index); });
process.stdout.write(JSON.stringify({ game: 16, drawsPerFamily: 10000, records }) + "\n");
