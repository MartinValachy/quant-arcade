/* Evidence runner for game 07. Calls the real shipped BANK and pickoff functions. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "07-market-maker.js"));

function instrument(factory, rng) {
  const configCalls = [];
  const wrapped = Object.create(rng);
  wrapped.int = function (a, b) {
    const value = rng.int(a, b);
    // Configuration draws have ranges other than the draw-level 1..6/1..13 calls.
    if (!(a === 1 && (b === 6 || b === 13))) configCalls.push({ method: "int", a, b, value });
    return value;
  };
  wrapped.pick = function (values) {
    const value = rng.pick(values);
    configCalls.push({ method: "pick", values: values.slice(), value });
    return value;
  };
  const inst = factory(wrapped);
  return { inst, configCalls };
}

const rng = QA.makeRng(7012026);
const scenarios = [0.225, 0.5, 1.0];
const families = game.BANK.map((factory, family) => {
  const { inst, configCalls } = instrument(factory, rng);
  const widthResults = scenarios.map(multiplier => {
    const halfWidth = inst.sd * multiplier;
    const bid = inst.ev - halfWidth;
    const ask = inst.ev + halfWidth;
    return {
      multiplier,
      bid,
      ask,
      pickoff: game.pickoff(inst.samples, ask, bid)
    };
  });
  const draws = [];
  for (let i = 0; i < 10000; i += 1) draws.push(inst.draw(rng));
  const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
  const variance = draws.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (draws.length - 1);
  return {
    family,
    configCalls,
    desc: inst.desc,
    ev: inst.ev,
    sd: inst.sd,
    samples: inst.samples,
    drawMean: mean,
    drawVariance: variance,
    pickoff: widthResults
  };
});

process.stdout.write(JSON.stringify({ seed: 7012026, n: 10000, families }) + "\n");
