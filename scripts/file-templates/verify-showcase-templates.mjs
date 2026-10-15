/** Verify every imported snapshot against the installed open-source model plugins. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Univer, LocaleType, UniverInstanceType, IResourceManagerService } from "@univerjs/core";
import { UniverSheetsPlugin } from "@univerjs/sheets";
import { UniverDocsPlugin } from "@univerjs/docs";
import { UniverDataValidationPlugin } from "@univerjs/data-validation";
import { UniverSheetsDataValidationPlugin } from "@univerjs/sheets-data-validation";
import { UniverSheetsConditionalFormattingPlugin } from "@univerjs/sheets-conditional-formatting";
import { UniverSheetsFilterPlugin } from "@univerjs/sheets-filter";

const templates = JSON.parse(readFileSync(new URL("../../features/templates/files/seeds/univer-showcase-templates.json", import.meta.url), "utf8"));
assert.equal(templates.length, 22);
assert.equal(new Set(templates.map(t => t.seedKey)).size, templates.length);
for (const t of templates) {
  assert(t.sortOrder < 0, `${t.name}: curated showcase must precede the original seeds`);
  assert(t.metadata.source_url.startsWith("https://office.univer.ai/showcase/"));
  assert(!t.snapshot.resources.some(r => /PROTECTION|AuthzIoMockService|OBJECT_PERMISSION/.test(r.name)), `${t.name}: demo-owner locks must not follow installed copies`);
  const create = () => {
    const u = new Univer({ locale: LocaleType.EN_US, locales: {} });
    for (const plugin of t.kind === "workbook"
      ? [UniverSheetsPlugin, UniverDataValidationPlugin, UniverSheetsDataValidationPlugin, UniverSheetsConditionalFormattingPlugin, UniverSheetsFilterPlugin]
      : [UniverDocsPlugin]) u.registerPlugin(plugin);
    return u;
  };
  const first = create();
  const unit = first.createUnit(t.kind === "workbook" ? UniverInstanceType.UNIVER_SHEET : UniverInstanceType.UNIVER_DOC, structuredClone(t.snapshot));
  const resources = first.__getInjector().get(IResourceManagerService).getResources(t.snapshot.id);
  for (const r of t.snapshot.resources.filter(r => !["{}", "[]", "", "null"].includes(r.data))) {
    const saved = resources.find(s => s.name === r.name);
    assert(saved, `${t.name}: ${r.name} has no registered free plugin`);
    assert.deepEqual(JSON.parse(saved.data), JSON.parse(r.data), `${t.name}: ${r.name} lost source rules`);
  }
  const saved = { ...unit.getSnapshot(), resources };
  const second = create();
  const restored = second.createUnit(t.kind === "workbook" ? UniverInstanceType.UNIVER_SHEET : UniverInstanceType.UNIVER_DOC, structuredClone(saved)).getSnapshot();
  if (t.kind === "workbook") {
    assert.deepEqual(restored.sheetOrder, t.snapshot.sheetOrder);
    for (const id of t.snapshot.sheetOrder) {
      for (const key of ["cellData", "mergeData", "columnData", "rowData", "freeze"]) {
        assert.deepEqual(restored.sheets[id][key], t.snapshot.sheets[id][key], `${t.name}: ${id}.${key} changed on save/reload`);
      }
    }
  } else {
    assert.deepEqual(restored.body, t.snapshot.body, `${t.name}: document content changed on save/reload`);
    assert.deepEqual(restored.headers, t.snapshot.headers);
    assert.deepEqual(restored.footers, t.snapshot.footers);
  }
  first.dispose();
  second.dispose();
  console.log(`verified ${t.kind}: ${t.name}`);
}
console.log("22 native templates survive save/reload with their free add-on resources.");
process.exit(0);
