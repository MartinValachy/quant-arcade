/*
 * Run an exported generator from the actual shipped game file.
 * Usage:
 *   node run_generator.js <game-file> <exported-function> <seed> <n> [cfg-json]
 */
const fs = require("fs");
const path = require("path");
const { root, QA } = require("./shim.js");

const args = process.argv.slice(2);
if (args.length < 4) {
  console.error("usage: node run_generator.js <game-file> <exported-function> <seed> <n> [cfg-json]");
  process.exit(2);
}

const gamePath = path.resolve(root, args[0]);
if (!fs.existsSync(gamePath)) throw new Error("game file not found: " + gamePath);
const exported = require(gamePath);
const fnName = args[1];
const fn = exported && exported[fnName];
if (typeof fn !== "function") {
  throw new Error("exported function not found: " + fnName + " (available: " + Object.keys(exported || {}).join(", ") + ")");
}

const seed = Number(args[2]);
const n = Number(args[3]);
if (!Number.isInteger(n) || n < 1) throw new Error("n must be a positive integer");
let cfg = {};
if (args[4]) cfg = JSON.parse(args[4]);

const rng = QA.makeRng(seed);
for (let i = 0; i < n; i += 1) {
  const value = fn(rng, cfg);
  process.stdout.write(JSON.stringify({ draw: i, value: value }) + "\n");
}
