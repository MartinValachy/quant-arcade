/* Evidence runner for game 24. Calls the pure mechanics used by the live game. */
const path = require("path");
const { root, QA } = require("./shim.js");
const game = require(path.join(root, "js", "games", "24-kelly.js"));

const configs = QA.byId["kelly"].variants;
const paths = 10000;
const blocks = 50;
const policyNames = ["zero", "kelly", "doubleKelly", "full"];

function chooseFraction(policy, bet) {
  if (policy === "zero") return 0;
  if (policy === "kelly") return Math.max(0, bet.fStar);
  if (policy === "doubleKelly") return Math.min(1, Math.max(0, 2 * bet.fStar));
  return 1;
}

const results = Object.keys(configs).map(variant => {
  const cfg = configs[variant];
  const policyResults = policyNames.map((policy, policyIndex) => {
    const rng = QA.makeRng(2400000 + policyIndex * 10000 + (variant === "hard" ? 100000 : 0));
    let pathsRuined = 0, floorBlocks = 0, floorEvents = 0, ruinBlocks = 0, totalBlocks = 0;
    let traps = 0, invalid = 0, fStarSum = 0;
    for (let path = 0; path < paths; path += 1) {
      let bank = cfg.start;
      for (let block = 0; block < blocks; block += 1) {
        const bet = game.makeBet(rng, cfg);
        if (!Number.isFinite(bet.fStar) || !Number.isFinite(bet.p) || !Number.isFinite(bet.b)) invalid += 1;
        if (bet.isTrap) traps += 1;
        fStarSum += bet.fStar;
        const f = chooseFraction(policy, bet);
        const settled = game.settleBlock(bank, bet, f, rng, cfg);
        bank = settled.bank;
        totalBlocks += 1;
        if (settled.floorHits) { floorBlocks += 1; floorEvents += settled.floorHits; }
        if (bank <= cfg.ruin) { ruinBlocks += 1; pathsRuined += 1; break; }
      }
    }
    return {
      policy, paths, blocks, totalBlocks, pathsRuined, floorBlocks, floorEvents, ruinBlocks,
      traps, invalid, meanFStar: fStarSum / totalBlocks,
      floorBlockRate: floorBlocks / totalBlocks,
      ruinPathRate: pathsRuined / paths,
      ruinBlockRate: ruinBlocks / totalBlocks
    };
  });
  return { variant, cfg, policies: policyResults };
});

process.stdout.write(JSON.stringify({ game: 24, results }) + "\n");
