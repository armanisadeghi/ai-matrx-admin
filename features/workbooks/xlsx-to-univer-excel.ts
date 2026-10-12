/**
 * Full-fidelity .xlsx -> Univer reader (ExcelJS). The inverse of
 * `univer-to-xlsx.ts`: styles, number formats, column widths, row heights,
 * frozen panes, merges, data validation, conditional formatting, the filter
 * range, notes, cell links and pictures. Free of Univer runtime imports (enums
 * are numbers) so it runs under tests as well as in the browser.
 */

import type { IWorkbookData } from "@univerjs/core";
import { loadExcelJs, type ExcelJSTypes } from "@ai-matrx/print/xlsx-styled";
import {
  H_ALIGN_IN,
  RESOURCE,
  V_ALIGN_IN,
  argbToColor,
  borderFromExcel,
  colCharsToPx,
  parseA1Range,
  rowPtToPx,
  writeResource,
  type RangeLike,
  type UniverResource,
} from "@/features/workbooks/xlsx-shared";

export type XlsxImportOptions = {
  /** Stores a picture and returns its file id; without it pictures are reported, not imported. */
  uploadImage?: (bytes: Uint8Array, extension: string) => Promise<string>;
  /** Called once per thing the file held that could not be carried. */
  onDropped?: (what: string) => void;
};

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- Univer resource payloads are untyped JSON

const THEME = ["FFFFFF", "000000", "E7E6E6", "44546A", "4472C4", "ED7D31", "A5A5A5", "FFC000", "5B9BD5", "70AD47"];
const colorOf = (c: Partial<ExcelJSTypes.Color> | undefined): string | undefined =>
  c?.argb ? argbToColor(c.argb) : typeof c?.theme === "number" && THEME[c.theme] ? `#${THEME[c.theme]!.toLowerCase()}` : undefined;

