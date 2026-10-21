#!/usr/bin/env node
/**
 * THERE IS ONE SETTINGS ROW — `pnpm check:one-settings-row` (+ `--self-test`).
 *
 * Owner, 2026-10-21, looking at the chat's "Model and overrides": "these are absolutely not our
 * settings components … this thing needs to directly load the proper components that are like the
 * ones in the agent builder so the user has a single experience across the entire app." Every
 * place a model's settings are changed renders `@ai-matrx/agents/settings/react`
 * `ModelSettingsPanel` over a `SettingsWriteTarget` (the builder: `AgentSettingsCore`; every
 * override screen: `@ai-matrx/chat` `ConversationModelSettings`). A hand-built row around the
 * shared control is how the fake panel happened, so this fails on:
 *
 *   1. a file outside the panel's own package folder importing `SettingControlInput` or
 *      `InputCapabilitiesEditor` (the row's parts) — render the panel instead;
 *   2. a re-casing helper or a private row-button class (`sentenceCaseLabel`, `ROW_ICON_BUTTON`);
 *   3. an import of the deleted hand-built panels (`RunConfigOverrides`, `RunInputCapabilities`).
 *
 * Scans matrx-frontend (features, components, app, lib, providers) and, when the sibling checkout
 * is present, every `aidream/apps/shared/*` package source. ALLOW names a file with its reason.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const SHARED = path.resolve(REPO, "..", "aidream", "apps", "shared");

/** The panel's own folder may use its parts. */
const OWNER = /matrx-agents\/settings\/react\//;

const ALLOW = new Map([
  [
    "features/mandates/overrides-simple/MandateOverridesSimple.tsx",
    "Arman's 2026-09-24 mandate-overrides design (agent value read-only + Override per row) predates the one-panel ruling; whether it moves onto ModelSettingsPanel is his call.",
  ],
]);

const PART_IMPORT =
  /(?:import|export)\s*(?:type\s*)?\{[^}]*\b(SettingControlInput|InputCapabilitiesEditor)\b[^}]*\}\s*from\s*["']@ai-matrx\/agents\/settings\/react["']/s;
const PRIVATE_ROW = /\b(?:function|const|let)\s+(sentenceCaseLabel|ROW_ICON_BUTTON)\b/;
const DELETED_PANEL = /from\s*["'][^"']*\/(RunConfigOverrides|RunInputCapabilities)["']/;

export function judge(rel, source) {
  if (OWNER.test(rel) || ALLOW.has(rel)) return [];
  const found = [];
  const part = source.match(PART_IMPORT);
  if (part) found.push(`imports ${part[1]} — render ModelSettingsPanel (or ConversationModelSettings) instead`);
  const own = source.match(PRIVATE_ROW);
  if (own) found.push(`defines ${own[1]} — a private settings row; the catalog label and the panel's row are the only ones`);
  const gone = source.match(DELETED_PANEL);
  if (gone) found.push(`imports the deleted ${gone[1]} — use ConversationModelSettings`);
  return found;
}

const SKIP_DIR = new Set(["node_modules", "dist", ".next", ".git", ".wt", "coverage", "__fixtures__"]);

function* walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIR.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(tsx?|mjs)$/.test(entry.name) && !/\.test\.|\.spec\./.test(entry.name)) yield full;
  }
}

function scan(roots) {
  const failures = [];
  for (const [root, label] of roots) {
    for (const file of walk(root)) {
      const rel = path.relative(label === "frontend" ? REPO : path.dirname(SHARED), file).split(path.sep).join("/");
      for (const reason of judge(rel, fs.readFileSync(file, "utf8"))) failures.push(`${rel}: ${reason}`);
    }
  }
  return failures;
}

function selfTest() {
  const cases = [
    ["features/x/Row.tsx", 'import { SettingControlInput } from "@ai-matrx/agents/settings/react";', true],
    ["chat/src/a/Caps.tsx", 'import {\n  InputCapabilitiesEditor,\n} from "@ai-matrx/agents/settings/react";', true],
    ["chat/src/a/Panel.tsx", "export function sentenceCaseLabel(label: string) { return label; }", true],
    ["chat/src/a/Panel.tsx", 'const ROW_ICON_BUTTON = "h-7 w-7";', true],
    ["features/y/Old.tsx", 'import { RunConfigOverrides } from "@ai-matrx/chat/agents/components/run-controls/RunConfigOverrides";', true],
    ["features/y/Ok.tsx", 'import { ModelSettingsPanel } from "@ai-matrx/agents/settings/react";', false],
    ["apps/shared/matrx-agents/settings/react/ModelSettingsPanel.tsx", 'import { SettingControlInput } from "@ai-matrx/agents/settings/react";', false],
    ["features/mandates/overrides-simple/MandateOverridesSimple.tsx", 'import { SettingControlInput } from "@ai-matrx/agents/settings/react";', false],
  ];
  let bad = 0;
  for (const [rel, src, red] of cases) {
    const got = judge(rel, src).length > 0;
    if (got !== red) {
      bad += 1;
      console.error(`self-test: ${rel} expected ${red ? "RED" : "GREEN"}, got ${got ? "RED" : "GREEN"}`);
    }
  }
  // And the walker finds a planted file on disk.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "one-settings-row-"));
  fs.writeFileSync(path.join(tmp, "Planted.tsx"), "const ROW_ICON_BUTTON = 1;\n");
  const planted = [...walk(tmp)].length === 1 && judge("x/Planted.tsx", fs.readFileSync(path.join(tmp, "Planted.tsx"), "utf8")).length === 1;
  fs.rmSync(tmp, { recursive: true, force: true });
  if (!planted) {
    bad += 1;
    console.error("self-test: the walker missed a planted file");
  }
  if (bad) process.exit(1);
  console.log(`check-one-settings-row self-test: ${cases.length + 1} cases, each rule goes red and the allowed homes stay green`);
}

if (process.argv.includes("--self-test")) {
  selfTest();
} else {
  const roots = ["features", "components", "app", "lib", "providers"].map((d) => [path.join(REPO, d), "frontend"]);
  if (fs.existsSync(SHARED)) {
    for (const pkg of fs.readdirSync(SHARED, { withFileTypes: true })) {
      if (pkg.isDirectory()) roots.push([path.join(SHARED, pkg.name), "shared"]);
    }
  }
  const failures = scan(roots);
  if (failures.length) {
    console.error(`check-one-settings-row: ${failures.length} settings row(s) outside THE model-settings panel:`);
    for (const line of failures) console.error(`  ${line}`);
    process.exit(1);
  }
  console.log("check-one-settings-row: every model-settings surface renders ModelSettingsPanel");
}
