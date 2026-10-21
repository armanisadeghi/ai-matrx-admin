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
 *   1. a file outside the panel's own package folder importing the row's parts
 *      (`SettingControlInput`, `InputCapabilitiesEditor`, `ExtraSettingRow`, `SettingsGroupSection`)
 *      — render the panel instead;
 *   2. a re-casing helper or a private row-button class (`sentenceCaseLabel`, `ROW_ICON_BUTTON`);
 *   3. an import of the deleted hand-built panels (`RunConfigOverrides`, `RunInputCapabilities`);
 *   4. a component (`.tsx`) outside the settings package that builds the rows itself — calls
 *      `buildSettingsRows(` / `extraSettingKeys(` or walks `SETTINGS_CATALOGUE`, whatever its rows
 *      are called;
 *   5. a component that borrows the panel's row geometry (`SettingRowFrame` / `SettingRowLabel`)
 *      without rendering `<ModelSettingsPanel` itself — the frame is for a panel's `renderRow`;
 *   6. a component that draws three or more of the catalog's own labels ("Max Output Tokens",
 *      "Stop Sequences" …, read from the settings catalog) beside a checkbox, switch, slider,
 *      input or select, and renders neither `<ModelSettingsPanel` nor `<ConversationModelSettings`
 *      — a hand-built settings row by any name.
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

/** The settings package (the catalog, the panel and its parts) is the one home of a row. */
const OWNER = /matrx-agents\/settings\//;

const ALLOW = new Map([
  [
    "features/ai-models/components/ConstraintsEditor.tsx",
    "A model-constraint editor: it names parameters a constraint refers to (a field picker), it never edits a setting's value.",
  ],
]);

