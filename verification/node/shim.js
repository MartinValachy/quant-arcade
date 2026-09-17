/* Load the browser-oriented core in the same order as the web app, without jsdom. */
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
global.window = global;

require(path.join(root, "js", "core", "rng.js"));
require(path.join(root, "js", "core", "util.js"));
require(path.join(root, "js", "core", "percentile.js"));
require(path.join(root, "js", "core", "widgets.js"));
require(path.join(root, "js", "core", "engine.js"));

module.exports = { root: root, QA: global.QA };
