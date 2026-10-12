/**
 * Seed builder for featured document templates: markdown (the ONE markdown →
 * Univer converter) + a theme pass that colours headings, sets the face, and
 * styles named paragraphs (centered title, gray subtitle, right-aligned date).
 * Text runs are rebuilt per character so they never overlap.
 */
import type { IDocumentData, ITextStyle } from "@univerjs/core";
import { markdownToUniverDoc } from "@/features/documents/markdown-to-univer-doc";

export type ParaRule = {
  match: string | RegExp;
  ts?: ITextStyle;
  align?: "left" | "center" | "right";
  spaceAbove?: number;
  spaceBelow?: number;
};

export type DocTheme = {
  accent: string;
  /** Font family for every run (e.g. "Georgia" for a classic look). */
  font?: string;
  /** Body size in pt (default 11). */
  bodySize?: number;
  rules?: ParaRule[];
};

const CONTROL = /[\x1A\x1B\x1C\x1D\x0E\x0F\x1F\x1E\b]/g;
const CONTROL_ONE = /[\x1A\x1B\x1C\x1D\x0E\x0F\x1F\x1E\b\r\n]/;
const ALIGN = { left: 1, center: 2, right: 3 } as const;

export function themedDoc(markdown: string, title: string, theme: DocTheme): Partial<IDocumentData> {
  const doc = markdownToUniverDoc(markdown, title);
  const body = doc.body!;
  const stream = body.dataStream;
  const per: Array<ITextStyle | null> = Array.from({ length: stream.length }, () => null);
  for (const run of body.textRuns ?? []) {
    for (let i = run.st; i < run.ed && i < per.length; i++) per[i] = { ...(per[i] ?? {}), ...(run.ts ?? {}) };
  }
  const isText = (i: number) => !CONTROL_ONE.test(stream[i]);
  // Base face + size + heading colour.
  for (let i = 0; i < per.length; i++) {
    if (!isText(i)) continue;
    const ts: ITextStyle = { ...(per[i] ?? {}) };
    if (theme.font && ts.ff !== "monospace") ts.ff = theme.font;
    if (!ts.fs) ts.fs = theme.bodySize ?? 11;
    if (ts.fs >= 13 && !ts.cl) ts.cl = { rgb: theme.accent };
    per[i] = ts;
  }
  // Paragraph rules.
  let start = 0;
  for (const p of body.paragraphs ?? []) {
    const text = stream.slice(start, p.startIndex).replace(CONTROL, "").trim();
    const rule = (theme.rules ?? []).find((r) => (typeof r.match === "string" ? text === r.match : r.match.test(text)));
    if (rule && text) {
      for (let i = start; i < p.startIndex; i++) {
        if (isText(i) && rule.ts) per[i] = { ...(per[i] ?? {}), ...rule.ts };
      }
      p.paragraphStyle = {
        ...(p.paragraphStyle ?? {}),
        ...(rule.align ? { horizontalAlign: ALIGN[rule.align] } : {}),
        ...(rule.spaceAbove !== undefined ? { spaceAbove: { v: rule.spaceAbove } } : {}),
        ...(rule.spaceBelow !== undefined ? { spaceBelow: { v: rule.spaceBelow } } : {}),
      };
    }
    start = p.startIndex + 1;
  }
  // Re-compress into non-overlapping runs.
  const runs: NonNullable<typeof body.textRuns> = [];
  let i = 0;
  while (i < per.length) {
    const ts = per[i];
    if (!ts) {
      i++;
      continue;
    }
    const key = JSON.stringify(ts);
    let j = i + 1;
    while (j < per.length && per[j] && JSON.stringify(per[j]) === key) j++;
    runs.push({ st: i, ed: j, ts });
    i = j;
  }
  body.textRuns = runs;
  return doc;
}
