/**
 * scripts/check-pdf-one-home.ts — `pnpm check:pdf-one-home` (PDF-PLAN U8).
 *
 * There is ONE client home for PDFs: `features/pdf` (the workspace in `features/pdf/workspace`, the viewer in
 * `@ai-matrx/media/viewers/pdf`, the chrome in `@ai-matrx/office/pdf`). This guard REPORTS, loudly, when a
 * second home appears. It never blocks a release (exit 0) unless run with `--strict`.
 *
 * Findings:
 *  - engine: a file outside the PDF home imports `pdfjs-dist` or `react-pdf`;
 *  - workspace: a file outside the PDF home imports `@ai-matrx/office/pdf` (a second workspace mount);
 *  - retired: a retired home or shim exists again (the paths and names below);
 *  - direct-call: a file outside the PDF home writes a `/utilities/pdf/` URL string.
 *
 * `--self-test` plants a violation in a temp tree and proves the scan reports it, then passes when removed.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type Finding = { rule: "engine" | "workspace" | "retired" | "direct-call"; file: string; line?: number; detail: string };

/** The PDF home and the retained studios that still call the PDF API directly (they shrink as they fold in). */
const HOME = ["features/pdf/", "app/(core)/pdf/"];
const RETAINED = ["features/pdf-extractor/", "features/file-analysis/"];
const RETIRED_PATHS = [
  "features/pdf-demo",
  "features/files/hooks/usePdfRemoteSource.ts",
  "features/pdf-extractor/components/PdfExtractorWorkspace.tsx",
  "features/pdf-extractor/studio/PdfManipulationWorkbench.tsx",
  "features/file-analysis/studio/StudioShell.tsx",
  "app/(core)/files/f/[fileId]/studio",
  "app/(dev)/demos/pdf-processing",
  "features/pdf-extractor/studio/PdfStudioShell.tsx",
  "features/pdf-extractor/studio/PdfStudioMobile.tsx",
  "features/pdf-extractor/studio/PdfStudioSidebar.tsx",
  "features/pdf-extractor/studio/PdfStudioInspector.tsx",
  "features/pdf-extractor/components/ManipulationPanel.tsx",
  "app/(core)/tools/pdf-extractor/PdfStudioRouteClient.tsx",
];
const SCAN_DIRS = ["app", "components", "features", "lib", "hooks", "utils", "providers"];

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next" || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) out.push(full);
  }
}

export function scan(root: string): Finding[] {
  const findings: Finding[] = [];
  for (const p of RETIRED_PATHS) {
    if (fs.existsSync(path.join(root, p))) findings.push({ rule: "retired", file: p, detail: "a retired PDF home or shim is back" });
  }
  const files: string[] = [];
  for (const d of SCAN_DIRS) walk(path.join(root, d), files);
  for (const abs of files) {
    const rel = path.relative(root, abs).split(path.sep).join("/");
    const inHome = HOME.some((h) => rel.startsWith(h));
    const text = fs.readFileSync(abs, "utf8");
    const lines = text.split("\n");
    lines.forEach((l, i) => {
      if (/\busePdfDemoApi\b/.test(l) && !rel.startsWith("scripts/")) findings.push({ rule: "retired", file: rel, line: i + 1, detail: "usePdfDemoApi (the retired alias of usePdfClient)" });
      if (inHome) return;
      if (/^\s*(import|export)\b.*from\s+["'](pdfjs-dist|react-pdf)(\/[^"']*)?["']/.test(l) || /\b(import|require)\(\s*["'](pdfjs-dist|react-pdf)/.test(l)) {
        findings.push({ rule: "engine", file: rel, line: i + 1, detail: "imports the PDF engine outside the PDF home" });
      }
      if (/from\s+["']@ai-matrx\/office\/pdf["']/.test(l)) findings.push({ rule: "workspace", file: rel, line: i + 1, detail: "mounts the PDF workspace outside the PDF home" });
      if (/["'`]\/utilities\/pdf\//.test(l) && !RETAINED.some((h) => rel.startsWith(h))) findings.push({ rule: "direct-call", file: rel, line: i + 1, detail: "writes a /utilities/pdf/ URL; use usePdfClient" });
    });
  }
  return findings;
}

function selfTest(): number {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-one-home-"));
  const put = (rel: string, body: string) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  };
  put("features/pdf/ok.tsx", 'import { Document } from "react-pdf";\n');
  put("features/other/ok.ts", 'export const x = 1;\n');
  const clean = scan(dir);
  put("features/other/bad.tsx", 'import { Document } from "react-pdf";\nconst u = "/utilities/pdf/merge";\nimport { PdfWorkspace } from "@ai-matrx/office/pdf";\n');
  put("features/pdf-demo/x.ts", "export {};\n");
  const dirty = scan(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  const rules = new Set(dirty.map((f) => f.rule));
  const ok = clean.length === 0 && ["engine", "direct-call", "workspace", "retired"].every((r) => rules.has(r as Finding["rule"]));
  console.log(ok ? "check:pdf-one-home self-test OK (clean tree silent; planted violations reported)" : `check:pdf-one-home self-test FAILED clean=${clean.length} rules=${[...rules].join(",")}`);
  return ok ? 0 : 1;
}

if (process.argv.includes("--self-test")) {
  process.exit(selfTest());
} else if (require.main === module) {
  const findings = scan(process.cwd());
  if (!findings.length) {
    console.log("check:pdf-one-home: one PDF home. Clean.");
  } else {
    console.log(`\n!!! check:pdf-one-home: ${findings.length} place(s) outside the one PDF home (features/pdf) !!!`);
    for (const f of findings) console.log(`  [${f.rule}] ${f.file}${f.line ? `:${f.line}` : ""}  ${f.detail}`);
    console.log("Report only: this never blocks a release. Fold the code into features/pdf, or into the workspace as a host tool.\n");
  }
  process.exit(process.argv.includes("--strict") && findings.length ? 1 : 0);
}
