#!/usr/bin/env npx tsx
/**
 * Prints `scanKnobReads` (the ONE knob-read extractor the config attestation manifest and
 * `check:settings-unregistered` use) as JSON: `{ sites, dynamic }`.
 *
 *   npx tsx scripts/settings-guards/dump-knob-reads.ts            the whole frontend tree
 *   echo '[{"abs":"x","rel":"matrx-frontend/a.tsx","text":"…"}]' | npx tsx … --stdin   just those files
 *
 * It exists so a jest test can use the extractor without importing this ESM module (`import.meta`
 * cannot load under jest's CommonJS runtime on every Node).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { collectFrontend, ROOT, scanKnobReads, type KnobRow, type SourceFile } from "./lib";

const snapshot = JSON.parse(
  readFileSync(join(ROOT, "lib", "scoped-config", "knob-keys.snapshot.json"), "utf8"),
) as { knobs: [string, string][] };
const registry = snapshot.knobs.map(([feature, key]) => ({ feature, key }) as KnobRow);
const files: SourceFile[] = process.argv.includes("--stdin")
  ? (JSON.parse(readFileSync(0, "utf8")) as SourceFile[])
  : collectFrontend();
const { sites, dynamic } = scanKnobReads(files, registry, { strictConsts: true });
process.stdout.write(JSON.stringify({ sites, dynamic }));