const rid = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2, 10)}`;
const sheetId = (name: string) => `${name.replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 32) || "sheet"}-${Math.random().toString(36).slice(2, 8)}`;

export async function importXlsxWithExcelJs(
  file: { name: string; arrayBuffer(): Promise<ArrayBuffer> },
  options: XlsxImportOptions = {},
): Promise<Partial<IWorkbookData>> {
  const ExcelJS = await loadExcelJs();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  const dropped = new Set<string>();
  const styles: Record<string, Json> = {};
  const styleIds = new Map<string, string>();
  const styleId = (st: Json): string => {
    const key = JSON.stringify(st);
    let id = styleIds.get(key);
    if (!id) {
      id = `s${styleIds.size + 1}`;
      styleIds.set(key, id);
      styles[id] = st;
    }
    return id;
  };

  const sheets: Record<string, Json> = {};
  const sheetOrder: string[] = [];
  const resources: UniverResource[] = [];
  const validation: Json = {};
  const conditional: Json = {};
  const filters: Json = {};
  const notes: Json = {};
  const drawings: Json = {};
  const unitId = `wb-${rid("")}`;

  for (const ws of wb.worksheets) {
    const id = sheetId(ws.name);
    sheetOrder.push(id);
    const cellData: Record<number, Record<number, Json>> = {};
    let maxR = 0;
    let maxC = 0;
    const sheetNotes: Json = {};

    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const r = rowNumber - 1;
        const c = colNumber - 1;
        const out = toCell(cell, styleId);
        if (out) {
          (cellData[r] ??= {})[c] = out;
          maxR = Math.max(maxR, r);
          maxC = Math.max(maxC, c);
        }
        const note = cell.note;
        const text = typeof note === "string" ? note : (note as Json | undefined)?.texts?.map((t: Json) => t.text).join("");
        if (text) {
          ((sheetNotes[r] ??= {}) as Json)[c] = { id: rid("n"), row: r, col: c, width: 160, height: 72, note: text, show: false };
        }
      });
    });
    if (Object.keys(sheetNotes).length) notes[id] = sheetNotes;

    const sheet: Json = {
      id,
      name: ws.name.slice(0, 31),
      cellData,
      rowCount: Math.max(maxR + 1, ws.rowCount, 100),
      columnCount: Math.max(maxC + 1, ws.columnCount, 26),
    };

    const tab = colorOf(ws.properties?.tabColor);
    if (tab) sheet.tabColor = tab;

    const merges = (ws.model as Json).merges as string[] | undefined;
    const mergeData = (merges ?? []).map((m) => parseA1Range(m)).filter((m): m is RangeLike => !!m);
    if (mergeData.length) {
      sheet.mergeData = mergeData;
      sheet.rowCount = Math.max(sheet.rowCount, ...mergeData.map((m) => m.endRow + 1));
      sheet.columnCount = Math.max(sheet.columnCount, ...mergeData.map((m) => m.endColumn + 1));
    }

    const columnData: Json = {};
    for (let c = 1; c <= Math.min(ws.columnCount, 2000); c++) {
      const col = ws.getColumn(c);
      if (typeof col.width === "number" || col.hidden) {
        columnData[c - 1] = {
          ...(typeof col.width === "number" ? { w: colCharsToPx(col.width) } : {}),
          ...(col.hidden ? { hd: 1 } : {}),
        };
      }
    }
    if (Object.keys(columnData).length) sheet.columnData = columnData;

    const rowData: Json = {};
    ws.eachRow({ includeEmpty: true }, (row, n) => {
      if (typeof row.height === "number" || row.hidden) {
        rowData[n - 1] = {
          ...(typeof row.height === "number" ? { h: rowPtToPx(row.height), hd: row.hidden ? 1 : 0 } : { hd: 1 }),
        };
      }
    });
    if (Object.keys(rowData).length) sheet.rowData = rowData;

    const view = ws.views?.[0] as Json | undefined;
    if (view?.state === "frozen" && (view.xSplit || view.ySplit)) {
      sheet.freeze = {
        xSplit: view.xSplit ?? 0,
        ySplit: view.ySplit ?? 0,
        startColumn: view.xSplit ?? 0,
        startRow: view.ySplit ?? 0,
      };
    }

    // ── data validation
    const dvModel = ((ws as Json).dataValidations as Json | undefined)?.model as Record<string, Json> | undefined;
    const rules = dataValidationRules(dvModel ?? {});
    if (rules.length) validation[id] = rules;

    // ── conditional formatting
    const cf = conditionalRules(((ws as Json).conditionalFormattings ?? []) as Json[], dropped);
    if (cf.length) conditional[id] = cf;

    // ── filter range
    const af = ws.autoFilter as ExcelJSTypes.AutoFilter | undefined;
    if (af) {
      const range =
        typeof af === "string"
          ? parseA1Range(af)
          : af.from && af.to
            ? {
                startRow: (af.from as Json).row - 1,
                startColumn: (af.from as Json).column - 1,
                endRow: (af.to as Json).row - 1,
                endColumn: (af.to as Json).column - 1,
              }
            : null;
      if (range) filters[id] = { ref: range, filterColumns: [] };
    }

    // ── pictures
    const images = ws.getImages();
    if (images.length) {
      if (!options.uploadImage) {
        dropped.add("Pictures in the file were not imported");
      } else {
        const data: Record<string, Json> = {};
        const order: string[] = [];
        for (const img of images) {
          try {
            const media = wb.getImage(Number(img.imageId)) as Json;
            const bytes = new Uint8Array(media.buffer as ArrayBuffer);
            const fileId = await options.uploadImage(bytes, String(media.extension ?? "png"));
            const tl = img.range.tl as Json;
            const ext = (img.range as Json).ext as Json | undefined;
            const br = img.range.br as Json | undefined;
            const width = ext?.width ?? ((br?.nativeCol ?? tl.nativeCol + 3) - tl.nativeCol) * 88;
            const height = ext?.height ?? ((br?.nativeRow ?? tl.nativeRow + 6) - tl.nativeRow) * 24;
            const drawingId = rid("img");
            const column = Math.floor(tl.nativeCol ?? tl.col);
            const rowIdx = Math.floor(tl.nativeRow ?? tl.row);
            data[drawingId] = {
              unitId,
              subUnitId: id,
              drawingId,
              drawingType: 0,
              imageSourceType: "URL",
              source: `matrx-file:${fileId}`,
              transform: { left: column * 88, top: rowIdx * 24, width, height, angle: 0 },
              sheetTransform: {
                from: { column, columnOffset: 0, row: rowIdx, rowOffset: 0 },
                to: { column: column + Math.max(1, Math.round(width / 88)), columnOffset: 0, row: rowIdx + Math.max(1, Math.round(height / 24)), rowOffset: 0 },
              },
            };
            order.push(drawingId);
          } catch {
            dropped.add("Some pictures could not be stored and were left out");
          }
        }
        if (order.length) drawings[id] = { data, order };
      }
    }

    if ((ws.getTables?.() ?? []).length) dropped.add("Excel tables became plain ranges (their data and styling are kept)");
    sheets[id] = sheet;
  }

  if (Object.keys(validation).length) writeResource(resources, RESOURCE.validation, validation);
  if (Object.keys(conditional).length) writeResource(resources, RESOURCE.conditional, conditional);
  if (Object.keys(filters).length) writeResource(resources, RESOURCE.filter, filters);
  if (Object.keys(notes).length) writeResource(resources, RESOURCE.note, notes);
  if (Object.keys(drawings).length) writeResource(resources, RESOURCE.drawing, drawings);

  for (const d of dropped) options.onDropped?.(d);

  return {
    id: unitId,
    sheetOrder,
    name: file.name.replace(/\.[^.]+$/, ""),
    appVersion: "1",
    locale: "enUS" as IWorkbookData["locale"],
    styles,
    sheets,
    resources,
  } as Partial<IWorkbookData>;
}

function toStyle(cell: ExcelJSTypes.Cell): Json | undefined {
  const st: Json = {};
  const f = cell.font;
  if (f) {
    if (f.name) st.ff = f.name;
    if (f.size) st.fs = f.size;
    if (f.bold) st.bl = 1;
    if (f.italic) st.it = 1;
    if (f.underline) st.ul = { s: 1 };
    if (f.strike) st.st = { s: 1 };
    const cl = colorOf(f.color);
    if (cl) st.cl = { rgb: cl };
  }
  const fill = cell.fill as Json | undefined;
  if (fill?.type === "pattern" && fill.pattern === "solid") {
    const bg = colorOf(fill.fgColor);
    if (bg) st.bg = { rgb: bg };
  }
  const al = cell.alignment;
  if (al) {
    if (al.horizontal && H_ALIGN_IN[al.horizontal]) st.ht = H_ALIGN_IN[al.horizontal];
    if (al.vertical && V_ALIGN_IN[al.vertical]) st.vt = V_ALIGN_IN[al.vertical];
    if (al.wrapText) st.tb = 3;
  }
  const bd = cell.border as Json | undefined;
  if (bd) {
    const out: Json = {};
    for (const [side, key] of [["top", "t"], ["bottom", "b"], ["left", "l"], ["right", "r"]] as const) {
      const s = borderFromExcel(bd[side]?.style);
      if (s) out[key] = { s, cl: { rgb: colorOf(bd[side]?.color) ?? "#000000" } };
    }
    if (Object.keys(out).length) st.bd = out;
  }
  if (cell.numFmt && cell.numFmt !== "General") st.n = { pattern: cell.numFmt };
  return Object.keys(st).length ? st : undefined;
}

const EXCEL_EPOCH_OFFSET_DAYS = 25569;

function toCell(cell: ExcelJSTypes.Cell, styleId: (s: Json) => string): Json | null {
  const out: Json = {};
  let st = toStyle(cell);
  const v = cell.value as unknown;
  const setNumber = (n: number) => {
    out.v = n;
    out.t = 2;
  };
  const apply = (value: unknown) => {
    if (value instanceof Date) {
      setNumber(value.getTime() / 86_400_000 + EXCEL_EPOCH_OFFSET_DAYS);
      st = { ...(st ?? {}), n: (st?.n as Json | undefined) ?? { pattern: "yyyy-mm-dd" } };
    } else if (typeof value === "number") setNumber(value);
    else if (typeof value === "boolean") {
      out.v = value ? 1 : 0;
      out.t = 3;
    } else if (typeof value === "string") {
      out.v = value;
      out.t = 1;
    } else if (value && typeof value === "object" && "error" in (value as Json)) {
      out.v = String((value as Json).error);
      out.t = 1;
    }
  };
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const o = v as Json;
    if ("formula" in o || "sharedFormula" in o) {
      const f = o.formula ?? o.sharedFormula;
      if (f) out.f = `=${String(f).replace(/^=/, "")}`;
      apply(o.result);
    } else if (Array.isArray(o.richText)) {
      apply(o.richText.map((r: Json) => r.text).join(""));
    } else if ("hyperlink" in o) {
      const text = String(typeof o.text === "object" ? (o.text?.richText ?? []).map((r: Json) => r.text).join("") : (o.text ?? o.hyperlink));
      out.v = text;
      out.t = 1;
      out.p = linkDoc(text, String(o.hyperlink));
    } else apply(o);
  } else {
    apply(v);
  }
  if (st) out.s = styleId(st);
  return out.v === undefined && out.f === undefined && !out.s ? null : out;
}

function linkDoc(text: string, url: string): Json {
  return {
    id: "d",
    documentStyle: {},
    body: {
      dataStream: `${text}\r\n`,
      textRuns: [],
      paragraphs: [{ startIndex: text.length }],
      customRanges: [
        { startIndex: 0, endIndex: Math.max(0, text.length - 1), rangeId: rid("link"), rangeType: 0, properties: { url } },
      ],
    },
  };
}

function dataValidationRules(model: Record<string, Json>): Json[] {
  const groups = new Map<string, { rule: Json; cells: [number, number][] }>();
  for (const [ref, dv] of Object.entries(model)) {
    const pos = parseA1Range(ref);
    if (!pos) continue;
    const type = String(dv.type);
    const rule: Json = {
      allowBlank: dv.allowBlank !== false,
      showErrorMessage: dv.showErrorMessage !== false,
      ...(dv.error ? { error: dv.error } : {}),
      ...(dv.errorTitle ? { errorTitle: dv.errorTitle } : {}),
      ...(dv.prompt ? { prompt: dv.prompt, showInputMessage: true } : {}),
    };
    const f = (dv.formulae ?? []) as unknown[];
    if (type === "list") {
      const raw = String(f[0] ?? "");
      const literal = /^"(.*)"$/.exec(raw);
      Object.assign(rule, { type: "list", formula1: literal ? literal[1] : raw, formula2: "", showDropDown: true });
    } else if (["whole", "decimal", "date", "time", "textLength"].includes(type)) {
      Object.assign(rule, { type, operator: dv.operator ?? "between", formula1: String(f[0] ?? ""), formula2: f[1] !== undefined ? String(f[1]) : "" });
    } else if (type === "custom") {
      Object.assign(rule, { type: "custom", formula1: String(f[0] ?? "") });
    } else continue;
    const key = JSON.stringify(rule);
    const g = groups.get(key) ?? { rule, cells: [] };
    g.cells.push([pos.startRow, pos.startColumn]);
    groups.set(key, g);
  }
  return [...groups.values()].map(({ rule, cells }) => ({ uid: rid("dv"), ...rule, ranges: compressCells(cells) }));
}

/** Single cells -> the fewest vertical runs. */
function compressCells(cells: [number, number][]): RangeLike[] {
  const sorted = [...cells].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const out: RangeLike[] = [];
  for (const [r, c] of sorted) {
    const last = out[out.length - 1];
    if (last && last.startColumn === c && last.endColumn === c && last.endRow === r - 1) last.endRow = r;
    else out.push({ startRow: r, endRow: r, startColumn: c, endColumn: c });
  }
  return out;
}

function dxfToStyle(style: Json | undefined): Json {
  const out: Json = {};
  const fg = colorOf(style?.font?.color);
  if (fg) out.cl = { rgb: fg };
  if (style?.font?.bold) out.bl = 1;
  if (style?.font?.italic) out.it = 1;
  const bg = colorOf(style?.fill?.bgColor) ?? colorOf(style?.fill?.fgColor);
  if (bg) out.bg = { rgb: bg };
  return out;
}

function conditionalRules(formats: Json[], dropped: Set<string>): Json[] {
  const out: Json[] = [];
  for (const cf of formats) {
    const ranges = String(cf.ref ?? "").split(/\s+/).map((r) => parseA1Range(r)).filter((r): r is RangeLike => !!r);
    if (!ranges.length) continue;
    for (const rule of (cf.rules ?? []) as Json[]) {
      let mapped: Json | null = null;
      const style = dxfToStyle(rule.style);
      if (rule.type === "cellIs") {
        const nums = ((rule.formulae ?? []) as unknown[]).map(Number);
        const between = rule.operator === "between" || rule.operator === "notBetween";
        mapped = { type: "highlightCell", subType: "number", operator: rule.operator, value: between ? nums.slice(0, 2) : nums[0], style };
      } else if (rule.type === "containsText") {
        mapped = { type: "highlightCell", subType: "text", operator: "containsText", value: String(rule.text ?? ""), style };
      } else if (rule.type === "expression") {
        mapped = { type: "highlightCell", subType: "formula", value: `=${String((rule.formulae ?? [])[0] ?? "")}`, style };
      } else if (rule.type === "colorScale") {
        mapped = {
          type: "colorScale",
          config: ((rule.cfvo ?? []) as Json[]).map((v, i) => ({
            index: i,
            color: colorOf(rule.color?.[i]) ?? "#ffffff",
            value: { type: v.type, ...(v.value !== undefined ? { value: v.value } : {}) },
          })),
        };
      } else if (rule.type === "dataBar") {
        const [min, max] = (rule.cfvo ?? []) as Json[];
        mapped = {
          type: "dataBar",
          isShowValue: true,
          config: {
            min: { type: min?.type ?? "min" },
            max: { type: max?.type ?? "max" },
            isGradient: rule.gradient !== false,
            positiveColor: colorOf(rule.color) ?? "#638ec6",
            nativeColor: "#ff0000",
          },
        };
      }
      if (!mapped) {
        dropped.add("Some conditional formats (icon sets, top/bottom, date rules) were not imported");
        continue;
      }
      out.push({ cfId: rid("cf"), ranges, stopIfTrue: Boolean(rule.stopIfTrue), rule: mapped });
    }
  }
  return out;
}
