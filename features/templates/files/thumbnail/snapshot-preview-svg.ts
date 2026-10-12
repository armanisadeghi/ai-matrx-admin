/**
 * snapshot → SVG: a faithful miniature of a Univer workbook's first sheet or a
 * Univer document's first page — the gallery tile Google draws. Pure (no DOM,
 * no Univer runtime), so it runs in the browser (thumbnail capture), in tests
 * and in node. Reads only what a snapshot stores: cell values + styles +
 * column widths + merges + conditional formats + checkboxes for sheets; the
 * dataStream + text runs + paragraph styles + tables for documents.
 */

export const THUMB_WIDTH = 320;
export const THUMB_HEIGHT = 414;

type Rgb = { rgb?: string | null } | null | undefined;
type CellStyle = {
  bg?: Rgb;
  cl?: Rgb;
  bl?: number;
  it?: number;
  fs?: number;
  ht?: number;
  n?: { pattern?: string } | null;
  bd?: Record<string, unknown> | null;
};
type Cell = { v?: unknown; s?: string | CellStyle | null; t?: number; f?: string };
type Sheet = {
  id?: string;
  name?: string;
  cellData?: Record<string, Record<string, Cell>>;
  columnData?: Record<string, { w?: number; hd?: number }>;
  rowData?: Record<string, { h?: number; hd?: number }>;
  defaultColumnWidth?: number;
  defaultRowHeight?: number;
  mergeData?: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>;
  showGridlines?: number;
  freeze?: { ySplit?: number; xSplit?: number };
};
type Workbook = {
  sheetOrder?: string[];
  sheets?: Record<string, Sheet>;
  styles?: Record<string, CellStyle | null>;
  resources?: Array<{ name?: string; data?: string }>;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function color(c: Rgb, fallback: string): string {
  const v = c?.rgb;
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

// ─── number formats ──────────────────────────────────────────────────────────

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatCellValue(v: unknown, pattern?: string | null): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v !== "number" || !pattern || pattern === "General") return String(v);
  const p = pattern.toLowerCase();
  if (/[dy]/.test(p) && !p.includes("$")) {
    const d = new Date(EXCEL_EPOCH + Math.round(v) * 86400000);
    const mm = d.getUTCMonth();
    const dd = d.getUTCDate();
    const yy = d.getUTCFullYear();
    if (p.includes("mmm")) return `${MONTHS[mm]} ${dd}${p.includes("y") ? `, ${yy}` : ""}`;
    return p.includes("y") ? `${mm + 1}/${dd}/${yy}` : `${mm + 1}/${dd}`;
  }
  const decimals = (pattern.split(".")[1]?.match(/0/g) ?? []).length;
  if (p.includes("%")) return `${(v * 100).toFixed(decimals)}%`;
  const grouped = Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: pattern.includes(","),
  });
  const sign = v < 0 ? "-" : "";
  return p.includes("$") ? `${sign}$${grouped}` : `${sign}${grouped}`;
}

// ─── conditional formatting (the rules a preview can evaluate) ───────────────

type CfRule = {
  rule?: {
    type?: string;
    subType?: string;
    operator?: string;
    value?: unknown;
    style?: CellStyle;
  };
  ranges?: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>;
};

function parseResource<T>(wb: Workbook, name: string): T | null {
  const res = wb.resources?.find((r) => r.name === name);
  if (!res?.data) return null;
  try {
    return JSON.parse(res.data) as T;
  } catch {
    return null;
  }
}

function cfMatch(rule: NonNullable<CfRule["rule"]>, v: unknown): boolean {
  if (rule.type !== "highlightCell") return false;
  if (rule.subType === "number" && typeof v === "number") {
    const x = rule.value;
    const [a, b] = Array.isArray(x) ? (x as number[]) : [Number(x), Number(x)];
    switch (rule.operator) {
      case "greaterThan": return v > a;
      case "greaterThanOrEqual": return v >= a;
      case "lessThan": return v < a;
      case "lessThanOrEqual": return v <= a;
      case "equal": return v === a;
      case "notEqual": return v !== a;
      case "between": return v >= a && v <= b;
      default: return false;
    }
  }
  if (rule.subType === "text" && v !== undefined && v !== null) {
    const s = String(v).toLowerCase();
    const want = String(rule.value ?? "").toLowerCase();
    switch (rule.operator) {
      case "containsText": return s.includes(want);
      case "equal": return s === want;
      case "beginsWith": return s.startsWith(want);
      default: return false;
    }
  }
  return false;
}

// ─── workbook ────────────────────────────────────────────────────────────────

