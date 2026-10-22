#!/usr/bin/env npx tsx
/**
 * check:pdf-one-page-reader — PDF PAGES ARE READ THROUGH ONE READER (PDF-PLAN U4).
 *
 * `files.pages` is the one authoritative PDF page map; the view
 * `public.pdf_unified_pages` (driven from it) is the only way PDF surfaces read
 * pages, and `features/pdf/data/pdfPages.ts` is the only module that queries
 * that view. A PDF surface that reads `docproc.processed_document_pages`
 * directly misses unextracted pages, rotation, exclusion and current order.
 *
 * WHAT THIS FLAGS, under the scanned dirs (tests and `.d.ts` skipped): any
 * `.from("processed_document_pages")` or `.from("pdf_unified_pages")` in a file
 * that is not on ALLOWED below. Every allowed entry is printed on every run.
 *
 *   pnpm check:pdf-one-page-reader
 *   pnpm check:pdf-one-page-reader --self-test   # proves the matcher flags and passes
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const SCAN_DIRS = ["features", "app", "components", "lib", "hooks", "utils", "providers"];
const SKIP_DIRS = new Set(["node_modules", ".next", "__tests__", "__snapshots__"]);

/** Path prefix -> tables it may read, and why. */
const ALLOWED: Array<{ prefix: string; tables: ReadonlySet<string>; why: string }> = [
  {
    prefix: "features/pdf/data/pdfPages.ts",
    tables: new Set(["pdf_unified_pages"]),
    why: "THE PDF page reader",
  },
  {
    prefix: "features/page-extraction/",
    tables: new Set(["processed_document_pages"]),
    why: "page-extraction job engine reads chunk previews from docproc (kept, PDF-PLAN §2 step 6)",
  },
  {
    prefix: "features/sources/",
    tables: new Set(["processed_document_pages"]),
    why: "Source portions of every kind (web page, transcript, scrape), keyed by processed document; not PDF pages",
  },
  {
    prefix: "features/rag/",
    tables: new Set(["processed_document_pages"]),
    why: "Knowledge citations/verification over Source portions of every kind; not PDF pages",
  },
];

const FROM_RE = /\.from\(\s*["'](processed_document_pages|pdf_unified_pages)["']\s*\)/g;

export function findingsFor(path: string, text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(FROM_RE)) {
    const table = m[1];
    const ok = ALLOWED.some((a) => path.startsWith(a.prefix) && a.tables.has(table));
    if (!ok) {
      const line = text.slice(0, m.index ?? 0).split("\n").length;
      out.push(`${path}:${line}  reads ${table} directly; use features/pdf/data/pdfPages.ts`);
    }
  }
  return out;
}

function walk(dir: string, acc: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts") && !/\.(test|spec)\.tsx?$/.test(name)) acc.push(full);
  }
}

function selfTest(): number {
  const cases: Array<[string, string, number]> = [
    ["features/pdf/scanner/processing.ts", `db.from("processed_document_pages").select("id")`, 1],
    ["features/pdf-extractor/x.ts", `supabase.from('pdf_unified_pages').select()`, 1],
    ["features/files/y.tsx", `docprocDb(s).from( "processed_document_pages" )`, 1],
    ["features/pdf/data/pdfPages.ts", `supabase.from("pdf_unified_pages").select()`, 0],
    ["features/pdf/data/pdfPages.ts", `db.from("processed_document_pages")`, 1],
    ["features/page-extraction/hooks/useChunkPreview.ts", `db.from("processed_document_pages")`, 0],
    ["features/sources/api/processedDocumentPages.ts", `db.from("processed_document_pages")`, 0],
    ["features/rag/hooks/x.ts", `db.from("pdf_unified_pages")`, 1],
    ["features/pdf/z.ts", `// processed_document_pages is read elsewhere`, 0],
  ];
  let bad = 0;
  for (const [path, text, want] of cases) {
    const got = findingsFor(path, text).length;
    if (got !== want) {
      bad++;
      console.error(`self-test FAIL ${path}: want ${want} finding(s), got ${got}`);
    }
  }
  console.log(bad ? `self-test: ${bad} failure(s)` : `self-test ok (${cases.length} cases)`);
  return bad ? 1 : 0;
}

function main(): number {
  if (process.argv.includes("--self-test")) return selfTest();
  const files: string[] = [];
  for (const d of SCAN_DIRS) walk(join(ROOT, d), files);
  const findings: string[] = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    if (!text.includes("processed_document_pages") && !text.includes("pdf_unified_pages")) continue;
    findings.push(...findingsFor(relative(ROOT, f), text));
  }
  for (const a of ALLOWED) console.log(`allowed  ${a.prefix}  (${[...a.tables].join(", ")}): ${a.why}`);
  if (findings.length) {
    console.error(`\ncheck:pdf-one-page-reader: ${findings.length} direct page read(s) outside the one reader:`);
    for (const f of findings) console.error(`  ${f}`);
    return 1;
  }
  console.log(`check:pdf-one-page-reader: clean (${files.length} files scanned)`);
  return 0;
}

process.exit(main());
