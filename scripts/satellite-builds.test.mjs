// Satellite rule: build on own-page change, age >= max, [all-sites], or no record; otherwise skip.
import assert from "node:assert/strict";
import { test } from "node:test";
import { decide, ownTrees } from "./satellite-builds.mjs";

const trees = ["app/(admin)=abc"];
const now = 1_000_000_000_000;
const state = (minAgo, t = trees) => ({ trees: t, builtAt: now - minAgo * 60000, sha: "deadbeef00" });

test("skips when own pages are unchanged and the last build is fresh", () =>
  assert.equal(decide({ target: "admin", trees, state: state(20), now }).build, false));
test("builds when own pages changed", () =>
  assert.equal(decide({ target: "admin", trees, state: state(5, ["app/(admin)=old"]), now }).build, true));
test("builds once the last build is an hour old", () =>
  assert.equal(decide({ target: "admin", trees, state: state(60), now }).build, true));
test("builds with no record", () => assert.equal(decide({ target: "demos", trees, state: null, now }).build, true));
test("[all-sites] always builds", () =>
  assert.equal(decide({ target: "lab", trees, state: state(1), now, message: "release-all: v1 [all-sites]" }).build, true));
test("main is never a satellite", () => assert.equal(decide({ target: "main", trees, state: state(1), now }).build, true));
test("tree ids come from git, one per own folder", () =>
  assert.deepEqual(ownTrees("demos", (args) => `tree:${args[1]}`), ["app/(dev)=tree:HEAD:app/(dev)"]));
