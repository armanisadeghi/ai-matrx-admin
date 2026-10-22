#!/usr/bin/env npx tsx
/**
 * check:media-src-door — an image's pixels come through ONE door: `useMediaSrc`.
 *
 * `useMediaResolution(ref).resolution.src` is the durable ADDRESS of a file,
 * not a URL every element can load. For private pixels the media client
 * answers `transport: "blob"`: the address is a bearer-authenticated byte
 * route, and binding it to `<img>`, a CSS background, `new Image()` or a
 * canvas renders a broken image wherever third-party cookies are blocked.
 * That shipped at least six times (scanner thumbnails 2026-10-22, the image
 * viewer, the image editor/avatar/annotate sources, the multi-file viewer,
 * HR photos, Spaces covers). `useMediaSrc` (@ai-matrx/media/core) makes the
 * transport decision once and wires the client's recovery; `<InlineMediaRef>`
 * renders through it.
 *
 * WHAT THIS FLAGS, in shipped app code and in every shared package except the
 * two that own the lanes (`media`, `files`):
 *   1. any read of `resolution.src` / `resolution?.src`;
 *   2. an element `src={pythonFileInlineUrl(…)}` / `src={fileUrls(…)…}` —
 *      a hand-built byte route bound straight to an element;
 *   3. a `useViewerDisplayUrl(…)` call — the viewer's address helper.
 *
 * Only the DIRECT shapes are guarded: an address first stored in a variable and
 * bound to an element later is not traced — review that shape by hand.
 *
 * A read that is NOT pixels (a `<video>`/`<audio>` element, which the files
 * session authenticates; a link href, which is a top-level navigation; a
 * boolean gate) carries `// media-src-ok: <why>` on its line or the line
 * above. The reason is required — a bare marker fails.
 *
 * Exit 1 on any finding. `--self-test` proves the check can fail.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { exitAfterDrain } from "./lib/exit-after-drain";

const ROOT = process.cwd();
const SELF_TEST = process.argv.includes("--self-test");
const APP_DIRS = ["features", "components", "app", "lib", "hooks", "providers", "utils"];
const SHARED_ROOT = "../aidream/apps/shared";
/** The packages that OWN resolve and the blob lane — the door itself lives there. */
const OWNER_PACKAGES = new Set(["media", "files"]);

