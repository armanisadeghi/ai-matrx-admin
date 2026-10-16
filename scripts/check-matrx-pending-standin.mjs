#!/usr/bin/env node
// The dev-server stand-in for an unpublished @ai-matrx name (lib/turbopack/matrx-pending.js) must
// never hang the page. 2026-10-16: notes imported @ai-matrx/kit/working-copy before kit published
// it; the note's text became a stand-in, content-ir's line scan looped on `text.indexOf("\n")`
// (every call answers another stand-in, never -1) and the tab's renderer died of memory on every
// note open. This drives that exact loop shape against the real stand-in and requires a loud throw
// within a bounded number of steps.
//
//   node scripts/check-matrx-pending-standin.mjs
import { matrxPending } from "../lib/turbopack/matrx-pending.js";

const CAP = 2_000_000; // far past the stand-in's budget; reaching it means the loop would run forever
const info = { file: "features/notes/x.ts", line: 1, specifier: "@ai-matrx/kit/working-copy", pkg: "@ai-matrx/kit", version: "0.45.3", source: "0.45.0" };

const realError = console.error;
console.error = () => {};
let failures = [];
try {
  // content-ir scan(): split lines until indexOf answers -1.
  const text = matrxPending(info, "defineWorkingCopyKind")().entry().value;
  let steps = 0;
  let thrown = null;
  try {
    const starts = [];
    for (let pos = 0; ; ) {
      const nl = text.indexOf("\n", pos);
      starts.push(pos);
      if (nl === -1) break;
      pos = nl + 1;
      if (++steps >= CAP) break;
    }
  } catch (err) {
    thrown = err;
  }
  if (!thrown) failures.push(`a loop over a stand-in ran ${steps} steps without a throw (would hang the renderer)`);
  else if (!/matrx-pending/.test(String(thrown.message))) failures.push(`threw, but not the stand-in's own error: ${thrown.message}`);

  // The budget resets once the page yields, so ordinary use after a refused loop still works.
  await new Promise((r) => setTimeout(r, 5));
  try {
    const again = matrxPending(info, "useThing")();
    void again.rows.filter;
  } catch (err) {
    failures.push(`ordinary stand-in use after a yield threw: ${err.message}`);
  }
} finally {
  console.error = realError;
}

if (failures.length) {
  console.error("check-matrx-pending-standin FAILED:\n  - " + failures.join("\n  - "));
  process.exitCode = 1;
} else {
  console.log("check-matrx-pending-standin OK — a loop over a stand-in throws a named [matrx-pending] error instead of hanging; normal use resumes after the page yields.");
}
