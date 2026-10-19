#!/usr/bin/env node
// scripts/check-wired-features.mjs — a feature that worked before the catalog never calls the catalog door.
//
// Reads the wired-features registry's JSON export (aidream: services/tool_calls/wired_features.json, written by
// `python -m aidream.services.tool_calls.wired_features --json`) and fails when any listed client file names the
// catalog door (`/tools/calls`) or the catalog run-form. A `converting` entry is reported pending, never green.
//
//   pnpm check:wired-features              scan (exit 1 on a finding)
//   pnpm check:wired-features --self-test  prove it fails on a planted door call and passes without one
//   WIRED_FEATURES_JSON=/path/to/export.json overrides the default sibling-checkout path.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_JSON = resolve(ROOT, "../aidream/aidream/services/tool_calls/wired_features.json");
const SUFFIXES = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"]);

export function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
}

const under = (rel, prefixes) => prefixes.some((p) => rel === p || rel.startsWith(p.replace(/\/$/, "") + "/"));

function walk(abs, out = []) {
  if (!existsSync(abs)) return out;
  const st = statSync(abs);
  if (st.isFile()) return out.push(abs), out;
  for (const name of readdirSync(abs)) {
    if (name === "node_modules" || name === ".next") continue;
    walk(join(abs, name), out);
  }
  return out;
}

export function violations(root, spec) {
  const out = [];
  const native = spec.catalog_native_client_paths ?? [];
  for (const f of spec.features) {
    if (f.status !== "active") continue;
    for (const p of f.client_paths) {
      for (const abs of walk(join(root, p))) {
        const rel = relative(root, abs).split("\\").join("/");
        const ext = rel.slice(rel.lastIndexOf("."));
        if (!SUFFIXES.has(ext) || under(rel, f.client_exclude) || under(rel, native)) continue;
        const text = stripComments(readFileSync(abs, "utf8"));
        for (const m of spec.client_door_markers) if (text.includes(m)) out.push(`${f.id}: ${rel} names ${m}`);
      }
    }
  }
  return out;
}

function selfTest() {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require_fs();
  const dir = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "wired-"));
  try {
    mkdirSync(join(dir, "features/crm"), { recursive: true });
    const spec = {
      client_door_markers: ["/tools/calls", "useToolRunForm"],
      catalog_native_client_paths: [],
      features: [{ id: "crm.email_finding", status: "active", client_paths: ["features/crm"], client_exclude: [] },
                 { id: "pending.one", status: "converting", client_paths: ["features/crm"], client_exclude: [] }],
    };
    const file = join(dir, "features/crm/Card.tsx");
    writeFileSync(file, '// "/tools/calls" in a comment is ignored\nconst r = await post("/tools/calls", b);\n');
    const red = violations(dir, spec);
    writeFileSync(file, 'const r = await post("/crm/enrichment/bulk/run", b);\n');
    const green = violations(dir, spec);
    if (red.length !== 1 || green.length !== 0) {
      console.error(`self-test FAILED: planted=${JSON.stringify(red)} (want 1), clean=${JSON.stringify(green)} (want 0)`);
      process.exit(1);
    }
    console.log("self-test ok: planted catalog-door call caught, clean file and a converting entry pass");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

import * as fs from "node:fs";
function require_fs() { return fs; }

if (process.argv.includes("--self-test")) {
  selfTest();
} else if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = process.env.WIRED_FEATURES_JSON ?? DEFAULT_JSON;
  if (!existsSync(path)) {
    console.error(`check:wired-features: registry export not found at ${path}. Generate it in aidream: python -m aidream.services.tool_calls.wired_features --json`);
    process.exit(1);
  }
  const spec = JSON.parse(readFileSync(path, "utf8"));
  const bad = violations(ROOT, spec);
  const pending = spec.features.filter((f) => f.status !== "active");
  for (const f of pending) console.log(`PENDING ${f.id}: ${f.pending_reason}`);
  if (bad.length) {
    console.error(`check:wired-features FAILED: a feature that worked before the catalog calls the catalog door:\n  ${bad.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`check:wired-features ok: ${spec.features.length - pending.length} active features clean, ${pending.length} pending`);
}