export function workbookPreviewSvg(snapshot: unknown): string {
  const wb = (snapshot ?? {}) as Workbook;
  const firstId = wb.sheetOrder?.[0] ?? Object.keys(wb.sheets ?? {})[0];
  const sheet: Sheet = (firstId && wb.sheets?.[firstId]) || {};
  const sheetId = sheet.id ?? firstId ?? "";
  const styles = wb.styles ?? {};
  const cfAll = parseResource<Record<string, CfRule[]>>(wb, "SHEET_CONDITIONAL_FORMATTING_PLUGIN");
  const cf = (cfAll?.[sheetId] ?? []).filter((r) => r.rule && r.ranges);
  const dvAll = parseResource<Record<string, Array<{ type?: string; ranges?: CfRule["ranges"] }>>>(
    wb,
    "SHEET_DATA_VALIDATION_PLUGIN",
  );
  const checkboxRanges = (dvAll?.[sheetId] ?? []).filter((d) => d.type === "checkbox").flatMap((d) => d.ranges ?? []);
  const inRanges = (rs: CfRule["ranges"], r: number, c: number) =>
    (rs ?? []).some((x) => r >= x.startRow && r <= x.endRow && c >= x.startColumn && c <= x.endColumn);

  const dcw = sheet.defaultColumnWidth ?? 88;
  const drh = sheet.defaultRowHeight ?? 24;
  const colW = (c: number) => (sheet.columnData?.[c]?.hd ? 0 : sheet.columnData?.[c]?.w ?? dcw);
  const rowH = (r: number) => (sheet.rowData?.[r]?.hd ? 0 : sheet.rowData?.[r]?.h ?? drh);

  // Show the used width (at least ~5 default columns), scaled to the tile.
  let maxCol = 0;
  for (const row of Object.values(sheet.cellData ?? {})) {
    for (const c of Object.keys(row ?? {})) maxCol = Math.max(maxCol, Number(c));
  }
  let used = 0;
  for (let c = 0; c <= maxCol; c++) used += colW(c);
  // Google's tiles show the top-left of the sheet at a readable size, not the whole width.
  const span = Math.min(Math.max(used + 12, dcw * 5), 640);
  const scale = THUMB_WIDTH / span;

  const out: string[] = [];
  out.push(`<rect width="${THUMB_WIDTH}" height="${THUMB_HEIGHT}" fill="#ffffff"/>`);
  const gridOn = sheet.showGridlines !== 0;
  const merges = sheet.mergeData ?? [];
  const covered = new Set<string>();
  for (const m of merges) {
    for (let r = m.startRow; r <= m.endRow; r++)
      for (let c = m.startColumn; c <= m.endColumn; c++)
        if (r !== m.startRow || c !== m.startColumn) covered.add(`${r}:${c}`);
  }
  const texts: string[] = [];
  let y = 0;
  for (let r = 0; y * scale < THUMB_HEIGHT && r < 400; r++) {
    const h = rowH(r);
    let x = 0;
    for (let c = 0; x * scale < THUMB_WIDTH && c < 60; c++) {
      const w = colW(c);
      if (w === 0 || h === 0 || covered.has(`${r}:${c}`)) {
        x += w;
        continue;
      }
      const m = merges.find((mm) => mm.startRow === r && mm.startColumn === c);
      let cw = w;
      let ch = h;
      if (m) {
        cw = 0;
        for (let k = m.startColumn; k <= m.endColumn; k++) cw += colW(k);
        ch = 0;
        for (let k = m.startRow; k <= m.endRow; k++) ch += rowH(k);
      }
      const cell = sheet.cellData?.[r]?.[c];
      const base: CellStyle =
        (typeof cell?.s === "string" ? styles[cell.s] : (cell?.s as CellStyle | null)) ?? {};
      let st: CellStyle = base;
      for (const rule of cf) {
        if (inRanges(rule.ranges, r, c) && rule.rule && cfMatch(rule.rule, cell?.v)) {
          st = { ...st, ...rule.rule.style };
          break;
        }
      }
      const X = x * scale;
      const Y = y * scale;
      const W = cw * scale;
      const H = ch * scale;
      const bg = st.bg?.rgb;
      if (bg) out.push(`<rect x="${X.toFixed(1)}" y="${Y.toFixed(1)}" width="${W.toFixed(1)}" height="${H.toFixed(1)}" fill="${esc(bg)}"/>`);
      if (gridOn) out.push(`<rect x="${X.toFixed(1)}" y="${Y.toFixed(1)}" width="${W.toFixed(1)}" height="${H.toFixed(1)}" fill="none" stroke="#e2e3e3" stroke-width="0.5"/>`);
      const fs = Math.max((st.fs ?? 10) * 1.333 * scale, 3);
      const midY = Y + H / 2 + fs * 0.35;
      if (inRanges(checkboxRanges, r, c) && r > 0 && (cell?.v === true || cell?.v === false || cell?.v === 1 || cell?.v === 0 || cell?.v === "TRUE" || cell?.v === "FALSE")) {
        const box = Math.min(H * 0.55, 9);
        const bx = X + W / 2 - box / 2;
        const by = Y + H / 2 - box / 2;
        const on = cell?.v === true || cell?.v === 1 || cell?.v === "TRUE";
        out.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${box.toFixed(1)}" height="${box.toFixed(1)}" rx="1" fill="${on ? "#1a73e8" : "#ffffff"}" stroke="${on ? "#1a73e8" : "#5f6368"}" stroke-width="0.7"/>`);
        if (on) out.push(`<path d="M${(bx + box * 0.2).toFixed(1)} ${(by + box * 0.5).toFixed(1)} l${(box * 0.25).toFixed(1)} ${(box * 0.25).toFixed(1)} l${(box * 0.4).toFixed(1)} ${(-box * 0.45).toFixed(1)}" stroke="#fff" stroke-width="0.9" fill="none"/>`);
      } else if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
        const text = formatCellValue(cell.v, st.n?.pattern);
        const numeric = typeof cell.v === "number";
        const ht = st.ht ?? (numeric ? 3 : 1);
        const anchor = ht === 2 ? "middle" : ht === 3 ? "end" : "start";
        const tx = ht === 2 ? X + W / 2 : ht === 3 ? X + W - 2 * scale * 2 : X + 3 * scale;
        const maxChars = Math.max(Math.floor((m ? W : W * (ht === 1 && !numeric ? 3 : 1)) / (fs * 0.55)), 1);
        const shown = text.length > maxChars ? text.slice(0, maxChars) : text;
        texts.push(
          `<text x="${tx.toFixed(1)}" y="${midY.toFixed(1)}" font-size="${fs.toFixed(1)}" text-anchor="${anchor}" fill="${esc(color(st.cl, "#202124"))}"${st.bl ? ' font-weight="700"' : ""}${st.it ? ' font-style="italic"' : ""}>${esc(shown)}</text>`,
        );
      }
      x += w;
    }
    y += h;
  }
  return wrapSvg([...out, ...texts].join(""));
}

