/* Evidence runner for game 04. Calls every shipped FAM generator directly. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "04-combinatorics.js"));

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
    calls.push({ method: "bool", p, value });
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
    records.push({ q: item.q, sub: item.sub, answer: item.a, calls: inst.calls });
  }
  return records;
}

const names = ["paths", "pathsBlocked", "anagram", "committee", "starsBars", "circular", "noAdjacent", "derange", "pairing", "hands"];
const families = {};
names.forEach((name, index) => { families[name] = collectFamily(name, 4040000 + index, 10000); });

process.stdout.write(JSON.stringify({ game: 4, drawsPerFamily: 10000, families }) + "\n");
