/**
 * Build the kind sandbox frame runtime:
 *   features/content-ir/sandbox/runtime/entry.tsx   →  public/kind-sandbox.js
 *   features/content-ir/sandbox/runtime/sandbox.css →  public/kind-sandbox.css
 *
 * Run via `pnpm build:kind-sandbox`, wired into `pnpm build` beside
 * `build:sw` so a stale artifact can never ship. The frame has
 * `connect-src 'none'`, so this artifact IS the frame's entire world: a stale
 * bundle is a silently wrong renderer, not a cache miss.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * TWO AUDITS, BOTH BLOCKING. They are the point of this script, not a garnish.
 *
 *  (1) THE GRAPH AUDIT names the module that broke the rule. Every file
 *      esbuild actually put in the output is checked against a list of things
 *      the frame may never contain — Next internals, the Supabase client, the
 *      window-panel system. It fails with the import CHAIN from the entry to
 *      the offender, because "something pulled Supabase in" is not actionable
 *      and "CopyButtons → AiCopyMenu → useExportActions → … → supabase/ssr" is.
 *
 *  (2) THE ARTIFACT AUDIT reads the minified bytes that will actually be
 *      served and refuses call shapes that can reach the network or another
 *      document: `fetch(`, `new XMLHttpRequest`, `new WebSocket`,
 *      `new EventSource`, `sendBeacon(`, `window.top`, `window.parent`,
 *      `parent.postMessage`. It matches CALL shapes, never bare words: the
 *      code-runtime gate.s banned-identifier vocabulary is legitimately
 *      present in the bundle as string data, and a string is not a capability.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * THE FRAME SUBSTITUTIONS (esbuild `alias`) — each one has a module with
 * a header explaining why it exists and what the author sees instead:
 *   @ai-matrx/chat/ui/markdown-stream/MarkdownStream → FrameMarkdown (ruling 1; the
 *     module moved into chat with P29a — stored-scope.ts requires it by that path,
 *     and an alias left on the old app path matches nothing, so the whole chat
 *     renderer, next/dynamic and Supabase landed in the frame: v0.4.2984–2986)
 *   @/components/agent-copy/CopyForAiButton   → FrameCopyForAiButton
 *   @/features/google-workspace/export/sendToGoogle → FrameSendToGoogle
 *   @/components/matrx/buttons/markdown-copy-html → FrameCopyHtml (plain-text copy, no KaTeX)
 *   @/lib/scoped-config/sessionKnob           → FrameSessionKnob  (knobs answer "no answer yet")
 * They are aliases rather than database migrations, so the live component
 * bodies are migrated to the frame-safe implementations without a row
 * changing — including the five that import MarkdownStream.
 */
import { build, type Metafile, type Plugin } from "esbuild";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { formatFileSize } from "@ai-matrx/kit/format";
import { createHash } from "node:crypto";
import { FRAME_LIB_CHUNKS, FRAME_LIBS_KEY_NAME, FRAME_SHARED_KEY_NAME } from "./runtime/frame-lib-chunks";

const __dirname = dirname(fileURLToPath(import.meta.url));
// features/content-ir/sandbox → repo root: 3 levels up.
const ROOT = resolve(__dirname, "../../..");

const JS_ENTRY = resolve(__dirname, "runtime/entry.tsx");
const CSS_ENTRY = resolve(__dirname, "runtime/sandbox.css");
const JS_OUT = resolve(ROOT, "public/kind-sandbox.js");
const CSS_OUT = resolve(ROOT, "public/kind-sandbox.css");
/** On-demand library chunks (runtime/frame-lib-chunks.ts), content-hashed. */
const LIB_DIR = resolve(ROOT, "public/kind-sandbox-lib");