const PART_IMPORT =
  /(?:import|export)\s*(?:type\s*)?\{[^}]*\b(SettingControlInput|InputCapabilitiesEditor|ExtraSettingRow|SettingsGroupSection)\b[^}]*\}\s*from\s*["']@ai-matrx\/agents\/settings\/react["']/s;
const PRIVATE_ROW = /\b(?:function|const|let)\s+(sentenceCaseLabel|ROW_ICON_BUTTON)\b/;
const DELETED_PANEL = /from\s*["'][^"']*\/(RunConfigOverrides|RunInputCapabilities)["']/;
const ROWS_BY_HAND = /\b(buildSettingsRows|extraSettingKeys)\s*\(|\bSETTINGS_CATALOGUE\b/;
const ROW_FRAME = /\b(SettingRowFrame|SettingRowLabel)\b/;
const RENDERS_PANEL = /<ModelSettingsPanel\b/;
const RENDERS_ANY_PANEL = /<(ModelSettingsPanel|ConversationModelSettings|StoredModelOverridesField)\b/;
const CONTROL_JSX = /<(Checkbox|Switch|Slider|Input|Textarea|Select|Field)\b/;

/** The catalog's multi-word labels ("Max Output Tokens"), read from the settings catalog itself. */
export function catalogLabels() {
  const sources = [
    path.join(SHARED, "matrx-agents", "settings", "settings-catalogue.ts"),
    path.join(REPO, "node_modules", "@ai-matrx", "agents", "dist", "settings", "index.js"),
  ];
  for (const file of sources) {
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const labels = [...text.matchAll(/key:\s*"[^"]+",\s*label:\s*"([^"]+)"/g)].map((m) => m[1]).filter((l) => l.includes(" "));
    if (labels.length) return [...new Set(labels)];
  }
  throw new Error("check-one-settings-row: the settings catalog was not found (sibling aidream or installed @ai-matrx/agents)");
}

let LABELS = null;
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function judge(rel, source, labels = (LABELS ??= catalogLabels())) {
  if (OWNER.test(rel) || ALLOW.has(rel)) return [];
  const found = [];
  const part = source.match(PART_IMPORT);
  if (part) found.push(`imports ${part[1]} — render ModelSettingsPanel (or ConversationModelSettings) instead`);
  const own = source.match(PRIVATE_ROW);
  if (own) found.push(`defines ${own[1]} — a private settings row; the catalog label and the panel's row are the only ones`);
  const gone = source.match(DELETED_PANEL);
  if (gone) found.push(`imports the deleted ${gone[1]} — use ConversationModelSettings`);
  if (!rel.endsWith(".tsx")) return found;
  const byHand = source.match(ROWS_BY_HAND);
  if (byHand) found.push(`builds settings rows itself (${byHand[1] ?? "SETTINGS_CATALOGUE"}) — render ModelSettingsPanel, which draws every row`);
  const frame = source.match(ROW_FRAME);
  if (frame && !RENDERS_PANEL.test(source)) {
    found.push(`uses ${frame[1]} without rendering <ModelSettingsPanel — the row frame is only for a panel's renderRow`);
  }
  if (CONTROL_JSX.test(source) && !RENDERS_ANY_PANEL.test(source)) {
    const named = labels.filter((label) => new RegExp(`["'>\`]\\s*${escape(label)}\\s*["'<\`]`).test(source));
    if (named.length >= 3) {
      found.push(`draws the catalog's labels (${named.slice(0, 3).join(", ")}…) beside its own controls — a hand-built settings row; render ModelSettingsPanel`);
    }
  }
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
    // The former allowlist entry: a mandate's overrides go through the one panel now.
    ["features/mandates/overrides-simple/MandateOverridesSimple.tsx", 'import { SettingControlInput } from "@ai-matrx/agents/settings/react";', true],
    ["features/z/Rows.tsx", 'import { ExtraSettingRow } from "@ai-matrx/agents/settings/react";', true],
    // 4: rows built by hand, whatever they are called.
    ["features/z/MyKnobs.tsx", "const groups = buildSettingsRows(controls, values);\nreturn <div>{groups.map(g => g.label)}</div>;", true],
    ["chat/src/z/Extras.tsx", "const { translated } = extraSettingKeys(controls, values);", true],
    ["features/z/Walk.tsx", "SETTINGS_CATALOGUE.map((g) => <Row key={g.id} />)", true],
    ["features/z/rules.ts", "const { translated } = extraSettingKeys(controls, values);", false],
    // 5: the row frame outside a panel's renderRow.
    ["features/z/Frame.tsx", 'import { SettingRowFrame } from "@ai-matrx/agents/settings/react";\n<SettingRowFrame rowKey="x" label="X" />', true],
    ["features/z/Builder.tsx", 'import { SettingRowFrame } from "@ai-matrx/agents/settings/react";\n<ModelSettingsPanel renderRow={() => <SettingRowFrame rowKey="x" label="X" />} />', false],
    // 6: a differently-named hand-built row: catalog labels beside its own controls.
    ["features/z/TuningPanel.tsx", '<Label>Max Output Tokens</Label><Input /><Label>Stop Sequences</Label><Textarea /><Label>Reasoning Effort</Label><Select />', true],
    ["features/z/TuningPanel.tsx", '<Label>Max Output Tokens</Label><Input /><Label>Stop Sequences</Label>', false],
    ["features/z/Host.tsx", '<ConversationModelSettings conversationId="c" /><Switch /> "Max Output Tokens" "Stop Sequences" "Reasoning Effort"', false],
    ["features/ai-models/components/ConstraintsEditor.tsx", '<Select /> "Max Output Tokens" "Stop Sequences" "Reasoning Effort"', false],
  ];
  let bad = 0;
  const labels = catalogLabels();
  if (!labels.includes("Max Output Tokens") || !labels.includes("Stop Sequences")) {
    bad += 1;
    console.error("self-test: the catalog labels were not read from the settings catalog");
  }
  for (const [rel, src, red] of cases) {
    const got = judge(rel, src, labels).length > 0;
    if (got !== red) {
      bad += 1;
      console.error(`self-test: ${rel} expected ${red ? "RED" : "GREEN"}, got ${got ? "RED" : "GREEN"}`);
    }
  }
  // And the walker finds a planted file on disk.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "one-settings-row-"));
  fs.writeFileSync(path.join(tmp, "Planted.tsx"), "const ROW_ICON_BUTTON = 1;\n");
  const planted = [...walk(tmp)].length === 1 && judge("x/Planted.tsx", fs.readFileSync(path.join(tmp, "Planted.tsx"), "utf8"), labels).length === 1;
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
