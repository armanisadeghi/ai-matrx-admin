// lib/content-cleanup/operations.ts
//
// The cleanup operation registry. Each operation is a pure string transform
// run ONLY on the cleanable (unprotected) text — the orchestrator masks
// protected regions out before applying these. Operations are listed in the
// canonical run order; the orchestrator runs them in array order, skipping any
// the user disabled.
//
// Each op also exposes `edits(text)`: the precise character ranges it would
// change, used to show the user real before/after examples in the review.
// `run` is derived from `edits` so the preview count and the applied result
// can never disagree.
//
// Every non-ASCII target is built from explicit code points (below) so the
// SOURCE stays pure ASCII — no invisible glyphs hiding in a regex literal.

import type {
  CleanupOperationId,
  CleanupOperationMeta,
  OperationRunResult,
} from "./types";

/** A single character-range replacement within a string. */
export interface CleanupEdit {
  start: number;
  end: number;
  replacement: string;
}

/** A protected region's character span (code, table, JSON…). */
export interface BlockSpan {
  start: number;
  end: number;
}

export interface CleanupOperationDef extends CleanupOperationMeta {
  /** Plain-language, past-tense phrase for the review cards (no jargon). */
  human: string;
  /** Precise edits this op would make to `text` (non-overlapping, sorted).
   *  `blocks` = protected spans when `text` is the raw (unmasked) content —
   *  the review passes them; the engine's masked text carries sentinels instead. */
  edits(text: string, blocks?: readonly BlockSpan[]): CleanupEdit[];
  run(text: string): OperationRunResult;
}

/** Build a regex character-class body from code points (each point -> its char). */
function chars(...codePoints: number[]): string {
  return codePoints.map((c) => String.fromCodePoint(c)).join("");
}

const INVISIBLES = new RegExp(
  `[${chars(0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0x00ad, 0x180e)}]`,
  "g",
);
const UNICODE_SPACES = new RegExp(
  `[${chars(
    0x00a0,
    0x1680,
    0x2000,
    0x2001,
    0x2002,
    0x2003,
    0x2004,
    0x2005,
    0x2006,
    0x2007,
    0x2008,
    0x2009,
    0x200a,
    0x202f,
    0x205f,
    0x3000,
  )}]`,
  "g",
);
const SMART_DOUBLE_QUOTES = new RegExp(
  `[${chars(0x201c, 0x201d, 0x201e, 0x201f, 0x2033)}]`,
  "g",
);
const SMART_SINGLE_QUOTES = new RegExp(
  `[${chars(0x2018, 0x2019, 0x201a, 0x201b, 0x2032)}]`,
  "g",
);
/** Sentinels wrapping each masked protected region (see clean.ts). */
export const PROTECTED_OPEN = String.fromCodePoint(0xe000);
export const PROTECTED_CLOSE = String.fromCodePoint(0xe001);
const ELLIPSIS = new RegExp(chars(0x2026), "g");
const BULLET_GLYPHS = new RegExp(
  `^(\\s*)[${chars(
    0x2022,
    0x2023,
    0x25e6,
    0x2043,
    0x2219,
    0x25aa,
    0x25cf,
    0x00b7,
  )}]\\s+`,
  "gm",
);

/** Collect non-overlapping edits from a global regex. `make` maps a match to
 *  its edit (so an op can mark just the changed slice, not the whole match). */
function regexEdits(
  text: string,
  re: RegExp,
  make: string | ((m: RegExpExecArray) => CleanupEdit),
): CleanupEdit[] {
  const out: CleanupEdit[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (typeof make === "string") {
      out.push({
        start: m.index,
        end: m.index + m[0].length,
        replacement: make,
      });
    } else {
      out.push(make(m));
    }
    if (m[0].length === 0) re.lastIndex++; // guard against zero-width loops
  }
  return out;
}

/** Apply non-overlapping edits to a string (right-to-left so offsets hold). */
export function applyEdits(text: string, edits: CleanupEdit[]): string {
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let out = text;
  for (const e of sorted) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }
  return out;
}

function fromEdits(text: string, edits: CleanupEdit[]): OperationRunResult {
  return { text: applyEdits(text, edits), changes: edits.length };
}

/** Code points a decoder may never produce: NUL, lone surrogates, and the two
 *  protected-region sentinels (decoding one would desync the unmask step). */
