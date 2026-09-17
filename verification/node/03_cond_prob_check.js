/* Evidence runner for game 03. Calls every shipped FAM generator directly. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "03-cond-prob.js"));

function instrument(rng) {
  const calls = [];
  const wrapped = Object.create(rng);
  wrapped.int = function (a, b) {
    const value = rng.int(a, b);
    calls.push({ method: "int", a, b, value });
    return value;
  };
  wrapped.bool = function (p) {
    const value = rng.bool(p);
    calls.push({ method: "bool", p: p === undefined ? null : p, value });
    return value;
  };
  wrapped.pick = function (values) {
    const value = rng.pick(values);
    calls.push({ method: "pick", values: values.slice(), value });
    return value;
  };
  return { wrapped, calls };
}

function collectFamily(name, seed, n) {
  const rng = QA.makeRng(seed);
  const records = [];
  for (let i = 0; i < n; i += 1) {
    const inst = instrument(rng);
    const item = game.FAM[name](inst.wrapped);
    records.push({ q: item.q, sub: item.sub, p: item.p, calls: inst.calls });
  }
  return records;
}

function checkBuild(seed, fams) {
  const rng = QA.makeRng(seed);
  let minOptions = Infinity;
  let minimumExample = null;
  const counts = {};
  for (let i = 0; i < 10000; i += 1) {
    const item = game.build(rng, { fams });
    if (item.opts.length < minOptions) {
      minOptions = item.opts.length;
      minimumExample = { q: item.q, p: item.p, traps: item.traps, opts: item.opts };
    }
    counts[item.q] = (counts[item.q] || 0) + 1;
  }
  return { draws: 10000, minOptions, distinctQuestions: Object.keys(counts).length, minimumExample };
}

const names = ["test", "dice", "coins", "family", "cards", "monty", "reversal"];
const families = {};
names.forEach((name, index) => { families[name] = collectFamily(name, 3030000 + index, 10000); });

process.stdout.write(JSON.stringify({
  game: 3,
  drawsPerFamily: 10000,
  families,
  standardBuild: checkBuild(3031000, ["test", "dice", "coins", "family", "cards"]),
  hardBuild: checkBuild(3032000, ["test", "dice", "coins", "cards", "monty", "reversal", "monty"]),
}) + "\n");
