#!/usr/bin/env node
// scripts/check-no-retired-member-visibility-knob.mjs
//   node scripts/check-no-retired-member-visibility-knob.mjs [--self-test]
//
// THE RETIRED-KNOB GUARD (lane ASOF-REVOKE, 2026-10-21). Access ladder T-17 (2026-10-03) retired
// custom/member_default_visibility: iam.member_lane_open always answers true, so every member opens
// every Organization record whatever the knob says (lists hide, they never lock). A test that
// writes the knob to make "membership shows nothing" is testing a rule that no longer exists:
// asof_green 3b read a working revoke as a broken one for 18 days because of it. To test what a
// SHARE alone conveys, keep the person OUTSIDE the organization (asof_green, asof_red).
//
// Fails (exit 1) when a campaign suite names the knob as a quoted literal ('member_default_visibility',
// the shape every write takes) and is not in the shrink-only baseline
// scripts/retired-member-visibility-knob-baseline.json, or when a baseline entry no longer writes it
// (remove it: the list only shrinks). `--self-test` plants a writer and proves it red, then green.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;
const BASELINE = "scripts/retired-member-visibility-knob-baseline.json";
const NEEDLE = /'member_default_visibility'/;

function writers(files) {
  return files.filter((f) => NEEDLE.test(readFileSync(ROOT + f, "utf8"))).sort();
}

function judge(found, baseline) {
  const base = new Set(baseline);
  const have = new Set(found);
  const added = found.filter((f) => !base.has(f));
  const stale = baseline.filter((f) => !have.has(f));
  return { added, stale };
}

function report({ added, stale }) {
  for (const f of added) console.error(`NEW WRITER  ${f}: writes the retired knob custom/member_default_visibility. Keep the person outside the organization instead (see asof_green.sql).`);
  for (const f of stale) console.error(`STALE BASELINE  ${f}: no longer writes the knob; remove it from ${BASELINE}.`);
  return added.length + stale.length;
}

const baseline = JSON.parse(readFileSync(ROOT + BASELINE, "utf8")).files;

if (process.argv.includes("--self-test")) {
  const planted = judge([...baseline, "scripts/campaign-tests/planted_writer.sql"].sort(), baseline);
  if (planted.added.length !== 1) { console.error("SELF-TEST FAILED: a planted writer was not named"); process.exit(1); }
  const shrunk = judge(baseline.slice(1), baseline);
  if (shrunk.stale.length !== 1) { console.error("SELF-TEST FAILED: a removed writer left the baseline unflagged"); process.exit(1); }
  if (judge(baseline, baseline).added.length || judge(baseline, baseline).stale.length) { console.error("SELF-TEST FAILED: the baseline does not judge itself clean"); process.exit(1); }
  console.log("SELF-TEST PASSED: planted writer RED, removed writer RED (stale), baseline GREEN.");
  process.exit(0);
}

const tracked = execFileSync("git", ["ls-files", "scripts/campaign-tests"], { cwd: ROOT, encoding: "utf8" })
  .trim().split("\n").filter(Boolean);
const n = report(judge(writers(tracked), baseline));
if (n) process.exit(1);
console.log(`OK: no new writer of the retired knob; ${baseline.length} baseline suite(s) left to sweep.`);