function decodableCodePoint(cp: number): boolean {
  return (
    Number.isInteger(cp) &&
    cp > 0 &&
    cp <= 0x10ffff &&
    !(cp >= 0xd800 && cp <= 0xdfff) &&
    cp !== 0xe000 &&
    cp !== 0xe001
  );
}

/** A literal escape sequence as text: `\n`, `\t`, `\r\n`, `\"`, `\'`, `\uXXXX`.
 *  The lookbehind skips an escaped backslash (`\\n` is a backslash + "n"). */
const LITERAL_ESCAPES = /(?<!\\)\\(r\\n|[nrt"']|u[0-9a-fA-F]{4})/g;

/** A backslash run before ASCII punctuation: a markdown escape (CommonMark
 *  allows exactly this set). Doubled runs (`\\*`) are re-escaped pastes. */
const MARKDOWN_ESCAPES = /\\+(?=[!-/:-@[-`{-~])/g;

/** LaTeX math spans: `$$...$$`, `$...$`, and `\\(...\\)` / `\\[...\\]` pairs whose
 *  body carries a LaTeX command, `^` or `_` (a plain `\\[link\\]` is not math). */
function mathSpans(t: string): BlockSpan[] {
  const out: BlockSpan[] = [];
  const re =
    /\$\$[\s\S]+?\$\$|\$(?=\S)[^$\n]+?(?<=\S)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const body = m[1] ?? m[2];
    if (body !== undefined && !/\\[a-zA-Z]|[\^_]/.test(body)) {
      re.lastIndex = m.index + 2; // not math; let its interior be scanned
      continue;
    }
    out.push({ start: m.index, end: m.index + m[0].length });
  }
  return out;
}

/** Named HTML entities decoded by `decode-html-entities` (lowercase keys).
 *  Values are code points so the source stays ASCII. */
const NAMED_ENTITIES: Record<string, number> = {
  amp: 0x26,
  lt: 0x3c,
  gt: 0x3e,
  quot: 0x22,
  apos: 0x27,
  nbsp: 0x20,
  mdash: 0x2014,
  ndash: 0x2013,
  hellip: 0x2026,
  bull: 0x2022,
  middot: 0x00b7,
  lsquo: 0x2018,
  rsquo: 0x2019,
  ldquo: 0x201c,
  rdquo: 0x201d,
  copy: 0x00a9,
  reg: 0x00ae,
  trade: 0x2122,
  deg: 0x00b0,
  times: 0x00d7,
  rarr: 0x2192,
  larr: 0x2190,
  euro: 0x20ac,
  pound: 0x00a3,
  cent: 0x00a2,
};
/** One pass, so `&amp;lt;` decodes once to `&lt;` and stops there. */
const HTML_ENTITY =
  /&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z]{2,8});|<br\s*\/?>/g;

function decodeEntity(match: string, body: string | undefined): string | null {
  if (body === undefined) return "\n"; // <br>
  let cp: number | undefined;
  if (body[0] === "#") {
    cp =
      body[1] === "x" || body[1] === "X"
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
  } else {
    cp = NAMED_ENTITIES[body.toLowerCase()];
  }
  if (cp === undefined || !decodableCodePoint(cp)) return null;
  // &#160; / &nbsp; become a plain space, never a non-breaking one.
  return cp === 0xa0 ? " " : String.fromCodePoint(cp);
}

/** Edits that turn literal escape sequences into the characters they name.
 *  Shared with the value engine (`value-operations.ts`). */
export function decodeEscapeSequenceEdits(t: string): CleanupEdit[] {
  return regexEdits(t, LITERAL_ESCAPES, (m) => {
    const seq = m[1];
    let replacement: string;
    if (seq === "r\\n" || seq === "n" || seq === "r") replacement = "\n";
    else if (seq === "t") replacement = "\t";
    else if (seq[0] === "u") {
      const cp = Number.parseInt(seq.slice(1), 16);
      replacement = decodableCodePoint(cp) ? String.fromCodePoint(cp) : m[0];
    } else replacement = seq; // \" or \'
    return { start: m.index, end: m.index + m[0].length, replacement };
  }).filter((e) => t.slice(e.start, e.end) !== e.replacement);
}

/** Edits removing markdown escape backslashes, skipping LaTeX math.
 *  Shared with the value engine (`value-operations.ts`). */
export function unescapeMarkdownEdits(t: string): CleanupEdit[] {
  const math = mathSpans(t);
  return regexEdits(t, MARKDOWN_ESCAPES, "").filter(
    (e) => !math.some((m) => e.start >= m.start && e.start < m.end),
  );
}

export const CLEANUP_OPERATIONS: CleanupOperationDef[] = [
  {
    id: "normalize-line-endings",
    human: "Fixed inconsistent line breaks",
    label: "Normalize line endings",
    description: "Convert Windows/Mac line endings (CRLF, CR) to LF.",
    defaultEnabled: true,
    group: "recommended",
    edits: (t) => regexEdits(t, /\r\n?/g, "\n"),
    run(t) {
      return fromEdits(t, this.edits(t));
    },
  },
  {
    id: "remove-invisibles",
    human: "Removed hidden/invisible characters",
    label: "Remove invisible characters",
    description:
      "Strip zero-width spaces, BOM, soft hyphens and other invisible junk.",
    defaultEnabled: true,
    group: "recommended",
    edits: (t) => regexEdits(t, INVISIBLES, ""),
    run(t) {
      return fromEdits(t, this.edits(t));
    },
  },
  {
    id: "decode-escape-sequences",
    human: "Turned escaped text like \\n into real characters",
    label: "Decode escape sequences",
    description:
      'Literal \\n, \\t, \\" and \\u2019 text become real characters.',
    defaultEnabled: false,
    group: "extra",
    edits: (t) => decodeEscapeSequenceEdits(t),
    run(t) {
      return fromEdits(t, this.edits(t));
    },
  },
  {
    id: "decode-html-entities",
    human: "Decoded HTML codes like &amp; and <br>",
    label: "Decode HTML entities",
    description: "&amp;, &nbsp;, &#39; become characters; <br> a line break.",
    defaultEnabled: false,
    group: "extra",
    edits: (t) => {
      const out: CleanupEdit[] = [];
      for (const e of regexEdits(t, HTML_ENTITY, (m) => ({
        start: m.index,
        end: m.index + m[0].length,
        replacement: decodeEntity(m[0], m[1]) ?? m[0],
      }))) {
        if (t.slice(e.start, e.end) !== e.replacement) out.push(e);
      }
      return out;
    },
    run(t) {
      return fromEdits(t, this.edits(t));
    },
  },
  {
    id: "unescape-markdown",
    human: "Removed stray backslashes before markdown symbols",
    label: "Remove markdown escapes",
    description: "\\*\\*bold\\*\\* becomes **bold** so formatting renders.",
    defaultEnabled: true,
    group: "recommended",
    // Backslashes inside math ($...$, \\(...\\), \\[...\\]) are LaTeX, not escapes.
    edits: (t) => unescapeMarkdownEdits(t),
    run(t) {
      return fromEdits(t, this.edits(t));
    },
  },
  {
    id: "normalize-unicode-whitespace",
    human: "Replaced unusual spaces with normal ones",
    label: "Normalize exotic spaces",
    description:
      "Convert non-breaking and other Unicode spaces to a normal space.",
    defaultEnabled: true,
    group: "recommended",
    edits: (t) => regexEdits(t, UNICODE_SPACES, " "),
    run(t) {
      return fromEdits(t, this.edits(t));
    },
  },
  {
    id: "normalize-quotes",
    human: "Straightened curly quotes",
    label: "Straighten smart quotes",
    description:
      "Curly quotes and apostrophes become straight ASCII; ellipsis becomes three dots. (Dashes left as-is.)",
    defaultEnabled: false,
    group: "extra",
    edits: (t) =>
      [
        ...regexEdits(t, SMART_DOUBLE_QUOTES, '"'),
        ...regexEdits(t, SMART_SINGLE_QUOTES, "'"),
        ...regexEdits(t, ELLIPSIS, "..."),
      ].sort((a, b) => a.start - b.start),
    run(t) {
      return fromEdits(t, this.edits(t));
    },
  },
  {
    id: "normalize-bullets",
    human: "Standardized bullet points",
    label: "Normalize pasted bullets",
    description:
      "Convert bullet glyphs at the start of a line to a markdown dash.",
    defaultEnabled: false,
    group: "extra",
    edits: (t) =>
      regexEdits(t, BULLET_GLYPHS, (m) => ({
        start: m.index,
        end: m.index + m[0].length,
        replacement: `${m[1]}- `,
      })),
    run(t) {
      return fromEdits(t, this.edits(t));
    },
  },
  {
    id: "collapse-spaces",
    human: "Removed extra spaces between words",
    label: "Collapse repeated spaces",
    description:
      "Collapse runs of 2+ spaces inside a line to one, preserving leading indentation.",
    defaultEnabled: false,
    group: "extra",
    // Mark only the surplus spaces (after the first), never leading indentation.
    edits: (t) =>
      regexEdits(t, /(\S) {2,}/g, (m) => ({
        start: m.index + m[1].length + 1,
        end: m.index + m[0].length,
        replacement: "",
      })),
    run(t) {
      return fromEdits(t, this.edits(t));
    },
  },
  {
    id: "trim-trailing-whitespace",
    human: "Removed spaces at the end of lines",
    label: "Trim trailing whitespace",
    description: "Remove spaces and tabs at the end of every line.",
    defaultEnabled: true,
    group: "recommended",
    edits: (t) => regexEdits(t, /[ \t]+$/gm, ""),
    run(t) {
      return fromEdits(t, this.edits(t));
    },
  },
  {
    id: "collapse-blank-lines",
    human: "Removed extra blank lines",
    label: "Collapse extra blank lines",
    description:
      "Collapse 2+ consecutive blank lines into a single blank line (the copy-paste fix).",
    defaultEnabled: true,
    group: "recommended",
    edits: (t) =>
      regexEdits(t, /\n{3,}/g, (m) => ({
        start: m.index,
        end: m.index + m[0].length,
        replacement: "\n\n",
      })),
    run(t) {
      return fromEdits(t, this.edits(t));
    },
  },
  {
    id: "remove-blank-lines",
    human: "Removed blank lines between lines",
    label: "Remove all blank lines",
    description: "Delete every empty line; lines are never joined.",
    defaultEnabled: false,
    group: "extra",
    // A run of newlines (with any whitespace-only lines between, CR included)
    // becomes one newline. Next to a protected block (code, table, JSON…) one
    // blank line is kept so markdown still sees the block as its own block.
    edits: (t, blocks) =>
      regexEdits(t, /\n(?:[ \t\r]*\n)+/g, (m) => {
        const end = m.index + m[0].length;
        const lineEnd = t[m.index - 1] === "\r" ? m.index - 1 : m.index;
        const touchesBlock =
          t[lineEnd - 1] === PROTECTED_CLOSE ||
          t[end] === PROTECTED_OPEN ||
          (blocks?.some((b) => b.end === lineEnd || b.start === end) ?? false);
        return {
          start: m.index,
          end,
          replacement: touchesBlock ? "\n\n" : "\n",
        };
      }).filter((e) => t.slice(e.start, e.end) !== e.replacement),
    run(t) {
      return fromEdits(t, this.edits(t));
    },
  },
  {
    id: "trim-document-edges",
    human: "Removed blank space at the start and end",
    label: "Trim leading/trailing blank lines",
    description:
      "Remove blank lines and whitespace at the very top and bottom.",
    defaultEnabled: true,
    group: "recommended",
    edits: (t) => {
      const out: CleanupEdit[] = [];
      const lead = /^\s+/.exec(t);
      if (lead && lead[0].length > 0) {
        out.push({ start: 0, end: lead[0].length, replacement: "" });
      }
      const trail = /\s+$/.exec(t);
      if (trail && trail.index > (lead ? lead[0].length : 0)) {
        out.push({ start: trail.index, end: t.length, replacement: "" });
      }
      return out;
    },
    run(t) {
      return fromEdits(t, this.edits(t));
    },
  },
];

export const CLEANUP_OPERATION_META: CleanupOperationMeta[] =
  CLEANUP_OPERATIONS.map(
    ({ id, label, description, defaultEnabled, group }) => ({
      id,
      label,
      description,
      defaultEnabled,
      group,
    }),
  );

/** Plain-language phrase for an operation id (review headlines). */
export const OPERATION_HUMAN: Record<CleanupOperationId, string> =
  CLEANUP_OPERATIONS.reduce(
    (acc, op) => {
      acc[op.id] = op.human;
      return acc;
    },
    {} as Record<CleanupOperationId, string>,
  );

/** Ids enabled by default — the one-click "great result" set. */
export const DEFAULT_ENABLED_OPERATIONS: CleanupOperationId[] =
  CLEANUP_OPERATIONS.filter((op) => op.defaultEnabled).map((op) => op.id);