const FRAME_DESIGN_SYSTEM_ROOT = resolve(
  __dirname,
  "runtime/FrameDesignSystemRoot.ts",
);
const REAL_DESIGN_SYSTEM_ROOT = resolve(
  ROOT,
  "node_modules/@ai-matrx/design-system/dist/index.js",
);
const frameDesignSystemRoot: Plugin = {
  name: "frame-design-system-root",
  setup(b) {
    b.onResolve({ filter: /^@ai-matrx\/design-system$/ }, (args) => ({
      path:
        args.importer === FRAME_DESIGN_SYSTEM_ROOT
          ? REAL_DESIGN_SYSTEM_ROOT
          : FRAME_DESIGN_SYSTEM_ROOT,
    }));
  },
};

const ALIAS: Record<string, string> = {
  "@ai-matrx/chat/ui/markdown-stream/MarkdownStream": resolve(
    __dirname,
    "runtime/FrameMarkdown.tsx",
  ),
  "@/components/agent-copy/CopyForAiButton": resolve(
    __dirname,
    "runtime/FrameCopyForAiButton.tsx",
  ),
  "@/components/agent-copy/CopyButtons": resolve(
    __dirname,
    "runtime/FrameCopyButtons.tsx",
  ),
  // A shape's image: the app's canonical image block cannot run in the frame;
  // the kit's frame-safe image (Expand/Share relayed to the host) stands in.
  "@/features/content-ir/react/kind-image/AppKindImage": resolve(
    __dirname,
    "runtime/FrameKindImage.tsx",
  ),
  // Word/PDF export (pdfmake + docx) — announced stand-in; the menu's other
  // formats are the real ones.
  "@ai-matrx/print/document": resolve(
    __dirname,
    "runtime/FramePrintDocument.ts",
  ),
  "@/components/agent-copy/useAlchemyDisclosure": resolve(
    __dirname,
    "runtime/FrameAlchemyDisclosure.ts",
  ),
  "@/components/ui/textarea": resolve(
    __dirname,
    "runtime/FrameTextarea.tsx",
  ),
  "@/components/errors/useErrorSurfaceSnapshot": resolve(
    __dirname,
    "runtime/FrameErrorSurfaceSnapshot.ts",
  ),
  "@/features/google-workspace/export/sendToGoogle": resolve(
    __dirname,
    "runtime/FrameSendToGoogle.ts",
  ),
  "@/components/matrx/buttons/markdown-copy-html": resolve(
    __dirname,
    "runtime/FrameCopyHtml.ts",
  ),
  "@/lib/scoped-config/sessionKnob": resolve(
    __dirname,
    "runtime/FrameSessionKnob.ts",
  ),
};

