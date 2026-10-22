// The stalled-compile watchdog in next-build-stable-env.mjs: run `pnpm test:compile-watchdog`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runNext } from "./next-build-stable-env.mjs";

// A stand-in `next build`: prints Turbopack's compile-start line, then either hangs (the
// 2026-10-22 deadlock) or finishes the compile the way a healthy build does.
const hangs = ["-e", "console.log('Creating an optimized production build ...'); setInterval(() => {}, 1000);"];
const compiles = [
  "-e",
  "console.log('Creating an optimized production build ...'); setTimeout(() => { console.log('Compiled successfully in 7.4min'); }, 300);",
];

test("kills a compile that never finishes and reports the stall", async () => {
  const result = await runNext(process.execPath, hangs, { watchdog: true, stallMs: 500 });
  assert.equal(result.stalled, true);
  assert.notEqual(result.code, 0);
});

test("leaves a compile that finishes alone", async () => {
  const result = await runNext(process.execPath, compiles, { watchdog: true, stallMs: 1_000 });
  assert.deepEqual(result, { code: 0, stalled: false });
});

test("never fires when the watchdog is off (local agent builds)", async () => {
  const result = await runNext(process.execPath, compiles, { watchdog: false, stallMs: 50 });
  assert.deepEqual(result, { code: 0, stalled: false });
});

test("matches an end-of-compile line split across two pipe reads", async () => {
  // Two separate writes, 100 ms apart, so the line reaches the parent in two chunks.
  const split = [
    "-e",
    "console.log('Creating an optimized production build ...'); process.stdout.write('✓ Compiled succ'); setTimeout(() => { process.stdout.write('essfully in 7.4min\\n'); setTimeout(() => {}, 900); }, 100);",
  ];
  const result = await runNext(process.execPath, split, { watchdog: true, stallMs: 600 });
  assert.deepEqual(result, { code: 0, stalled: false });
});
