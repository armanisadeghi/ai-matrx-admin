/**
 * Data → Data connectors → "CSV from a link". The fetch is server work: aidream `GET /web/fetch-text`
 * (the guarded client: no private addresses, 5 MB, text only). The text is read by the platform's one
 * delimited reader and written into the sheet, growing the sheet first when the file is bigger than it
 * (a blank sheet has 100 rows; Univer refuses a write past the last row).
 *
 * Every failure names the step that failed in plain words; the raw error goes to the console.
 */

import { getJson } from "@/lib/python-client";
import { csvCell, parseCsv } from "@/features/workbooks/chrome/sheet-row-extras";

export interface CsvLinkFetched {
  text: string;
}
export type FetchText = (path: string) => Promise<{ data: CsvLinkFetched }>;

/** A step of the import that failed, said in words a person can act on. */
export class CsvLinkError extends Error {
  constructor(message: string, override readonly cause?: unknown) {
    super(message);
    this.name = "CsvLinkError";
  }
}

const defaultFetch: FetchText = (path) => getJson<CsvLinkFetched>(path, { captureErrors: false });

/** The server's own sentence for a refusal (`detail.message`), else a plain fallback. */
function refusalSentence(error: unknown): string {
  const e = error as { details?: { detail?: { message?: unknown } }; detail?: unknown; userMessage?: unknown; status?: number | null } | null;
  const fromBody = e?.details?.detail?.message;
  if (typeof fromBody === "string" && fromBody) return fromBody;
  const d = e?.detail as { message?: unknown } | string | undefined;
  if (d && typeof d === "object" && typeof d.message === "string") return d.message;
  const status = e?.status;
  if (status === 404 || status === 405) return "The link reader is not available on this server yet, so the file was never fetched.";
  if (status === 401 || status === 403) return "You need to be signed in to import from a link. Sign in again and retry.";
  if (typeof status === "number" && status >= 500) return "The server hit a problem reading that link. Try again in a moment.";
  if (typeof status === "number") return `The link could not be read (the server answered ${status}).`;
  return "The link could not be reached from here. Check your connection and try again.";
}

/** Text of a CSV / TSV file at a link → typed rows. */
export async function readCsvLink(url: string, fetchText: FetchText = defaultFetch): Promise<unknown[][]> {
  let text: string;
  try {
    const res = await fetchText(`/web/fetch-text?url=${encodeURIComponent(url)}`);
    text = res.data.text;
  } catch (error) {
    throw new CsvLinkError(refusalSentence(error), error);
  }
  let rows: string[][];
  try {
    rows = parseCsv(text);
  } catch (error) {
    throw new CsvLinkError("The file was fetched but could not be read as a table of values.", error);
  }
  if (rows.length === 0) throw new CsvLinkError("The file has no rows in it.");
  return rows.map((row) => row.map(csvCell));
}

export interface GrowableSheet {
  getMaxRows(): number;
  getMaxColumns(): number;
  setRowCount?(count: number): unknown;
  setColumnCount?(count: number): unknown;
  getRange(row: number, col: number, rows: number, cols: number): { setValues(values: unknown[][]): unknown };
}

/** Write rows at a cell, growing the sheet to hold them; returns how many rows went in. */
export function writeRowsGrowing(sheet: GrowableSheet, row: number, col: number, values: unknown[][]): number {
  const width = values.reduce((w, r) => Math.max(w, r.length), 0);
  if (!values.length || !width) return 0;
  try {
    if (row + values.length > sheet.getMaxRows()) sheet.setRowCount?.(row + values.length);
    if (col + width > sheet.getMaxColumns()) sheet.setColumnCount?.(col + width);
    sheet.getRange(row, col, values.length, width).setValues(values.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? null)));
  } catch (error) {
    throw new CsvLinkError("The file was read, but the sheet could not hold it.", error);
  }
  return values.length;
}

/** A person-facing sentence for whatever the import threw; the raw error is logged, never toasted. */
export function csvLinkMessage(error: unknown): string {
  if (error instanceof CsvLinkError) {
    console.error("[sheets] CSV from a link failed:", error.message, error.cause);
    return error.message;
  }
  console.error("[sheets] CSV from a link failed:", error);
  return "The link could not be imported.";
}