const RESOLUTION_SRC = /\w*resolution\s*\??\s*\.\s*src\b/gi;
const HAND_BUILT_SRC = /\bsrc=\{\s*(pythonFileInlineUrl|fileUrls)\(/g;
/** The viewer's ADDRESS helper — fine for credentialed loaders, never for pixels. */
const VIEWER_ADDRESS = /\buseViewerDisplayUrl\(/g;
const ANNOTATION = /\/\/\s*media-src-ok:\s*(\S.*)?$/;

export interface Finding {
  line: number;
  text: string;
  why: string;
}

function isAnnotated(lines: string[], index: number): boolean {
  // Same line or the line directly above — never a neighbour's marker.
  for (const i of [index, index - 1]) {
    const m = lines[i]?.match(ANNOTATION);
    if (m) return Boolean(m[1]?.trim());
  }
  return false;
}

export function mediaSrcFindings(relPath: string, source: string): Finding[] {
  if (/\.(test|spec)\.tsx?$/.test(relPath) || relPath.includes("/__tests__/")) {
    return [];
  }
  const lines = source.split("\n");
  const findings: Finding[] = [];
  const scan = (re: RegExp, why: string) => {
    for (const m of source.matchAll(re)) {
      const index = source.slice(0, m.index).split("\n").length - 1;
      const text = lines[index]?.trim() ?? "";
      // Prose about the rule (a comment line) is not a binding.
      if (/^(\*|\/\/|\/\*)/.test(text)) continue;
      if (isAnnotated(lines, index)) continue;
      findings.push({ line: index + 1, text, why });
    }
  };
  scan(RESOLUTION_SRC, "resolution.src read — pixels must come through useMediaSrc");
  scan(HAND_BUILT_SRC, "hand-built byte route bound to an element — use useMediaSrc");
  scan(VIEWER_ADDRESS, "viewer address read — pixels/frames use useViewerPixelUrl or useMediaSrc");
  return findings;
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".next")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

let sharedScanned = false;

function scanDirs(): string[] {
  const dirs = APP_DIRS.map((d) => join(ROOT, d));
  let packages: string[] = [];
  try {
    packages = readdirSync(join(ROOT, SHARED_ROOT));
    sharedScanned = true;
  } catch {
    // No sibling aidream checkout: the app half still runs, and says so.
  }
  for (const pkg of packages) {
    if (OWNER_PACKAGES.has(pkg)) continue;
    dirs.push(join(ROOT, SHARED_ROOT, pkg, "src"));
  }
  return dirs;
}

function selfTest(): void {
  const cases: Array<[string, string, number]> = [
    // The scanner-thumbnail shape: an <img> fed by resolution.src.
    ["features/x/Thumb.tsx", "  const src = useMediaResolution(id).resolution?.src ?? null;\n", 1],
    // Split across lines, as prettier writes it.
    ["features/x/Audio.tsx", "  const url = useMediaResolution(id).resolution\n    ?.src ?? null;\n", 1],
    ["features/x/Photo.tsx", "      <img src={pythonFileInlineUrl(id)} />\n", 1],
    ["features/x/Viewer.tsx", "  const { url } = useViewerDisplayUrl(source);\n", 1],
    // Any resolution-named variable, any case.
    ["features/x/Prev.tsx", "  const u = previewResolution?.src;\n", 1],
    // A marker two lines up belongs to another read.
    ["features/x/Far.tsx", "  // media-src-ok: link\n  const a = 1;\n  const s = r.resolution?.src;\n", 1],
    // A bare marker with no reason is not an exemption.
    ["features/x/Bare.tsx", "  // media-src-ok:\n  const s = r.resolution?.src;\n", 1],
    // Annotated legitimate uses pass.
    ["features/x/Video.tsx", "  // media-src-ok: <video> element, cookie lane\n  const s = r.resolution?.src;\n", 0],
    ["features/x/Link.tsx", "  const href = r.resolution?.src; // media-src-ok: link href (navigation)\n", 0],
    // The door, prose and tests are not findings.
    ["features/x/Door.tsx", "  const { src } = useMediaSrc(id);\n", 0],
    ["features/x/Doc.tsx", " * never bind resolution.src to an <img>\n", 0],
    ["features/x/T.test.tsx", "  const s = r.resolution?.src;\n", 0],
  ];
  const failures = cases.filter(
    ([path, src, want]) => mediaSrcFindings(path, src).length !== want,
  );
  if (failures.length) {
    for (const [path] of failures) console.error(`  self-test case failed: ${path}`);
    console.error("check:media-src-door self-test FAILED — the check no longer tells a raw address binding from the door.");
    exitAfterDrain(1);
  }
  console.log(
    "check:media-src-door self-test PASSED — a raw resolution.src or hand-built byte route is caught (one-line and split); an annotated element/link use, the door, prose and tests are not.",
  );
  exitAfterDrain(0);
}

function main(): void {
  if (SELF_TEST) {
    selfTest();
    return;
  }
  const findings: string[] = [];
  for (const dir of scanDirs()) {
    for (const file of walk(dir)) {
      const rel = relative(ROOT, file).split("\\").join("/");
      for (const hit of mediaSrcFindings(rel, readFileSync(file, "utf8"))) {
        findings.push(`${rel}:${hit.line}  ${hit.text}\n      ${hit.why}`);
      }
    }
  }
  if (findings.length) {
    console.error(
      `check:media-src-door FAILED — ${findings.length} place(s) take a file's address where its pixels belong.`,
    );
    console.error(
      "Private images resolve to a bearer-authenticated byte route; an <img>, CSS background or canvas bound to it renders broken.",
    );
    console.error(
      "Remedy: const media = useMediaSrc(ref) (crossOrigin for canvas); bind media.src, key on media.retryKey, onError={media.onLoadError}. A <video>/<audio>/link use: add `// media-src-ok: <why>`.",
    );
    for (const finding of findings) console.error(`  ${finding}`);
    exitAfterDrain(1);
  }
  if (!sharedScanned) {
    console.log(
      `check:media-src-door SKIPPED the shared packages — no ${SHARED_ROOT} checkout here.`,
    );
  }
  console.log(
    `check:media-src-door PASSED — no raw file address reaches an image in ${
      sharedScanned ? "the app or the shared packages" : "the app (packages not scanned)"
    }.`,
  );
  exitAfterDrain(0);
}

main();
