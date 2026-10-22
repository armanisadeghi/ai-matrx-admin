/**
 * ONE call path to the files server (lane 6, 2026-10-22). Every file-server call rides
 * `@ai-matrx/files` over THE website's `@ai-matrx/api` client (`serverApi`): the generated contract
 * decides which deployment answers, and serverApi carries identity, organization admission, the
 * admin server toggle, refusal notices and Error Inspector capture. This guard fails when app code
 * grows a second way in:
 *   - a hard-coded files host (`"https://files.matrxserver.com…"`),
 *   - a second files client (`createMatrxFilesClient(`; build it with `createFiles({ api })`),
 *   - a hand-built file-server URL or path (`${base}/files/${id}`, `` `/files/${id}/…` ``,
 *     `"/files/{file_id}/…"`) — use the generated operation instead.
 * The files below predate the rule and still build their paths for python-client; they are
 * pinned at today's count so the number only goes down (convert them to generated operations and
 * delete their rows).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const SCANNED = ["features", "lib", "components", "app", "hooks", "providers", "utils"];

/** Known hand-built paths (python-client callers to aidream file routes), at today's count. */
const KNOWN_HAND_BUILT_PATHS: Record<string, number> = {
  "features/file-analysis/api/file-analysis.ts": 9,
  "features/rag/api/rag-jobs.ts": 2,
  "features/hr/exports/components/ExportArtifactDownload.tsx": 1,
  "app/(dev)/demos/cloud-files-debug/CloudFilesDebugClient.tsx": 2,
};

/** App PAGE routes under /files (a redirect between the app's own pages), never a server call. */
const APP_PAGE_ROUTE_FILES = new Set(["app/(core)/files/[...path]/page.tsx"]);

/** Where a files host literal is the routing default itself (the env fallback), not a call. */
const HOST_LITERAL_HOMES = new Set(["lib/api/service-routing.ts"]);

const RULES: { name: string; pattern: RegExp }[] = [
  { name: "hard-coded files host", pattern: /["'`]https?:\/\/files\.matrxserver\.com/g },
  { name: "second files client", pattern: /\bcreateMatrxFilesClient\s*(?:<[^>]*>)?\s*\(/g },
  // `${base}/files/${id}` or a template that starts with a server path `/files/${id}` — never the
  // app's own pages (`/files/f/<id>`, `/files/folder/<id>`).
  { name: "hand-built files URL", pattern: /`(?:\$\{[^}`]+\})?\/(?:files|assets)\/(?!f\/|folder\/)\$\{/g },
  { name: "hand-built files path template", pattern: /["'`]\/(?:files|assets)\/\{[a-z_]+\}\//g },
];

export interface Violation {
  file: string;
  rule: string;
  line: number;
  text: string;
}

/** A comment line (`//`, `/*`, ` * `): prose about a route is not a call. */
const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*)/;

/** Every rule hit in one file's code lines. */
export function findViolations(file: string, text: string): Violation[] {
  const out: Violation[] = [];
  const lines = text.split("\n");
  lines.forEach((source, index) => {
    if (COMMENT_LINE.test(source)) return;
    for (const rule of RULES) {
      if (rule.name === "hard-coded files host" && HOST_LITERAL_HOMES.has(file)) continue;
      for (const _match of source.matchAll(rule.pattern)) {
        out.push({ file, rule: rule.name, line: index + 1, text: source.trim() });
      }
    }
  });
  return out;
}

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__" || name === "test-support" || name.startsWith(".")) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) sourceFiles(path, acc);
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) acc.push(path);
  }
  return acc;
}

describe("one call path to the files server", () => {
  it("catches each way in (the detector can fail)", () => {
    const planted = [
      'const base = "https://files.matrxserver.com";',
      "export const c = createMatrxFilesClient<DurableSrc>({ credentials, filesBaseUrl });",
      "fetch(`${filesBase()}/files/${fileId}/download`);",
      "getJson(`/files/${id}/versions`);",
      'buildMatrxRequestUrl(base, "/files/{file_id}/download", { file_id });',
    ].join("\n");
    expect(findViolations("features/x.ts", planted).map((v) => v.rule)).toEqual([
      "hard-coded files host",
      "second files client",
      "hand-built files URL",
      "hand-built files URL",
      "hand-built files path template",
    ]);
    // The app's own pages are not server calls.
    expect(findViolations("features/x.ts", "href={`/files/f/${id}`}; push(`/files/folder/${id}`);")).toEqual([]);
  });

  it("app code has no second files client, host literal or hand-built files URL", () => {
    const found: Violation[] = [];
    for (const top of SCANNED) {
      for (const path of sourceFiles(join(ROOT, top))) {
        found.push(...findViolations(relative(ROOT, path), readFileSync(path, "utf8")));
      }
    }
    const known = new Map<string, number>();
    const unexpected: Violation[] = [];
    for (const v of found) {
      if (APP_PAGE_ROUTE_FILES.has(v.file)) continue;
      if (v.rule === "hand-built files URL" && v.file in KNOWN_HAND_BUILT_PATHS) {
        known.set(v.file, (known.get(v.file) ?? 0) + 1);
        continue;
      }
      unexpected.push(v);
    }
    expect(unexpected.map((v) => `${v.file}:${v.line} [${v.rule}] ${v.text}`)).toEqual([]);
    // The known list only shrinks: a fixed file must leave the list, a new hit must not hide in it.
    for (const [file, count] of Object.entries(KNOWN_HAND_BUILT_PATHS)) {
      expect([file, known.get(file) ?? 0]).toEqual([file, count]);
    }
  });
});
