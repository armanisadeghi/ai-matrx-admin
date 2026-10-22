// Turbopack production builds drop the statement `(/* @__PURE__ */ new Set(...)).forEach(cb)`
// (the callback's side effects vanish, the function returns empty results). Univer's
// @univerjs/sheets-formula ref-range code is written exactly that way, so a minified build never
// rewrote formulas on row/column insert, delete or move. Removing the annotation keeps the loop.
// Guard + evidence: __tests__/univer-pure-set-loop-survives-production-build.test.ts
module.exports = function stripPureSet(source) {
  return String(source).replace(/\/\* @__PURE__ \*\/ new Set\(/g, "new Set(");
};
