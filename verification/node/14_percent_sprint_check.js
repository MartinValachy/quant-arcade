/* Evidence runner for game 14. Calls every shipped percentage family directly. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "14-percent-sprint.js"));

const names = ["pctOf", "whatPct", "change", "reverse", "successive", "frac", "bps", "markup", "share", "compound2"];
const records = {};
names.forEach((name, index) => {
  const rng = QA.makeRng(1414000 + index);
  records[name] = [];
  for (let i = 0; i < 10000; i += 1) records[name].push(game.FAM[name](rng));
});

process.stdout.write(JSON.stringify({ game: 14, drawsPerFamily: 10000, records }) + "\n");
