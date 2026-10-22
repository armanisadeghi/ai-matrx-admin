/** @jest-environment jsdom */
import { createUniver, LocaleType, mergeLocales } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import sheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";
import { writeFileSync } from "node:fs";

(globalThis as any).MessageChannel = require("node:worker_threads").MessageChannel;
it("probe", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const out: string[] = [];
  try {
    const { univer, univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: { [LocaleType.EN_US]: mergeLocales(sheetsCoreEnUS) },
      presets: [UniverSheetsCorePreset({ container })],
    });
    const wb = univerAPI.createWorkbook({ id: "u1", sheetOrder: ["s1"], sheets: { s1: { id: "s1", name: "Sheet1", rowCount: 30, columnCount: 8, cellData: { 4: { 0: { v: 1 } }, 5: { 0: { v: 2 } }, 6: { 0: { v: 3 } }, 7: { 1: { f: "=SUM(A5:A7)" }, 2: { f: "=A6*10" } } } } } } as never);
    const ws = wb.getActiveSheet();
    ws.getRange(7, 3).setValue({ f: "=A6*2" } as never);
    await new Promise((r) => setTimeout(r, 300));
    ws.setActiveRange(ws.getRange(5, 0));
    const r = await univerAPI.executeCommand("sheet.command.insert-row-before", { value: 1 });
    out.push("insert " + r);
    await new Promise((r) => setTimeout(r, 300));
    out.push(JSON.stringify(wb.save().sheets.s1.cellData));
    const inj = (univer as any).__getInjector();
    const { IFormulaDataModel } = require("@univerjs/engine-formula");
    out.push("formulaData " + JSON.stringify(inj.get(IFormulaDataModel).getFormulaData()));
    out.push("current " + inj.get(require("@univerjs/core").IUniverInstanceService).getCurrentUnitOfType(2)?.getUnitId());
  } catch (e) { out.push("ERR " + String((e as Error).stack).slice(0, 800)); }
  writeFileSync("/private/tmp/claude-501/-Users-armanisadeghi-code/9bebd132-b256-460e-938e-501370a8709a/scratchpad/w/out2.txt", out.join("\n"));
}, 120000);