/** Module-path fragment → why the frame may not contain it. */
const FORBIDDEN_MODULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\/next\/dist\//, "Next.js internals"],
  [/^node:|(^|\/)node_modules\/node:/, "a Node.js builtin (the frame is a browser document)"],
  [/\/@supabase\//, "the Supabase client (a data door)"],
  [
    /features\/window-panels\//,
    "the window-panel system (it owns the host page's layout)",
  ],
  [/utils\/supabase\//, "a Supabase client factory"],
  // The APP's store only — recharts ships its own private redux store,
  // which is internal to the chart library and reaches nothing of ours.
  [/^lib\/redux\//, "the app's Redux store"],
  [/^features\/[^/]+\/redux\//, "a feature's Redux slice"],
];

/**
 * Call shapes that can reach the network, another document, or durable
 * browser state. The storage and dynamic-import shapes were added 2026-09-12
 * (V-27 finding D): the frame has NO legitimate use for persistence — its
 * whole state is the props the host sends — and `import(` would fetch, which
 * `connect-src 'none'` refuses at run time but which must never be in the
 * bundle in the first place.
 */
const FORBIDDEN_CALLS: ReadonlyArray<readonly [RegExp, string]> = [
  [/(^|[^.\w$"'`])fetch\s*\(/, "a fetch() call"],
  [/new\s+XMLHttpRequest/, "an XMLHttpRequest"],
  [/new\s+WebSocket\s*\(/, "a WebSocket"],
  [/new\s+EventSource\s*\(/, "an EventSource"],
  [/sendBeacon\s*\(/, "a navigator.sendBeacon() call"],
  [/window\s*\.\s*top\b/, "a window.top reference"],
  [/window\s*\.\s*parent\b/, "a window.parent reference"],
  [/parent\s*\.\s*postMessage\s*\(/, "a parent.postMessage() call"],
  [/next\/dist/, "a Next.js internal path"],
  [/(^|[^.\w$"'`])localStorage\b/, "a localStorage access"],
  [/(^|[^.\w$"'`])sessionStorage\b/, "a sessionStorage access"],
  [/\.\s*localStorage\b/, "a localStorage access"],
  [/\.\s*sessionStorage\b/, "a sessionStorage access"],
  [/indexedDB\s*\./, "an IndexedDB access"],
  // READ only. Writing the clipboard IS the copy bar — the one capability
  // an author is explicitly given — and it cannot leak anything: the value
  // is the content the reader is already looking at. READING the clipboard
  // is the exfiltration shape (whatever the user last copied, anywhere),
  // and nothing in the frame has any business doing it.
  [/clipboard\s*\.\s*read/, "a clipboard READ"],
  [/(^|[^.\w$"'`])import\s*\(/, "a dynamic import()"],
];

function shorten(p: string): string {
  return p.replace(/node_modules\/\.pnpm\/[^/]+\/node_modules\//, "~/");
}

/** Breadth-first import chain from the entry to `target`, for the error text. */
function importChain(meta: Metafile, entry: string, target: string): string[] {
  const seen = new Set<string>();
  const queue: Array<[string, string[]]> = [[entry, [entry]]];
  while (queue.length > 0) {
    const [node, path] = queue.shift()!;
    if (seen.has(node)) continue;
    seen.add(node);
    if (node === target) return path;
    for (const imported of meta.inputs[node]?.imports ?? []) {
      queue.push([imported.path, [...path, imported.path]]);
    }
  }
  return [target];
}


const FRAME_INJECT = [
  resolve(__dirname, "runtime/frame-storage.ts"),
  resolve(__dirname, "runtime/frame-network.ts"),
];

// THE FRAME HAS NO STORAGE (V-27 finding D) and NO NETWORK (CSP connect-src
// 'none'): both are replaced with announcing stand-ins in the main bundle and
// in every on-demand chunk, so the audit below can refuse the real names.
const FRAME_DEFINE: Record<string, string> = {
  "process.env.NODE_ENV": '"production"',
  localStorage: "__matrxFrameStorage",
  sessionStorage: "__matrxFrameStorage",
  "window.localStorage": "__matrxFrameStorage",
  "window.sessionStorage": "__matrxFrameStorage",
  "globalThis.localStorage": "__matrxFrameStorage",
  "globalThis.sessionStorage": "__matrxFrameStorage",
  fetch: "__matrxFrameFetch",
  "window.fetch": "__matrxFrameFetch",
  "globalThis.fetch": "__matrxFrameFetch",
  XMLHttpRequest: "__matrxFrameXhr",
  "window.XMLHttpRequest": "__matrxFrameXhr",
  "globalThis.XMLHttpRequest": "__matrxFrameXhr",
};

// ───────────────────────────────────────────────────────────────────────────
// ON-DEMAND LIBRARY CHUNKS (runtime/frame-lib-chunks.ts). Each is its own
// classic-script IIFE, loaded by the frame only when a component imports it,
// so the main bundle does not carry three / xlsx / pdf / motion for everyone.
// They are built with the SAME inject/define stand-ins and pass the SAME
// artifact audit as the main bundle — a chunk that reaches the network or
// another document fails the build, it is never shipped.
// React / ReactDOM / the JSX runtime are EXTERNAL: they resolve to the
// frame's one copy (runtime/frame-shared.ts).
// ───────────────────────────────────────────────────────────────────────────

const SHARED_SPECIFIERS = /^(react|react-dom|react-dom\/client|react\/jsx-runtime|react\/jsx-dev-runtime)$/;

const frameSharedReact: Plugin = {
  name: "frame-shared-react",
  setup(b) {
    b.onResolve({ filter: SHARED_SPECIFIERS }, (args) => ({
      path: args.path,
      namespace: "frame-shared",
    }));
    b.onLoad({ filter: /.*/, namespace: "frame-shared" }, (args) => ({
      contents: `module.exports = globalThis[Symbol.for(${JSON.stringify(FRAME_SHARED_KEY_NAME)})][${JSON.stringify(args.path)}];`,
      loader: "js",
    }));
  },
};

/** KaTeX's stylesheet lists woff2 + woff + ttf per font; the frame only needs woff2 (inlined). */
const katexWoff2Only: Plugin = {
  name: "katex-woff2-only",
  setup(b) {
    b.onLoad({ filter: /katex\.min\.css$/ }, async (args) => {
      const css = await readFile(args.path, "utf8");
      return {
        contents: css
          .replace(/,url\([^)]*\.woff\)\s*format\("woff"\)/g, "")
          .replace(/,url\([^)]*\.ttf\)\s*format\("truetype"\)/g, ""),
        loader: "css",
        resolveDir: dirname(args.path),
      };
    });
  },
};


/**
 * pdf.js can only start a Worker (or its form-scripting sandbox) from a URL by
 * a dynamic `import()`, and the frame can do neither (opaque origin, no
 * `worker-src`, no fetch). It runs its worker IN-PAGE when
 * `globalThis.pdfjsWorker` is present (the pdf chunk sets it). The dynamic
 * `import()` shapes that remain are the by-URL paths that can never run here;
 * they become named refusals instead of `import(` in the served bytes. A
 * pdf.js upgrade that moves them fails this build, loudly.
 */
const REFUSE_BY_URL = (what: string) =>
  `Promise.reject(new Error("${what} cannot start inside the sandbox frame"))`;

const PDFJS_PATCHES: ReadonlyArray<{ file: RegExp; find: RegExp; replace: string }> = [
  {
    file: /pdfjs-dist[\\/]build[\\/]pdf\.mjs$/,
    find: /const wrapper = `await import\("\$\{url\}"\);`;/,
    replace: 'const wrapper = "";',
  },
  {
    file: /pdfjs-dist[\\/]build[\\/]pdf\.mjs$/,
    find: /await import\(\s*\/\*webpackIgnore: true\*\/\s*\/\*@vite-ignore\*\/\s*this\.workerSrc\)/,
    replace: `await ${REFUSE_BY_URL("A pdf.js worker")}`,
  },
  {
    file: /pdfjs-dist[\\/]build[\\/]pdf\.worker\.mjs$/,
    find: /await import\(\s*\/\*webpackIgnore: true\*\/\s*\/\*@vite-ignore\*\/\s*`\$\{WasmImage\.#wasmUrl\}\$\{this\._noWasmFilename\}`\)/,
    replace: `await ${REFUSE_BY_URL("The pdf.js image decoder")}`,
  },
  {
    file: /pdfjs-dist[\\/]web[\\/]pdf_viewer\.mjs$/,
    find: /import\(\s*\/\*webpackIgnore: true\*\/\s*\/\*@vite-ignore\*\/\s*sandboxBundleSrc\)/,
    replace: REFUSE_BY_URL("PDF form scripting"),
  },
];

const pdfjsNoWorkerUrl: Plugin = {
  name: "pdfjs-no-worker-url",
  setup(b) {
    b.onLoad({ filter: /pdfjs-dist[\\/](build[\\/]pdf|build[\\/]pdf\.worker|web[\\/]pdf_viewer)\.mjs$/ }, async (args) => {
      let text = await readFile(args.path, "utf8");
      for (const patch of PDFJS_PATCHES) {
        if (!patch.file.test(args.path)) continue;
        if (!patch.find.test(text)) {
          throw new Error(
            "pdfjs-dist moved a by-URL import(); update PDFJS_PATCHES in build-kind-sandbox.ts",
          );
        }
        text = text.replace(patch.find, () => patch.replace);
      }
      return { contents: text, loader: "js", resolveDir: dirname(args.path) };
    });
  },
};

const REG = `const L = (globalThis[Symbol.for(${JSON.stringify(FRAME_LIBS_KEY_NAME)})] ??= {});\n`;

const CHUNK_SOURCES: Record<string, string> = {
  "date-fns": `import * as m from "date-fns";\n${REG}L["date-fns"] = Promise.resolve({ "date-fns": m });`,
  lodash: `import lodash from "lodash";\n${REG}L.lodash = Promise.resolve({ lodash: Object.assign({ __esModule: true, default: lodash }, lodash) });`,
  motion: `import * as m from "motion/react";\n${REG}L.motion = Promise.resolve({ "motion/react": m });`,
  katex: `import * as m from "${resolve(__dirname, "runtime/libs/react-katex-frame.tsx")}";\nimport "katex/dist/katex.min.css";\n${REG}L.katex = Promise.resolve({ "react-katex": m });`,
  xlsx: `import { loadSheetJs } from "@ai-matrx/print/xlsx";\n${REG}L.xlsx = loadSheetJs().then((m) => ({ xlsx: m }));`,
  three: `import * as THREE from "three";\nimport * as fiber from "@react-three/fiber";\n${REG}L.three = Promise.resolve({ three: THREE, "@react-three/fiber": fiber });`,
  pdf: `import * as rp from "react-pdf";\nimport { WorkerMessageHandler } from "pdfjs-dist/build/pdf.worker.mjs";\n// The frame cannot start a Worker (opaque origin, no worker-src): pdf.js runs its\n// worker in-page when this global is present.\nglobalThis.pdfjsWorker = { WorkerMessageHandler };\n${REG}L.pdf = Promise.resolve({ "react-pdf": rp });`,
};


/**
 * The two shapes the artifact audit's `fetch(` rule cannot tell from a call:
 * a METHOD DEFINITION (`fetch(url){…}` — KaTeX's parser, pdf.js's CMap
 * factory) and one library's warning TEXT (three: "ImageBitmapLoader:
 * fetch() not supported."). Neither can reach the network; real calls were
 * already rewritten to the announcing stand-in by `define`, so they never
 * look like this. Nothing else is excused.
 */
function auditableChunkText(code: string): string {
  return code
    .replace(/(^|[^.\w$"'`])(async\s+)?fetch(\s*\([^()]*\)\s*\{)/g, "$1$2__definedMethod$3")
    .replace("ImageBitmapLoader: fetch() not supported.", "ImageBitmapLoader: unsupported.");
}

interface ChunkBuild {
  files: { js: string; css?: string };
  code: string;
  cssBytes: number;
  failures: string[];
}

async function buildChunk(name: string, source: string): Promise<ChunkBuild> {
  const outfile = resolve(LIB_DIR, `${name}.js`);
  const result = await build({
    stdin: { contents: source, resolveDir: ROOT, sourcefile: `chunk-${name}.ts`, loader: "ts" },
    outfile,
    write: false,
    bundle: true,
    minify: true,
    sourcemap: false,
    target: "es2020",
    format: "iife",
    platform: "browser",
    legalComments: "none",
    metafile: true,
    absWorkingDir: ROOT,
    tsconfig: resolve(ROOT, "tsconfig.json"),
    loader: {
      ".svg": "dataurl",
      ".png": "dataurl",
      ".woff2": "dataurl",
      ".woff": "dataurl",
      ".ttf": "dataurl",
    },
    alias: ALIAS,
    plugins: [frameSharedReact, katexWoff2Only, pdfjsNoWorkerUrl],
    inject: FRAME_INJECT,
    define: FRAME_DEFINE,
    logLevel: "warning",
  });
  const jsFile = result.outputFiles.find((f) => f.path.endsWith(".js"))!;
  const cssFile = result.outputFiles.find((f) => f.path.endsWith(".css"));
  const code = jsFile.text;
  const failures = auditArtifact(auditableChunkText(code)).map((f) => `[chunk ${name}] ${f}`);
  const hash = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 10);
  const jsName = `${name}.${hash(code)}.js`;
  await writeFile(resolve(LIB_DIR, jsName), code, "utf8");
  let cssName: string | undefined;
  if (cssFile) {
    cssName = `${name}.${hash(cssFile.text)}.css`;
    await writeFile(resolve(LIB_DIR, cssName), cssFile.text, "utf8");
  }
  return {
    files: { js: jsName, ...(cssName ? { css: cssName } : {}) },
    code,
    cssBytes: cssFile ? Buffer.byteLength(cssFile.text, "utf8") : 0,
    failures,
  };
}

async function buildChunks(): Promise<{
  files: Record<string, { js: string; css?: string }>;
  report: string[];
  failures: string[];
}> {
  await rm(LIB_DIR, { recursive: true, force: true });
  await mkdir(LIB_DIR, { recursive: true });
  const files: Record<string, { js: string; css?: string }> = {};
  const report: string[] = [];
  const failures: string[] = [];
  for (const name of Object.keys(FRAME_LIB_CHUNKS)) {
    const source = CHUNK_SOURCES[name];
    if (!source) throw new Error(`No chunk source for the frame library chunk "${name}".`);
    try {
      const built = await buildChunk(name, source);
      files[name] = built.files;
      failures.push(...built.failures);
      const bytes = Buffer.byteLength(built.code, "utf8");
      report.push(
        `  ${name.padEnd(8)} ${formatFileSize(bytes)} raw / ${formatFileSize(gzipSync(Buffer.from(built.code)).length)} gz` +
          (built.cssBytes ? `  + css ${formatFileSize(built.cssBytes)}` : ""),
      );
    } catch (err) {
      failures.push(`[chunk ${name}] failed to build: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { files, report, failures };
}

async function buildJs(
  libFiles: Record<string, { js: string; css?: string }>,
): Promise<{ code: string; meta: Metafile }> {
  const result = await build({
    entryPoints: [JS_ENTRY],
    outfile: JS_OUT,
    bundle: true,
    minify: true,
    sourcemap: false,
    target: "es2020",
    format: "iife",
    platform: "browser",
    legalComments: "none",
    metafile: true,
    absWorkingDir: ROOT,
    tsconfig: resolve(ROOT, "tsconfig.json"),
    loader: { ".css": "empty", ".svg": "dataurl", ".png": "dataurl" },
    alias: ALIAS,
    // esbuild `alias` is a PREFIX match, so the design-system root cannot be
    // an alias entry: it would remap every subpath (`/data-table`, …) into
    // the frame module. This plugin takes the bare root only.
    plugins: [frameDesignSystemRoot],
    // THE FRAME HAS NO STORAGE (V-27 finding D). Both globals are
    // replaced with the announcing stand-in: on an opaque origin the real
    // ones throw a SecurityError, and durable state in an invisible place
    // is not something a Shape component may have. After this the audit
    // below can refuse the real names outright.
    inject: FRAME_INJECT,
    define: { ...FRAME_DEFINE, __FRAME_LIB_FILES__: JSON.stringify(libFiles) },
    logLevel: "info",
  });

  return { code: await readFile(JS_OUT, "utf8"), meta: result.metafile };
}

async function buildCss(): Promise<string> {
  const source = await readFile(CSS_ENTRY, "utf8");
  const result = await postcss([tailwindcss()]).process(source, {
    from: CSS_ENTRY,
    to: CSS_OUT,
  });
  await mkdir(dirname(CSS_OUT), { recursive: true });
  await writeFile(CSS_OUT, result.css, "utf8");
  return result.css;
}

function auditGraph(meta: Metafile): string[] {
  const entry = relative(ROOT, JS_ENTRY);
  const outKey = Object.keys(meta.outputs)[0];
  const bundled = Object.entries(meta.outputs[outKey].inputs)
    .filter(([, v]) => v.bytesInOutput > 0)
    .map(([k]) => k);

  const failures: string[] = [];
  for (const [pattern, why] of FORBIDDEN_MODULES) {
    const hit = bundled.find((p) => pattern.test(p));
    if (!hit) continue;
    const chain = importChain(meta, entry, hit).map(shorten);
    failures.push(
      `${why} is in the frame bundle — ${shorten(hit)}\n` +
        chain
          .map((c, i) => `${"    ".repeat(1)}${i === 0 ? "" : "-> "}${c}`)
          .join("\n"),
    );
  }
  return failures;
}

function auditArtifact(code: string): string[] {
  const failures: string[] = [];
  for (const [pattern, why] of FORBIDDEN_CALLS) {
    const hit = pattern.exec(code);
    if (hit) {
      const at = Math.max(0, hit.index - 60);
      failures.push(
        `${why} is in the served bytes — near: ...${code.slice(at, hit.index + 60)}...`,
      );
    }
  }
  return failures;
}

async function main(): Promise<void> {
  const chunks = await buildChunks();
  const { code, meta } = await buildJs(chunks.files);

  const failures = [...auditGraph(meta), ...auditArtifact(code), ...chunks.failures];
  if (failures.length > 0) {
    // A REJECTED ARTIFACT NEVER SURVIVES THE RUN (V-27 finding B,
    // 2026-09-12). esbuild has already written `public/kind-sandbox.js` by
    // the time the audits run, so without this the next `pnpm dev` serves
    // the very bundle the build refused — a failing build that silently
    // ships is worse than no audit at all.
    await rm(JS_OUT, { force: true });
    await rm(CSS_OUT, { force: true });
    await rm(LIB_DIR, { recursive: true, force: true });
    throw new Error(
      "The kind sandbox bundle contains things the frame may not have.\n\n" +
        failures.join("\n\n") +
        "\n\nFix the import that pulled it in (usually by aliasing the seam to a " +
        "frame-safe stand-in that announces itself). Do not relax this audit.",
    );
  }

  const css = await buildCss();
  // RAW IS MEASURED IN BYTES, NOT CHARACTERS (2026-09-12). `code` and `css` are
  // STRINGS — `readFile(JS_OUT, "utf8")` and PostCSS's `result.css` — so
  // `.length` is UTF-16 code units, and this line printed that count beside a
  // TRUE gzip byte count under the same " MB". The gz figures were always bytes
  // (`gzipSync(Buffer.from(...)).length`); only raw lied.
  const jsBytes = Buffer.byteLength(code, "utf8");
  const cssBytes = Buffer.byteLength(css, "utf8");
  const jsGz = gzipSync(Buffer.from(code)).length;
  const cssGz = gzipSync(Buffer.from(css)).length;

  // eslint-disable-next-line no-console
  console.log(
    `✓ kind-sandbox.js  ${formatFileSize(jsBytes)} raw / ${formatFileSize(jsGz)} gz → ${JS_OUT}\n` +
      `✓ kind-sandbox.css ${formatFileSize(cssBytes)} raw / ${formatFileSize(cssGz)} gz → ${CSS_OUT}\n` +
      `✓ on-demand library chunks → ${LIB_DIR}\n${chunks.report.join("\n")}`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(
    "[build:kind-sandbox] failed:",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
