#!/usr/bin/env node
/**
 * check:univer-addons — the Univer add-ons (sort, filter, table, validation,
 * conditional formatting, find, links, images, notes, comments; docs links and
 * images) must be INSTALLED, REGISTERED, and what a person builds with them
 * must survive snapshot save -> load.
 *
 *   1. Every @univerjs/preset-sheets-* / preset-docs-* dependency is registered
 *      (`Univer…Preset()`) in the editor that owns it.
 *   2. A real Univer (the add-on model plugins at the installed version) loads
 *      a snapshot carrying validation, conditional formatting, filter and notes
 *      resources and hands the SAME data back on save. The workbook snapshot is
 *      what autosave, history and restore store, so this is the persistence
 *      contract.
 *
 * `--break=<plugin>` leaves one plugin out: the check MUST fail. The jest guard
 * runs both directions, so a check that cannot go red is itself red.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const breakArg = process.argv.find((a) => a.startsWith("--break="))?.slice(8);
const failures = [];
const fail = (m) => failures.push(m);

// ── 1. registered ───────────────────────────────────────────────────────────
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const presets = Object.keys(pkg.dependencies ?? {}).filter((d) => /^@univerjs\/preset-(sheets|docs)-/.test(d));
const owner = {
  sheets: readFileSync(join(root, "features/workbooks/components/WorkbookEditor.tsx"), "utf8"),
  docs: readFileSync(join(root, "features/documents/components/DocumentEditor.tsx"), "utf8"),
};
for (const dep of presets) {
  const kind = dep.includes("preset-sheets-") ? "sheets" : "docs";
  if (dep.endsWith("-core")) continue;
  const cls = "Univer" + dep.split("/preset-")[1].split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("") + "Preset";
  if (!owner[kind].includes(`import { ${cls} } from "${dep}"`)) fail(`${dep} is a dependency but ${cls} is not imported`);
  else if (!owner[kind].includes(`${cls}(`)) fail(`${cls} is imported but never registered`);
}
if (presets.length < 12) fail(`expected 12 add-on presets in package.json, found ${presets.length}`);

// ── 2. survives save -> load ────────────────────────────────────────────────
const core = await import("@univerjs/core");
const { Univer, LocaleType, UniverInstanceType, IResourceManagerService } = core;
const plugins = {
  sheets: (await import("@univerjs/sheets")).UniverSheetsPlugin,
  dataValidation: (await import("@univerjs/data-validation")).UniverDataValidationPlugin,
  sheetsDataValidation: (await import("@univerjs/sheets-data-validation")).UniverSheetsDataValidationPlugin,
  conditionalFormatting: (await import("@univerjs/sheets-conditional-formatting")).UniverSheetsConditionalFormattingPlugin,
  filter: (await import("@univerjs/sheets-filter")).UniverSheetsFilterPlugin,
  note: (await import("@univerjs/sheets-note")).UniverSheetsNotePlugin,
};
const univer = new Univer({ locale: LocaleType.EN_US, locales: {} });
for (const [name, plugin] of Object.entries(plugins)) if (name !== breakArg) univer.registerPlugin(plugin);

const range = (r, c, r2 = r, c2 = c) => ({ startRow: r, endRow: r2, startColumn: c, endColumn: c2 });
const resources = {
  SHEET_DATA_VALIDATION_PLUGIN: { s1: [{ uid: "v1", type: "list", formula1: "Open,Won,Lost", formula2: "", ranges: [range(1, 1, 4, 1)] }] },
  SHEET_CONDITIONAL_FORMATTING_PLUGIN: { s1: [{ cfId: "c1", ranges: [range(1, 2, 4, 2)], stopIfTrue: false, rule: { type: "highlightCell", subType: "number", operator: "greaterThan", value: 200, style: { bg: { rgb: "#ffd6d6" } } } }] },
  SHEET_FILTER_PLUGIN: { s1: { ref: range(0, 0, 4, 2), filterColumns: [] } },
  SHEET_NOTE_PLUGIN: { s1: { 0: { 0: { id: "n1", row: 0, col: 0, width: 160, height: 72, note: "Quarterly" } } } },
};
univer.createUnit(UniverInstanceType.UNIVER_SHEET, {
  id: "wb",
  sheetOrder: ["s1"],
  sheets: { s1: { id: "s1", name: "Budget", cellData: { 0: { 0: { v: "Region" } } } } },
  resources: Object.entries(resources).map(([name, v]) => ({ name, data: JSON.stringify(v) })),
});
const saved = univer.__getInjector().get(IResourceManagerService).getResources("wb") ?? [];
const needles = {
  SHEET_DATA_VALIDATION_PLUGIN: "Open,Won,Lost",
  SHEET_CONDITIONAL_FORMATTING_PLUGIN: "greaterThan",
  SHEET_FILTER_PLUGIN: '"endColumn":2',
  SHEET_NOTE_PLUGIN: "Quarterly",
};
for (const [name, needle] of Object.entries(needles)) {
  const data = saved.find((r) => r.name === name)?.data ?? "";
  if (!data.includes(needle)) fail(`${name}: what was loaded did not come back on save`);
}

if (failures.length) {
  console.error("[check:univer-addons] FAIL\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log(`[check:univer-addons] OK — ${presets.length - 2} add-on presets registered; validation, conditional formatting, filter and notes survive save -> load`);
process.exit(0);
