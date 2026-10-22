// Finds statements of the shape  (/* @__PURE__ */ new X(...)).method(...)  -- the form Turbopack's
// production minifier deletes whole (the PURE annotation makes the call look side-effect-free, so the
// chained call's side effects vanish). Shared by the guard test and the one-off sweep.
const fs = require("fs");
const path = require("path");

const PURE = /\/\*\s*[#@]__PURE__\s*\*\//g;

function skipBalanced(s, i) {
  // s[i] === "(" ; returns index after the matching ")"
  let depth = 0, q = null;
  for (; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === "\\") i++;
      else if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") q = c;
    else if (c === "/" && s[i + 1] === "*") { i = s.indexOf("*/", i + 2); if (i < 0) return -1; i++; }
    else if (c === "/" && s[i + 1] === "/") { i = s.indexOf("\n", i); if (i < 0) return -1; }
    else if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth === 0) return i + 1; }
  }
  return -1;
}

/** @returns {{index:number,annotStart:number,annotEnd:number,line:number,snippet:string,method:string}[]} */
function findPureChainedStatements(source) {
  const hits = [];
  let m;
  PURE.lastIndex = 0;
  while ((m = PURE.exec(source))) {
    // Must be wrapped:  <statement start> ( /*PURE*/ expr ) . method (
    let b = m.index - 1;
    while (b >= 0 && /\s/.test(source[b])) b--;
    if (source[b] !== "(") continue;
    let p = b - 1;
    while (p >= 0 && /\s/.test(source[p])) p--;
    if (p >= 0 && !";{}".includes(source[p])) continue; // not a statement start
    if (source[p] === "{" && source[p - 1] === "$") continue; // template placeholder ${(...)}, not a statement
    let i = m.index + m[0].length;
    const rest = source.slice(i, i + 120);
    const head = /^\s*(?:new\s+)?[\w$.]+(?:\.[\w$]+)*\s*\(/.exec(rest);
    if (!head) continue;
    const open = i + head[0].length - 1;
    const end = skipBalanced(source, open);
    if (end < 0) continue;
    const tail = /^\s*\)\s*\.\s*([\w$]+)\s*\(/.exec(source.slice(end, end + 80));
    if (!tail) continue;
    const line = source.slice(0, b).split("\n").length;
    hits.push({ index: b, annotStart: m.index, annotEnd: m.index + m[0].length, line, method: tail[1], snippet: source.slice(b, b + 110).replace(/\s+/g, " ") });
  }
  return hits;
}

// Methods whose only effect is their return value: losing the discarded statement loses nothing.
const PURE_RESULT_METHODS = new Set(["test", "toISOString", "toLocaleDateString", "toLocaleTimeString", "toLocaleString", "toString", "getTime"]);

module.exports = { findPureChainedStatements, PURE_RESULT_METHODS };

if (require.main === module) {
  const root = process.argv[2];
  const out = [];
  const seen = new Set();
  (function walk(d) {
    let ents;
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const f = path.join(d, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) walk(f);
      else if (/\.(c|m)?js$/.test(e.name) && !/\.min\.|\.d\./.test(e.name)) {
        let st; try { st = fs.statSync(f); } catch { continue; }
        if (st.size > 15e6) continue;
        const real = fs.realpathSync(f);
        if (seen.has(real)) continue;
        seen.add(real);
        const src = fs.readFileSync(f, "utf8");
        if (!src.includes("PURE__")) continue;
        for (const h of findPureChainedStatements(src)) out.push(`${f}:${h.line}\t${h.method}\t${h.snippet}`);
      }
    }
  })(root);
  console.log(out.join("\n"));
}