// ─── document ────────────────────────────────────────────────────────────────

type TextStyle = { fs?: number; bl?: number; it?: number; cl?: Rgb; ff?: string; bg?: Rgb };
type DocData = {
  body?: {
    dataStream?: string;
    paragraphs?: Array<{ startIndex: number; paragraphStyle?: { horizontalAlign?: number; spaceAbove?: { v?: number }; spaceBelow?: { v?: number } } }>;
    textRuns?: Array<{ st: number; ed: number; ts?: TextStyle }>;
    tables?: Array<{ startIndex: number; endIndex: number; tableId: string }>;
  };
  documentStyle?: {
    pageSize?: { width?: number; height?: number };
    marginTop?: number;
    marginLeft?: number;
    marginRight?: number;
  };
};

const CONTROL = /[\x1A\x1B\x1C\x1D\x0E\x0F\x1F\x1E\b]/g;

export function documentPreviewSvg(snapshot: unknown): string {
  const doc = (snapshot ?? {}) as DocData;
  const stream = doc.body?.dataStream ?? "";
  const pageW = doc.documentStyle?.pageSize?.width ?? 595;
  const scale = THUMB_WIDTH / pageW;
  const ml = (doc.documentStyle?.marginLeft ?? 72) * scale;
  const mr = (doc.documentStyle?.marginRight ?? 72) * scale;
  const mt = (doc.documentStyle?.marginTop ?? 72) * scale;
  const contentW = THUMB_WIDTH - ml - mr;
  const runs = [...(doc.body?.textRuns ?? [])].sort((a, b) => a.st - b.st);
  const tables = doc.body?.tables ?? [];
  const styleAt = (i: number): TextStyle => runs.find((r) => i >= r.st && i < r.ed)?.ts ?? {};
  /** The style most of a paragraph's characters carry (a bold lead-in does not make the line bold). */
  const dominantStyle = (from: number, to: number): TextStyle => {
    const counts = new Map<string, { n: number; ts: TextStyle }>();
    for (let i = from; i < to; i++) {
      if (/\s/.test(stream[i] ?? "")) continue;
      const ts = styleAt(i);
      const k = JSON.stringify(ts);
      const e = counts.get(k) ?? { n: 0, ts };
      e.n++;
      counts.set(k, e);
    }
    let best: { n: number; ts: TextStyle } | null = null;
    for (const e of counts.values()) if (!best || e.n > best.n) best = e;
    return best?.ts ?? {};
  };
  const out: string[] = [`<rect width="${THUMB_WIDTH}" height="${THUMB_HEIGHT}" fill="#ffffff"/>`];

  let y = mt;
  let start = 0;
  const paragraphs = doc.body?.paragraphs ?? [];
  for (let p = 0; p < paragraphs.length && y < THUMB_HEIGHT; p++) {
    const para = paragraphs[p];
    const end = para.startIndex;
    const table = tables.find((t) => start >= t.startIndex && start < t.endIndex);
    if (table) {
      // Draw the whole table once: rows split on the row token, cells on the cell token.
      const raw = stream.slice(table.startIndex, table.endIndex);
      const rows = raw.split("\x1B").slice(1).map((row) =>
        row.split("\x1C").slice(1).map((cell) => cell.replace(/[\r\n]/g, " ").replace(CONTROL, "").trim()),
      );
      const cols = Math.max(1, ...rows.map((r) => r.length));
      const cw = contentW / cols;
      // Bold header row when the first cell's text is bold.
      const headerBold = styleAt(table.startIndex + 4).bl === 1;
      for (let r = 0; r < rows.length && y < THUMB_HEIGHT; r++) {
        const rh = 16 * scale * 1.2 + 6 * scale;
        for (let c = 0; c < cols; c++) {
          const cx = ml + c * cw;
          out.push(`<rect x="${cx.toFixed(1)}" y="${y.toFixed(1)}" width="${cw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${r === 0 && headerBold ? "#f1f3f4" : "none"}" stroke="#9aa0a6" stroke-width="0.4"/>`);
          const fs = 11 * 1.333 * scale;
          const maxChars = Math.max(Math.floor((cw - 6 * scale) / (fs * 0.5)), 1);
          const t = rows[r][c] ?? "";
          out.push(`<text x="${(cx + 4 * scale).toFixed(1)}" y="${(y + rh / 2 + fs * 0.35).toFixed(1)}" font-size="${fs.toFixed(1)}" fill="#202124"${r === 0 && headerBold ? ' font-weight="700"' : ""}>${esc(t.slice(0, maxChars))}</text>`);
        }
        y += rh;
      }
      // Skip every paragraph inside the table.
      while (p + 1 < paragraphs.length && paragraphs[p + 1].startIndex < table.endIndex) p++;
      start = table.endIndex;
      y += 6 * scale;
      continue;
    }
    const text = stream.slice(start, end).replace(CONTROL, "");
    const st = dominantStyle(start, end);
    const ps = para.paragraphStyle ?? {};
    const fsPt = st.fs ?? 11;
    const fs = fsPt * 1.333 * scale;
    const lineH = fs * 1.3;
    y += (ps.spaceAbove?.v ?? (fsPt > 13 ? 8 : 0)) * scale;
    const align = ps.horizontalAlign ?? 1;
    const anchor = align === 2 ? "middle" : align === 3 ? "end" : "start";
    const tx = align === 2 ? ml + contentW / 2 : align === 3 ? ml + contentW : ml;
    // Paragraph shading (a filled band) when the run carries a highlight.
    if (!text.trim()) {
      y += lineH * 0.8;
    } else {
      const maxChars = Math.max(Math.floor(contentW / (fs * (st.bl ? 0.56 : 0.5))), 4);
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        if ((line + " " + w).trim().length > maxChars && line) {
          lines.push(line);
          line = w;
        } else line = (line + " " + w).trim();
      }
      if (line) lines.push(line);
      for (const l of lines) {
        if (y > THUMB_HEIGHT) break;
        y += lineH;
        if (st.bg?.rgb) out.push(`<rect x="${ml.toFixed(1)}" y="${(y - fs).toFixed(1)}" width="${contentW.toFixed(1)}" height="${lineH.toFixed(1)}" fill="${esc(st.bg.rgb)}"/>`);
        out.push(`<text x="${tx.toFixed(1)}" y="${y.toFixed(1)}" font-size="${fs.toFixed(1)}" text-anchor="${anchor}" fill="${esc(color(st.cl, "#202124"))}"${st.bl ? ' font-weight="700"' : ""}${st.it ? ' font-style="italic"' : ""}${st.ff && /serif|georgia|times|garamond/i.test(st.ff) && !/sans/i.test(st.ff) ? ' font-family="Georgia, serif"' : ""}>${esc(l)}</text>`);
      }
    }
    y += (ps.spaceBelow?.v ?? 4) * scale;
    start = end + 1;
  }
  return wrapSvg(out.join(""));
}

function wrapSvg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${THUMB_WIDTH}" height="${THUMB_HEIGHT}" viewBox="0 0 ${THUMB_WIDTH} ${THUMB_HEIGHT}" font-family="Arial, Helvetica, sans-serif">${body}</svg>`;
}

export function snapshotPreviewSvg(kind: "workbook" | "document", snapshot: unknown): string {
  return kind === "workbook" ? workbookPreviewSvg(snapshot) : documentPreviewSvg(snapshot);
}
