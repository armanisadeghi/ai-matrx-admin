// Turbopack production builds delete the statement `(/* @__PURE__ */ new X(...)).method(cb)`: the PURE
// annotation makes the whole call look side-effect-free, so the callback's work vanishes. Univer's
// sheets-formula ref-range code is written that way, so a minified build never rewrote formulas on
// row/column insert, delete or move. This loader removes the annotation from every such statement
// (found by scripts/scan-pure-chained-statements.cjs), whatever the constructor.
// Guard + evidence: __tests__/turbopack-pure-chained-statements.test.ts
const { findPureChainedStatements, PURE_RESULT_METHODS } = require("./scan-pure-chained-statements.cjs");

module.exports = function stripPureLoop(source) {
  let out = String(source);
  if (!out.includes("PURE__")) return out;
  const hits = findPureChainedStatements(out).filter((h) => !PURE_RESULT_METHODS.has(h.method));
  for (let i = hits.length - 1; i >= 0; i--) {
    out = out.slice(0, hits[i].annotStart) + out.slice(hits[i].annotEnd).replace(/^\s*/, "");
  }
  return out;
};
