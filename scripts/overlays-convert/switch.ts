/**
 * overlays-switch — the deterministic, re-runnable codemod that moves matrx-frontend from its
 * in-app overlay/window system onto @ai-matrx/summon.
 *
 *   npx tsx scripts/overlays-convert/switch.ts --root <app dir> [--pkg <overlays package dir>]
 *       [--report <file.json>] [--allow-real-tree]
 *
 * It refuses the real checkout unless --allow-real-tree is passed (prove it on a scratch export
 * first: `git archive origin/main | tar -x -C $S`, node_modules symlinked).
 *
 * Phases, in order (each one is idempotent; a second run changes nothing):
 *   A  emit definitions  — runs convert.ts against --root, then lays its output down as
 *                          features/overlays/definitions/: one <id>.overlay.ts(x) per overlay (the
 *                          definition + the old opener code verbatim, so the old names still come
 *                          from it), <id>.render.tsx, <id>.link.ts, callbacks/, registry.ts
 *                          (APP_OVERLAYS), overlay-host-types.ts (OverlayHostTypes augmentation),
 *                          trayPreviews.ts (registerTrayPreview for the app's previews).
 *   C  host wiring       — store/rootReducer, providers, the lazy overlay world, the link and
 *                          persistence services, extension bridge, notifications, the files whose
 *                          use of a deleted name has no 1:1 package equivalent.
 *   B  importers         — every import / export-from / import() / jest.mock of a deleted module is
 *                          re-pointed (openers → definitions, slices → "@ai-matrx/summon",
 *                          callbackManager → "/handles", engine → "/window" "/url" "/persistence"
 *                          "/lite"), names renamed by alias so call sites stay byte-identical.
 *   D  delete            — the replaced app code (list in DELETED below).
 *   E  guards            — ESLint rules and check scripts that named deleted paths.
 *
 * Names with no package equivalent are resolved explicitly (RESOLUTIONS) or fail the run loudly.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";

// ── args ─────────────────────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const argValue = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const SCRIPT_DIR = path.dirname(path.resolve(process.argv[1] ?? "."));
const REAL_APP = path.resolve(SCRIPT_DIR, "../..");
const ROOT_ARG = argValue("--root");
if (!ROOT_ARG) {
  console.error("usage: switch.ts --root <app dir> [--pkg <dir>] [--report <file>] [--allow-real-tree]");
  process.exit(2);
}
const ROOT = path.resolve(ROOT_ARG);
if (fs.realpathSync(ROOT) === fs.realpathSync(REAL_APP) && !argv.includes("--allow-real-tree")) {
  console.error(`refusing to switch the real checkout (${ROOT}); prove it on a scratch export, or pass --allow-real-tree`);
  process.exit(2);
}
const PKG = path.resolve(argValue("--pkg") ?? path.join(REAL_APP, "../aidream/apps/shared/summon"));
const REPORT = argValue("--report");

const DEFS = "features/overlays/definitions";
const DEFS_SPEC = "@/features/overlays/definitions";
const HOST = "features/overlays/host";
const HOST_SPEC = "@/features/overlays/host";

// ── bookkeeping ──────────────────────────────────────────────────────────────────────────────

const changed = new Set<string>();
const deleted: string[] = [];
const resolutions: string[] = [];
const unresolved: string[] = [];
const abs = (rel: string) => path.join(ROOT, rel);
const exists = (rel: string) => fs.existsSync(abs(rel));
const read = (rel: string) => fs.readFileSync(abs(rel), "utf8");
function write(rel: string, text: string): void {
  if (exists(rel) && read(rel) === text) return;
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), text);
  changed.add(rel);
}
function resolve(note: string): void {
  if (!resolutions.includes(note)) resolutions.push(note);
}
/** Replace `find` once; when it is gone, `done` (or the replacement) must already be there. */
function swap(rel: string, text: string, find: string | RegExp, repl: string, done?: string): string {
  const marker = done ?? repl;
  if (marker && text.includes(marker)) return text; // already applied
  const hit = typeof find === "string" ? text.includes(find) : find.test(text);
  if (hit) return typeof find === "string" ? text.replace(find, repl) : text.replace(find, repl);
  throw new Error(`[switch] ${rel}: anchor not found: ${String(find).slice(0, 120)}`);
}
function patch(rel: string, fn: (text: string) => string): void {
  if (!exists(rel)) return;
  write(rel, fn(read(rel)));
}
function parse(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, /\.(tsx|jsx)$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}
function walk(node: ts.Node, fn: (n: ts.Node) => void): void {
  fn(node);
  node.forEachChild((c) => walk(c, fn));
}

// ── the deleted set ──────────────────────────────────────────────────────────────────────────

const DELETED = [
  "features/overlays/OverlayController.tsx",
  "features/overlays/catalogue.ts",
  "features/overlays/openers/**",
  "features/overlays/callbacks/**",
  "features/overlays/boundary/**",
  "features/overlays/useCloseOverlaysOnNavigation.ts",
  "lib/redux/slices/overlaySlice.ts",
  "lib/redux/slices/windowManagerSlice.ts",
  "lib/redux/slices/urlSyncSlice.ts",
  "lib/redux/slices/overlayDataSlice.ts",
  "lib/redux/overlaySchemaRegistry.ts",
  "lib/redux/thunks/overlayThunks.ts",
  "features/window-panels/WindowPanel.tsx",
  "features/window-panels/WindowPanel.module.css",
  "features/window-panels/WindowPanel/**",
  "features/window-panels/WindowPersistenceCore.tsx",
  "features/window-panels/WindowPersistenceManager.tsx",
  "features/window-panels/WindowSelectionSurface.tsx",
  "features/window-panels/WindowTray.tsx",
  "features/window-panels/WindowTray/**",
  "features/window-panels/WindowTraySync.tsx",
  "features/window-panels/window-panel.types.ts",
  "features/window-panels/constants/**",
  "features/window-panels/diagnostics/**",
  "features/window-panels/hooks/useWindowPanel.ts",
  "features/window-panels/mobile/**",
  "features/window-panels/persistence/**",
  "features/window-panels/popout/**",
  "features/window-panels/registry/trayPreviewRegistry.ts",
  "features/window-panels/registry/windowRegistryTypes.ts",
  "features/window-panels/registry/windowRegistryMetadata.ts",
  "features/window-panels/url-sync/**",
  "features/window-panels/utils/lazy-bundle-guard.ts",
  "features/window-panels/utils/urlSyncIdentity.ts",
  "features/window-panels/utils/rectClamp.ts",
  "features/window-panels/utils/windowArrangements.ts",
  "features/window-panels/utils/autoOpenPlacement.ts",
  "features/window-panels/utils/mayRaiseUnbidden.ts",
  "features/window-panels/components/WindowSidebar.tsx",
  "features/window-panels/components/LayoutIcon.tsx",
  "components/matrx/resizable/MatrxFloatingFrame.tsx",
  // Superseded by the unified Audio window (audioControlWindow, Devices tab) — lead ruling 2026-10-16.
  "features/window-panels/windows/AudioDevicesWindow.tsx",
  "utils/callbackManager.ts",
  "hooks/useCallbackManager.ts",
  "hooks/useOrchestrateSave.ts",
  "lib/refs/**",
  "providers/persistance/**",
  // Demos and admin test pages whose only subject is deleted code.
  "app/(dev)/demos/overlay-instances/**",
  "app/(dev)/demos/general/services/ref-manager/**",
  "app/(admin)/administration/ui/persistence-test/**",
  "app/(dev)/demos/dynamic-imports/DynamicWindowTray.tsx",
  "app/(dev)/demos/dynamic-imports/DynamicWindowTraySync.tsx",
  // Engine tests whose twins live in the package (vitest).
  ...[
    "a-phone-window-title-gets-the-whole-row.test.tsx",
    "a-rich-window-title-survives-the-phone-header.test.tsx",
    "aWindowOpenedFromADialogStaysInFront.test.tsx",
    "aWindowOpenedFromAModalStaysAboveItsScrim.test.tsx",
    "autoOpenNeverCoversThePage.test.ts",
    "defaultTraySnapshotCapture.test.ts",
    "defaultWindowPositionClearsContent.test.ts",
    "deepLinkedWindowKeepsItsAddress.test.tsx",
    "elementThumbnail.test.ts",
    "localWindowSessionStore.test.ts",
    "openingAPanelNeverNavigatesThePage.test.tsx",
    "overlayRenderWatchdog.test.ts",
    "overlayRenderWatchdogContext.test.ts",
    "overlaySlice.test.ts",
    "popoutDragDetector.test.ts",
    "popoutReducer.test.ts",
    "rectClamp.test.ts",
    "traySnapshotMap.test.ts",
    "unbiddenRaiseHome.test.tsx",
    "urlHydrationRegistry.test.ts",
    "urlPanelManager.test.ts",
    "useOverlaySurfaceRenderAck.test.tsx",
    "useWindowPanelPersistence.test.tsx",
    "useWindowPanelResize.test.tsx",
    "windowArrangements.test.ts",
    "windowManagerReveal.test.ts",
    "windowPanelMaximizePreservesBody.test.tsx",
    "windowPanelMinimize.test.tsx",
    "windowPersistenceAuthReady.test.tsx",
    "windowPersistenceCloseMiddleware.test.ts",
    "windowPositionClearsHeader.test.ts",
    "windowSessionPersistence.test.ts",
    "windowTrayLayout.test.ts",
  ].map((f) => `features/window-panels/__tests__/${f}`),
  "features/overlays/__tests__/pageBoundOverlaysCloseOnNavigation.test.ts",
  "components/errors/__tests__/chunk-load-recovery.test.ts",
];
const isDeleted = (rel: string): boolean =>
  DELETED.some((d) => (d.endsWith("/**") ? rel.startsWith(d.slice(0, -3) + "/") : rel === d));

// ── package exports (per section) ─────────────────────────────────────────────────────────────

const SECTIONS: Record<string, string> = {
  "@ai-matrx/summon": "index.ts",
  "@ai-matrx/summon/window": "window.ts",
  "@ai-matrx/summon/url": "url.ts",
  "@ai-matrx/summon/persistence": "persistence.ts",
  "@ai-matrx/summon/lite": "lite.ts",
  "@ai-matrx/summon/react": "react.ts",
  "@ai-matrx/summon/handles": "handles.ts",
};
const PKG_EXPORTS: Record<string, Set<string>> = {};
for (const [spec, entry] of Object.entries(SECTIONS)) {
  const file = path.join(PKG, "src", entry);
  const program = ts.createProgram([file], {
    noEmit: true,
    jsx: ts.JsxEmit.ReactJSX,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
    paths: { "@ai-matrx/summon": [path.join(PKG, "src/index.ts")], "@ai-matrx/summon/*": [path.join(PKG, "src/*")] },
  });
  const checker = program.getTypeChecker();
  const sf = program.getSourceFile(file);
  const sym = sf && checker.getSymbolAtLocation(sf);
  PKG_EXPORTS[spec] = new Set(sym ? checker.getExportsOfModule(sym).map((s) => s.name) : []);
}
function pkgFind(name: string, order: string[]): string | undefined {
  return order.find((spec) => PKG_EXPORTS[spec]?.has(name));
}

// ── source files ─────────────────────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set(["node_modules", ".git", ".wt", "tmp", "work", ".matrx", "_armani", "_dev", ".claude"]);
function sourceFiles(): string[] {
  const out: string[] = [];
  const visit = (dir: string, rel: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name) && !e.name.startsWith(".next") && r !== "scripts/overlays-convert") visit(path.join(dir, e.name), r);
      } else if (/\.(tsx?|mts)$/.test(e.name) && !e.name.endsWith(".d.ts")) out.push(r);
    }
  };
  visit(ROOT, "");
  return out.sort();
}
function resolveSpec(fromRel: string, spec: string): string | undefined {
  let base: string;
  if (spec.startsWith("@/")) base = abs(spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(abs(fromRel)), spec);
  else return undefined;
  for (const ext of ["", ".ts", ".tsx", ".js", ".jsx", ".mts", "/index.ts", "/index.tsx"]) {
    const p = base + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return path.relative(ROOT, p).split(path.sep).join("/");
  }
  return undefined;
}

// ── A. definitions ───────────────────────────────────────────────────────────────────────────

/** opener file base → the definition module (without extension) that now holds its code. */
const openerHome = new Map<string, string>();
/** Overlays opened from app code outside the opener files with an interface-typed payload. */
const EXTRA_UNTYPED = ["sourceReviewWindow", "curatedIconPickerWindow", "imageUploaderWindow", "createProjectWindow", "surfaceAgentBindWindow"];
const orphanOpeners: string[] = [];

function emitDefinitions(): void {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "overlays-switch-convert-"));
  console.log(`[switch] A: convert.ts → ${tmp}`);
  execFileSync("npx", ["tsx", path.join(SCRIPT_DIR, "convert.ts"), "--app", ROOT, "--out", tmp, "--pkg", PKG], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "inherit"],
    maxBuffer: 256 * 1024 * 1024,
  });
  const registryText = fs.readFileSync(path.join(tmp, "registry.ts"), "utf8");
  const ids = [...registryText.matchAll(/^import \{ (\w+)Overlay \} from/gm)].map((m) => m[1]!);
  // id → opener base it re-exported
  const baseOf = new Map<string, string>();
  for (const id of ids) {
    const t = fs.readFileSync(path.join(tmp, `${id}.overlay.ts`), "utf8");
    const m = t.match(/export \* from "\.\/openers\/([\w-]+)";/);
    if (m) baseOf.set(id, m[1]!);
  }
  const openerFiles = fs.readdirSync(path.join(tmp, "openers")).filter((f) => /\.tsx?$/.test(f));
  const openerExt = new Map(openerFiles.map((f) => [f.replace(/\.tsx?$/, ""), path.extname(f)]));
  const primaryOf = new Map<string, string>();
  for (const base of openerExt.keys()) {
    const users = ids.filter((id) => baseOf.get(id) === base);
    if (users.length === 0) {
      orphanOpeners.push(base);
      openerHome.set(base, base);
      continue;
    }
    const primary = users.includes(base) ? base : users[0]!;
    primaryOf.set(base, primary);
    openerHome.set(base, `${primary}.overlay`);
  }
  const fixOpenerSpecifiers = (text: string, from: "def" | "callback"): string =>
    text
      .replace(/(from\s+|import\(\s*|jest\.mock\(\s*)(["'])\.\.\/callbacks\/([\w-]+)\2/g, (_m, p, q, n) => `${p}${q}./callbacks/${n}${q}`)
      .replace(/(from\s+|import\(\s*|jest\.mock\(\s*)(["'])\.\.\/openers\/([\w-]+)\2/g, (_m, p, q, n) =>
        `${p}${q}${from === "callback" ? "../" : "./"}${openerHome.get(n) ?? n}${q}`,
      )
      .replace(/(from\s+|import\(\s*|jest\.mock\(\s*)(["'])\.\/([\w-]+)\2/g, (m, p, q, n) =>
        from === "def" && openerHome.has(n) ? `${p}${q}./${openerHome.get(n)}${q}` : m,
      );

  // definitions
  for (const id of ids) {
    let def = fs.readFileSync(path.join(tmp, `${id}.overlay.ts`), "utf8");
    const base = baseOf.get(id);
    // Ruling 2: defaultData → window.restoreDefaults
    const rd = def.match(/\n\/\*\* Old registry defaultData[^\n]*\*\/\nexport const \w+RestoreDefaults = ([\s\S]*?);\n(?=\ndeclare module)/);
    if (rd) {
      def = def.replace(rd[0], "\n");
      if (def.includes("  window: {\n")) {
        const expr = rd[1]!.split("\n").join("\n    ");
        def = def.replace("  window: {\n", `  window: {\n    restoreDefaults: ${expr},\n`);
      } else if (def.includes("  window: {},")) {
        def = def.replace("  window: {},", `  window: {\n    restoreDefaults: ${rd[1]!.split("\n").join("\n    ")},\n  },`);
      } else {
        resolve(`${id}: defaultData dropped — not a window (non-window overlays are never restored)`);
      }
    }
    let ext = ".ts";
    let text: string;
    if (base && primaryOf.get(base) === id) {
      // Ruling 1: the opener's code moves into the definition file verbatim.
      ext = openerExt.get(base) ?? ".ts";
      let opener = fs.readFileSync(path.join(tmp, "openers", `${base}${ext}`), "utf8");
      opener = fixOpenerSpecifiers(opener, "def");
      def = def
        .replace(new RegExp(`^import type \\{ [^}]+ \\} from "\\./openers/${base}";\\n`, "m"), "")
        .replace(/\n\/\/ Old opener names, unchanged[^\n]*\nexport \* from "\.\/openers\/[\w-]+";\n/, "\n");
      const defImports = def.match(/^import [^\n]+\n/gm) ?? [];
      let defRest = def;
      for (const l of defImports) defRest = defRest.replace(l, "");
      const sf = parse(`x${ext}`, opener);
      let lastImportEnd = 0;
      for (const st of sf.statements) if (ts.isImportDeclaration(st)) lastImportEnd = st.getEnd();
      if (lastImportEnd === 0) {
        // no imports: after the directive prologue
        const first = sf.statements[0];
        lastImportEnd = first && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) ? first.getEnd() : 0;
      }
      text =
        opener.slice(0, lastImportEnd) +
        "\n" +
        defImports.join("").trimEnd() +
        opener.slice(lastImportEnd).replace(/\s*$/, "\n") +
        "\n// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────\n" +
        defRest.replace(/^\n+/, "\n");
    } else if (base) {
      const home = openerHome.get(base)!;
      text = def
        .replace(new RegExp(`from "\\./openers/${base}";`, "g"), `from "./${home}";`)
        .replace(`export * from "./openers/${base}";`, `export * from "./${home}";`);
    } else {
      text = def;
    }
    // stale ".ts"/".tsx" twin from an earlier run with a different extension
    for (const e of [".ts", ".tsx"]) if (e !== ext && exists(`${DEFS}/${id}.overlay${e}`)) fs.rmSync(abs(`${DEFS}/${id}.overlay${e}`));
    write(`${DEFS}/${id}.overlay${ext}`, text);
  }
  for (const base of orphanOpeners) {
    const ext = openerExt.get(base)!;
    const t = fixOpenerSpecifiers(fs.readFileSync(path.join(tmp, "openers", `${base}${ext}`), "utf8"), "def");
    write(`${DEFS}/${base}${ext}`, t);
    resolve(`opener ${base} opens no catalogued overlay id: kept as ${DEFS}/${base}${ext}`);
  }
  // FullScreenEditorMode lived in the app's overlaySlice (the package slice has no editor types)
  const slice = "lib/redux/slices/overlaySlice.ts";
  const fsm = exists(slice) ? read(slice).match(/export type FullScreenEditorMode =[\s\S]*?;\n/) : null;
  if (fsm) {
    const f = exists(`${DEFS}/fullScreenEditor.overlay.tsx`) ? `${DEFS}/fullScreenEditor.overlay.tsx` : `${DEFS}/fullScreenEditor.overlay.ts`;
    const t = read(f);
    if (!t.includes("export type FullScreenEditorMode")) write(f, t.replace("\n// ── definition (@ai-matrx/summon)", `\n/** Which message a full-screen edit belongs to (moved from the app's overlaySlice). */\n${fsm[0]}\n// ── definition (@ai-matrx/summon)`));
    resolve("FullScreenEditorMode: moved from lib/redux/slices/overlaySlice.ts into fullScreenEditor.overlay");
  }
  // Ruling 3 extension: overlays whose app-side openers (outside features/overlays/openers) dispatch an
  // interface-typed payload get the untyped wire too, exactly like the converter's 13.
  for (const id of EXTRA_UNTYPED) {
    const f = [`${DEFS}/${id}.overlay.tsx`, `${DEFS}/${id}.overlay.ts`].find(exists);
    if (!f) throw new Error(`[switch] EXTRA_UNTYPED: no definition file for ${id}`);
    let t = read(f);
    t = t.replace(new RegExp(`(\\n    ${id}: )OverlayWire<[^>]+>;`), "$1UntypedOverlayWire;");
    if (!/import type \{[^}]*UntypedOverlayWire/.test(t)) t = t.replace(/import type \{ OverlayWire \} from "\.\/overlay-types";/, 'import type { OverlayWire, UntypedOverlayWire } from "./overlay-types";');
    write(f, t);
  }
  resolve(`untyped wire (ruling 3) also for ${EXTRA_UNTYPED.join(", ")}: their app-side openers dispatch interface-typed payloads`);
  // renders (Ruling 4: userPreferencesWindow renders nothing while userPreferences is open)
  for (const id of ids) {
    let r = fs.readFileSync(path.join(tmp, `${id}.render.tsx`), "utf8");
    if (id === "userPreferencesWindow") {
      r = swap(`${id}.render.tsx`, r, /\n  return \(isOpenById\.userPreferences \|\| true \? \(/, "\n  if (isOpenById.userPreferences) return null;\n  return (true ? (");
    }
    // PascalCase: render functions that call hooks are components to the hooks lint rules
    r = r.replace(/export default function render\(/, "export default function OverlayRender(");
    write(`${DEFS}/${id}.render.tsx`, r);
  }
  // links (Ruling 6: the host augments OverlayHostTypes, so no AppDispatch cast)
  for (const f of fs.readdirSync(tmp).filter((x) => x.endsWith(".link.ts"))) {
    let t = fs.readFileSync(path.join(tmp, f), "utf8");
    if (t.includes("hostDispatch")) {
      t = t
        .replace(/^import type \{ AppDispatch \} from "@\/lib\/redux\/store";\n/m, "")
        .replace("dispatch: hostDispatch", "dispatch")
        .replace(/\n  const dispatch = hostDispatch as AppDispatch;/, "");
    }
    write(`${DEFS}/${f}`, t);
  }
  for (const f of ["overlay-types.ts", "overlay-ids.ts", "link-helpers.ts", "controller-helpers.ts", "registry.ts"]) {
    write(`${DEFS}/${f}`, fs.readFileSync(path.join(tmp, f), "utf8"));
  }
  for (const f of fs.readdirSync(path.join(tmp, "callbacks"))) {
    write(`${DEFS}/callbacks/${f}`, fixOpenerSpecifiers(fs.readFileSync(path.join(tmp, "callbacks", f), "utf8"), "callback"));
  }
  // tests that lived beside openers/callbacks move with them (relative specifiers absolutized)
  for (const [dir, dest] of [
    ["features/overlays/openers", `${DEFS}/__tests__`],
    ["features/overlays/callbacks", `${DEFS}/callbacks`],
  ] as const) {
    if (!exists(dir)) continue;
    const visit = (rel: string) => {
      for (const e of fs.readdirSync(abs(rel), { withFileTypes: true })) {
        const r = `${rel}/${e.name}`;
        if (e.isDirectory()) visit(r);
        else if (/\.test\.tsx?$/.test(e.name)) {
          const t = read(r).replace(/(from\s+|import\(\s*|jest\.mock\(\s*|jest\.requireActual\(\s*)(["'])(\.{1,2}\/[^"']+)\2/g, (_m, p, q, s) => {
            const target = path.relative(ROOT, path.resolve(path.dirname(abs(r)), s)).split(path.sep).join("/");
            return `${p}${q}@/${target}${q}`;
          });
          write(`${dest}/${e.name}`, t);
        }
      }
    };
    visit(dir);
  }
  write(
    `${DEFS}/overlay-host-types.ts`,
    `/**\n * The app's host types for @ai-matrx/summon: link hydrators receive the app's thunk-aware\n * dispatch, so a hydrator that hands dispatch to an app helper needs no cast.\n */\nimport type { AppDispatch } from "@/lib/redux/store";\n\ndeclare module "@ai-matrx/summon" {\n  interface OverlayHostTypes {\n    dispatch: AppDispatch;\n  }\n}\n\nexport {};\n`,
  );
  write(
    `${DEFS}/register.ts`,
    `import { registerOverlayMeta } from "@ai-matrx/summon";\nimport { APP_OVERLAYS } from "./registry";\n\nlet registered = false;\n\n/**\n * Registers every app overlay's metadata with the package registry (links, persistence and\n * window metadata read it). Idempotent; SummonHost registers the same list again on mount.\n */\nexport function ensureAppOverlaysRegistered(): void {\n  if (registered) return;\n  registered = true;\n  registerOverlayMeta(APP_OVERLAYS);\n}\n\n/** The app definition for an overlay id (label, instance, window options), registered or not. */\nexport function appOverlayDefinition(overlayId: string) {\n  return APP_OVERLAYS.find((d) => d.id === overlayId);\n}\n`,
  );
  // tray previews: the old registry object → registerTrayPreview calls
  const trayReg = "features/window-panels/registry/trayPreviewRegistry.ts";
  if (exists(trayReg)) {
    const t = read(trayReg);
    const entries = [...t.matchAll(/^\s+(\w+): \{\s*renderTrayPreview: (\w+),?\s*\}/gm)].map((m) => [m[1]!, m[2]!] as const);
    if (/captureTraySnapshot:/.test(t.replace(/captureTraySnapshot\?:/, ""))) throw new Error("[switch] trayPreviewRegistry has a captureTraySnapshot entry; map it explicitly");
    const names = [...new Set(entries.map(([, n]) => n))].sort();
    write(
      `${DEFS}/trayPreviews.ts`,
      `/**\n * The app's minimized-window previews (the components stay in the app; the package draws them\n * in the tray chip). Imported for its side effect by the overlay world host.\n */\nimport { registerTrayPreview } from "@ai-matrx/summon/window-host";\nimport {\n${names.map((n) => `  ${n},`).join("\n")}\n} from "@/features/window-panels/registry/tray-previews";\n\n${entries.map(([id, n]) => `registerTrayPreview("${id}", { Preview: ${n} });`).join("\n")}\n`,
    );
    resolve(`tray previews: ${entries.length} registry rows → registerTrayPreview in ${DEFS}/trayPreviews.ts (components kept in features/window-panels/registry/tray-previews.tsx)`);
  }
  // boundary pieces that stay in the app (the "Copy for AI" report) move to the host folder
  for (const f of ["overlayErrorReport.ts", "overlayDiagnostics.ts"]) {
    const from = `features/overlays/boundary/${f}`;
    if (exists(from) && !exists(`${HOST}/${f}`)) write(`${HOST}/${f}`, read(from));
  }
  removeSupersededOverlays();
  emitPackageWindowOverlays();
  markDefinitionsClientOnly();
  emitOverlayMetaIndex();
  fs.rmSync(tmp, { recursive: true, force: true });
}

const definitionFiles = (): string[] =>
  fs
    .readdirSync(abs(DEFS))
    .filter((f) => /\.overlay\.tsx?$/.test(f))
    .sort()
    .map((f) => `${DEFS}/${f}`);

/**
 * A definition module calls defineOverlay() (from the "use client" entry @ai-matrx/summon/react) at
 * module scope, so it is client code: without the directive a server component that reaches it
 * (even through a plain helper) evaluates it in the RSC layer and the build's page-data pass fails
 * ("Attempted to call defineOverlay() from the server"). Every definition carries the directive.
 */
function markDefinitionsClientOnly(): void {
  let n = 0;
  for (const f of definitionFiles()) {
    const t = read(f);
    if (/^\s*(["'])use client\1;?/.test(t)) continue;
    write(f, `"use client";\n\n${t}`);
    n++;
  }
  if (n) resolve(`"use client" added to ${n} definition modules that lacked it (they call defineOverlay at module scope)`);
}

/**
 * The plain-data metadata index (id, label, instance, window id / mobile / deprecated) for code that
 * must not load the client definitions: server components (the feature admin pages' lookups). Read
 * from each definition's defineOverlay({...}) literal; a jest guard (emitted beside it) fails when
 * it drifts from APP_OVERLAYS.
 */
function emitOverlayMetaIndex(): void {
  const registry = read(`${DEFS}/registry.ts`);
  const fileOf = new Map([...registry.matchAll(/^import \{ (\w+) \} from "\.\/([\w.-]+)";$/gm)].map((m) => [m[1]!, m[2]!]));
  const order = [...registry.matchAll(/^  (\w+Overlay),$/gm)].map((m) => m[1]!);
  const rows: string[] = [];
  for (const name of order) {
    const base = fileOf.get(name);
    const f = base && [`${DEFS}/${base}.tsx`, `${DEFS}/${base}.ts`].find(exists);
    if (!f) throw new Error(`[switch] overlay meta index: no definition file for ${name}`);
    const sf = parse(f, read(f));
    let spec: ts.ObjectLiteralExpression | undefined;
    walk(sf, (n) => {
      if (spec || !ts.isCallExpression(n) || !ts.isCallExpression(n.expression)) return;
      const inner = n.expression.expression;
      if (ts.isIdentifier(inner) && inner.text === "defineOverlay" && n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0])) spec = n.arguments[0];
    });
    if (!spec) throw new Error(`[switch] overlay meta index: ${f} has no defineOverlay()({...}) literal`);
    const prop = (o: ts.ObjectLiteralExpression, key: string) =>
      o.properties.find((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === key)?.initializer;
    const str = (e: ts.Expression | undefined, what: string): string => {
      if (!e || !ts.isStringLiteralLike(e)) throw new Error(`[switch] overlay meta index: ${f} ${what} is not a string literal`);
      return e.text;
    };
    const parts = [`id: ${JSON.stringify(str(prop(spec, "id"), "id"))}`, `label: ${JSON.stringify(str(prop(spec, "label"), "label"))}`, `instance: ${JSON.stringify(str(prop(spec, "instance"), "instance"))}`];
    const win = prop(spec, "window");
    if (win) {
      if (!ts.isObjectLiteralExpression(win)) throw new Error(`[switch] overlay meta index: ${f} window is not an object literal`);
      const w: string[] = [];
      const windowId = prop(win, "windowId");
      if (windowId) w.push(`windowId: ${JSON.stringify(str(windowId, "window.windowId"))}`);
      const mobile = prop(win, "mobile");
      if (mobile) w.push(`mobile: ${JSON.stringify(str(mobile, "window.mobile"))}`);
      const deprecated = prop(win, "deprecated");
      if (deprecated) w.push(`deprecated: ${deprecated.getText(sf)}`);
      parts.push(`window: { ${w.join(", ")} }`);
    }
    rows.push(`  { ${parts.join(", ")} },`);
  }
  write(
    `${DEFS}/overlay-meta-index.ts`,
    `/**\n * Plain-data metadata for every app overlay (generated from the definitions by the switch codemod).\n * For code that must not load the client definitions — server components such as the feature\n * admin lookups. __tests__/overlayMetaIndexMatchesDefinitions.test.ts fails when it drifts.\n */\nimport type { MobilePresentation } from "@ai-matrx/summon";\n\nexport interface OverlayMetaRow {\n  readonly id: string;\n  readonly label: string;\n  readonly instance: "single" | "multi";\n  readonly window?: {\n    readonly windowId?: string;\n    readonly mobile?: MobilePresentation;\n    readonly deprecated?: { readonly replacement?: string; readonly reason?: string };\n  };\n}\n\nexport const OVERLAY_META_INDEX: readonly OverlayMetaRow[] = [\n${rows.join("\n")}\n];\n`,
  );
  write(
    `${DEFS}/__tests__/overlayMetaIndexMatchesDefinitions.test.ts`,
    `/**\n * The plain metadata index (read by server components) is the definitions' own metadata, row for\n * row: a definition edited without regenerating the index fails here.\n */\nimport { APP_OVERLAYS } from "../registry";\nimport { OVERLAY_META_INDEX } from "../overlay-meta-index";\n\nconst plain = (v: unknown): unknown => JSON.parse(JSON.stringify(v));\n\ndescribe("overlay meta index", () => {\n  it("matches every definition's id, label, instance and window identity", () => {\n    const fromDefinitions = APP_OVERLAYS.map((d) => ({\n      id: d.id,\n      label: d.label,\n      instance: d.instance,\n      ...(d.window ? { window: { windowId: d.window.windowId, mobile: d.window.mobile, deprecated: d.window.deprecated } } : {}),\n    }));\n    expect(plain(OVERLAY_META_INDEX)).toEqual(plain(fromDefinitions));\n  });\n});\n`,
  );
  resolve(`${DEFS}/overlay-meta-index.ts: plain metadata for ${rows.length} overlays (server-safe; guarded by __tests__/overlayMetaIndexMatchesDefinitions.test.ts)`);
}

/**
 * Package-owned windows the app hosts with no app component of its own: the window id is declared
 * by @ai-matrx/chat's CHAT_WINDOWS (ChatHostAdapter's chatWindowOverlay() check requires every id
 * to be an app overlay) and the component ships in the chat package. Written whole every run, so a
 * pre-switch catalogue row for the same id (if one landed) converges on this definition.
 */
const PACKAGE_WINDOWS: ReadonlyArray<{ id: string; label: string; windowId: string; mobile: string; component: string; spec: string; after: string }> = [
  {
    id: "readAloudVoiceSettings",
    label: "Read-aloud voice",
    windowId: "read-aloud-voice-settings",
    mobile: "card",
    component: "ReadAloudVoiceSettingsWindow",
    spec: "@ai-matrx/chat/window-panels/windows/listen/ReadAloudVoiceSettingsWindow",
    after: "listenSummaryWindow",
  },
];
function emitPackageWindowOverlays(): void {
  for (const w of PACKAGE_WINDOWS) {
    const Pascal = w.id[0]!.toUpperCase() + w.id.slice(1);
    for (const e of [".ts", ".tsx"]) if (e !== ".ts" && exists(`${DEFS}/${w.id}.overlay${e}`)) fs.rmSync(abs(`${DEFS}/${w.id}.overlay${e}`));
    write(
      `${DEFS}/${w.id}.overlay.ts`,
      `/**\n * \`${w.id}\` — ${w.label}: a window whose component ships in @ai-matrx/chat (CHAT_WINDOWS.${w.id}).\n * Single instance; no data.\n */\nimport { defineOverlay } from "@ai-matrx/summon/react";\nimport type { OverlayWire } from "./overlay-types";\n\nexport type ${Pascal}DefinitionData = Record<string, never>;\n\nexport const ${w.id}Overlay = defineOverlay<${Pascal}DefinitionData>()({\n  id: "${w.id}",\n  label: "${w.label}",\n  instance: "single",\n  keepAlive: "none",\n  closesOnNavigation: false,\n  window: {\n    restoreDefaults: {},\n    windowId: "${w.windowId}",\n    mobile: "${w.mobile}",\n  },\n  render: () => import("./${w.id}.render"),\n});\n\ndeclare module "@ai-matrx/summon" {\n  interface OverlayRegistry {\n    ${w.id}: OverlayWire<${Pascal}DefinitionData>;\n  }\n}\n`,
    );
    write(
      `${DEFS}/${w.id}.render.tsx`,
      `"use client";\n\nimport ${w.component} from "${w.spec}";\nimport type { OverlayRenderProps } from "@ai-matrx/summon/react";\n\nexport default function OverlayRender({ close }: OverlayRenderProps) {\n  return <${w.component} isOpen onClose={() => close()} />;\n}\n`,
    );
    patch(`${DEFS}/registry.ts`, (t) => {
      if (!t.includes(`import { ${w.id}Overlay } from`)) {
        t = swap("registry.ts", t, `import { ${w.after}Overlay } from "./${w.after}.overlay";\n`, `import { ${w.after}Overlay } from "./${w.after}.overlay";\nimport { ${w.id}Overlay } from "./${w.id}.overlay";\n`);
      }
      if (!t.includes(`  ${w.id}Overlay,\n`)) t = swap("registry.ts", t, `  ${w.after}Overlay,\n`, `  ${w.after}Overlay,\n  ${w.id}Overlay,\n`);
      return t;
    });
    patch(`${DEFS}/overlay-ids.ts`, (t) => (t.includes(`  ${w.id}: true,\n`) ? t : swap("overlay-ids.ts", t, `  ${w.after}: true,\n`, `  ${w.after}: true,\n  ${w.id}: true,\n`)));
    resolve(`${w.id}: package window (${w.spec}) — definition + render module emitted explicitly (single instance, window ${w.windowId}, mobile ${w.mobile})`);
  }
}

/**
 * Overlays superseded before the switch: no definition is emitted. Their opener code stays (as a
 * plain module under the same old names) when it opens another overlay. audioDevices: the
 * standalone devices window is superseded by the unified Audio window; its opener already opens
 * audioControlWindow on the Devices tab, so callers keep `useOpenAudioDevices` unchanged.
 */
const SUPERSEDED: Record<string, { keepOpenerAs?: string }> = { audioDevices: { keepOpenerAs: "audioDevices" } };
function removeSupersededOverlays(): void {
  for (const [id, plan] of Object.entries(SUPERSEDED)) {
    const defFile = [`${DEFS}/${id}.overlay.tsx`, `${DEFS}/${id}.overlay.ts`].find(exists);
    if (!defFile) throw new Error(`[switch] superseded overlay ${id}: no definition emitted`);
    if (plan.keepOpenerAs) {
      const t = read(defFile);
      const cut = t.indexOf("\n// ── definition (@ai-matrx/summon)");
      if (cut < 0) throw new Error(`[switch] superseded overlay ${id}: definition marker not found`);
      if (/overlayId:\s*["']${id}["']|OVERLAY_ID = "${id}"/.test(t.slice(0, cut))) throw new Error(`[switch] ${id}: the kept opener still opens ${id}`);
      const opener =
        t
          .slice(0, cut)
          .replace(/^import \{ defineOverlay \} from "@ai-matrx\/summon\/react";\n/m, "")
          .replace(/^import type \{ OverlayWire \} from "\.\/overlay-types";\n/m, "")
          .replace(/\s*$/, "\n");
      write(`${DEFS}/${plan.keepOpenerAs}${path.extname(defFile)}`, opener);
      openerHome.set(id, plan.keepOpenerAs);
    }
    for (const f of [defFile, `${DEFS}/${id}.render.tsx`, `${DEFS}/${id}.link.ts`]) if (exists(f)) fs.rmSync(abs(f));
    patch(`${DEFS}/registry.ts`, (t) => t.replace(`import { ${id}Overlay } from "./${id}.overlay";\n`, "").replace(`  ${id}Overlay,\n`, ""));
    patch(`${DEFS}/overlay-ids.ts`, (t) => t.replace(`  ${id}: true,\n`, ""));
    resolve(`${id}: superseded overlay removed (no definition, render module or registry row; its window component deleted)${plan.keepOpenerAs ? `; opener kept as ${DEFS}/${plan.keepOpenerAs} (it opens the replacement)` : ""}`);
  }
  // generated record-page census rows for the deleted window component
  const row = "window:features/window-panels/windows/AudioDevicesWindow.tsx";
  patch("lib/record-pages/record-pages.generated.json", (t) => t.replace(new RegExp(`\\n  "${row.replace(/[/.]/g, "\\$&")}": \\{[^}]*\\},`), ""));
  patch("lib/record-pages/pending.json", (t) => t.replace(`\n  "${row}",`, ""));
}

// ── C. host wiring ───────────────────────────────────────────────────────────────────────────

function emitHost(): void {
  write(
    `${HOST}/ports.ts`,
    `/**
 * The app's @ai-matrx/summon ports. Store-independent ones (notify, errors) are module values;
 * the rest are built from the app store: identity (\`auth:<id>\` / \`guest:<fingerprint>\`), the
 * admin debug flag, and persistence over the person's \`users.user_surface_state\` rows through
 * the app's @ai-matrx/data doors.
 */
import { createDb } from "@ai-matrx/data/db";
import type { DebugPort, ErrorSinkPort, IdentityPort, NotifyOptions, NotifyPort, OverlayPersistencePort } from "@ai-matrx/summon";
import { createDataPersistence } from "@ai-matrx/summon/persistence/data";
import { toast } from "@/lib/toast";
import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import { selectIsDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import { selectAuthReady, selectFingerprintId, selectUserId } from "@/lib/redux/selectors/userSelectors";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import type { RootState } from "@/lib/redux/store";
import { supabase } from "@/utils/supabase/client";

interface StoreLike {
  getState(): unknown;
  subscribe(listener: () => void): () => void;
}

const toastOptions = (o?: NotifyOptions) =>
  o ? { id: o.id, description: o.description, duration: o.duration, action: o.action } : undefined;

export const appNotifyPort: NotifyPort = {
  info: (message, o) => void toast.info(message, toastOptions(o)),
  warn: (message, o) => void toast.warning(message, toastOptions(o)),
  error: (message, o) => void toast.error(message, toastOptions(o)),
  dismiss: (id) => void toast.dismiss(id),
};

export const appErrorPort: ErrorSinkPort = {
  capture: (error, context) => {
    const e = error instanceof Error ? error : new Error(typeof error === "string" ? error : "overlay error");
    const source = typeof context.source === "string" ? context.source : "overlays";
    captureError({
      source: "runtime-exception",
      name: \`overlays:\${source}\`,
      message: e.message,
      stack: e.stack,
      raw: context,
      level: typeof context.level === "string" ? context.level : undefined,
    });
  },
};

export function createDebugPort(getState: () => unknown): DebugPort {
  return { enabled: () => !!getState() && selectIsDebugMode(getState() as RootState) };
}

// The store's middleware is built inside configureStore, before the store exists; it reads state
// through this binding (lib/redux/store.ts binds it right after creating the store).
let readStoreState: () => unknown = () => undefined;
export function bindOverlayStoreState(read: () => unknown): void {
  readStoreState = read;
}

/** Ports the store's overlays middleware needs (the render watchdog): notify, errors, debug. */
export function createStoreOverlayPorts() {
  return { notify: appNotifyPort, errors: appErrorPort, debug: createDebugPort(() => readStoreState()) };
}

export function createIdentityPort(store: StoreLike): IdentityPort {
  return {
    current: () => {
      const s = store.getState() as RootState;
      const userId = selectUserId(s);
      const fingerprint = selectFingerprintId(s);
      const key = userId ? \`auth:\${userId}\` : fingerprint ? \`guest:\${fingerprint}\` : "anonymous";
      return { key, ready: selectAuthReady(s) };
    },
    subscribe: (listener) => store.subscribe(listener),
  };
}

export function createPersistencePort(store: StoreLike): OverlayPersistencePort {
  const db = createDb({ client: supabase, organization: () => selectOrganizationId(store.getState() as RootState) });
  return createDataPersistence({ db, userId: () => selectUserId(store.getState() as RootState) });
}

export function createAppOverlayPorts(store: StoreLike) {
  return {
    identity: createIdentityPort(store),
    notify: appNotifyPort,
    errors: appErrorPort,
    debug: { ...createDebugPort(() => store.getState()), subscribe: (l: () => void) => store.subscribe(l) },
    persistence: createPersistencePort(store),
  };
}
`,
  );
  write(
    `${HOST}/AppSummonProvider.tsx`,
    `"use client";

/**
 * The app's SummonProvider + WindowsProvider: the ONE app store (summonReducers + createSummonMiddleware are
 * mounted in lib/redux), the app's ports, every rendered overlay inside the chat surface layer
 * boundary, and the admin "Copy for AI" report in the error card.
 */
import { Suspense, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { locationRouter, type RouterPort } from "@ai-matrx/summon";
import { SummonProvider, type OverlayErrorExtrasContext } from "@ai-matrx/summon/react";
import { useNextRouterPort } from "@ai-matrx/summon/next";
import { WindowsProvider, WindowTraySync } from "@ai-matrx/summon/window-host";
import { SurfaceLayerBoundary } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { useAppStore } from "@/lib/redux/hooks";
import { AppWindowSelectionSurface } from "./AppWindowSelectionSurface";
import { createAppOverlayPorts } from "./ports";

/** Escape belongs to the organization gate (and anything marked to yield) before any window. */
const ESCAPE_YIELD = "[data-organization-gate], [data-overlay-escape-yield]";

// Shown only when an overlay crashes; never in the provider's static graph.
const OverlayErrorCopyForAi = dynamic(() => import("./OverlayErrorCopyForAi"), { ssr: false });

const renderInSurfaceLayer = (node: ReactNode) => <SurfaceLayerBoundary>{node}</SurfaceLayerBoundary>;
const errorReportExtras = (ctx: OverlayErrorExtrasContext) => <OverlayErrorCopyForAi {...ctx} />;

/** useNextRouterPort reads search params, so it sits in its own Suspense island. */
function RouterPortBridge({ onPort }: { onPort: (port: RouterPort) => void }) {
  const port = useNextRouterPort();
  const [published, setPublished] = useState<RouterPort | null>(null);
  if (published !== port) {
    setPublished(port);
    onPort(port);
  }
  return null;
}

export function AppSummonProvider({ children }: { children: ReactNode }) {
  const store = useAppStore();
  const [base] = useState(() => createAppOverlayPorts(store));
  const [router, setRouter] = useState<RouterPort>(locationRouter);
  const [ports, setPorts] = useState(() => ({ ...base, router: locationRouter }));
  if (ports.router !== router) setPorts({ ...base, router });
  return (
    <SummonProvider store={store} ports={ports} renderWrapper={renderInSurfaceLayer} errorReportExtras={errorReportExtras}>
      <Suspense fallback={null}>
        <RouterPortBridge onPort={setRouter} />
      </Suspense>
      {/* Window host options + viewport/tray sync for every WindowPanel, page-local ones included
          (the light window-host section: never loads WindowPanel). */}
      <WindowsProvider selectionSurface={AppWindowSelectionSurface} escapeYieldSelector={ESCAPE_YIELD}>
        <WindowTraySync />
        {children}
      </WindowsProvider>
    </SummonProvider>
  );
}
`,
  );
  write(
    `${HOST}/OverlayErrorCopyForAi.tsx`,
    `"use client";

import type { OverlayErrorExtrasContext } from "@ai-matrx/summon/react";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { selectIsAdminDebugger } from "@/lib/redux/selectors/userSelectors";
import { buildOverlayErrorAgentPayload, buildOverlayErrorHuman, type OverlayErrorContext } from "./overlayErrorReport";

/** The admin "Copy for AI" pair in an overlay's error card (what the old fallback footer held). */
export default function OverlayErrorCopyForAi({ overlayId, error, componentStack }: OverlayErrorExtrasContext) {
  const isAdmin = useAppSelector(selectIsAdminDebugger);
  const store = useAppStore();
  if (!isAdmin) return null;
  const ctx: OverlayErrorContext = {
    modulePath: overlayId,
    error,
    componentStack: componentStack ?? null,
    isAdmin,
    getReduxState: () => store.getState(),
  };
  return <CopyButtons size="sm" label="Overlay error" human={() => buildOverlayErrorHuman(ctx)} agent={() => buildOverlayErrorAgentPayload(ctx)} />;
}
`,
  );
  write(
    `${HOST}/AppWindowSelectionSurface.tsx`,
    `"use client";

import type { ReactNode } from "react";
import { useContentTransferSurface } from "@ai-matrx/alchemy/react/workspace";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";

/** Every window body sits inside the app's right-click menu for read-only content. */
export function AppWindowSelectionSurface({ children }: { children: ReactNode }) {
  const surfaceName = useContentTransferSurface()?.surfaceName ?? undefined;
  return (
    <NonEditableContextMenu sourceFeature="system" surfaceName={surfaceName}>
      <div className="contents" data-window-selection-surface="">
        {children}
      </div>
    </NonEditableContextMenu>
  );
}
`,
  );
  write(
    `${HOST}/OverlayWorldHost.tsx`,
    `"use client";

/**
 * The overlay world: every app overlay rendered by its definition (one subscriber per overlay).
 * Loaded only through app/DeferredOverlayWorld.tsx; window options and tray sync are mounted at
 * the app root (AppSummonProvider).
 */
import { SummonHost } from "@ai-matrx/summon/react";
import { APP_OVERLAYS } from "@/features/overlays/definitions/registry";
import "@/features/overlays/definitions/trayPreviews";

export function OverlayWorldHost() {
  return <SummonHost definitions={APP_OVERLAYS} />;
}
`,
  );
  write(
    `${HOST}/OverlayServices.tsx`,
    `"use client";

/**
 * Render-free services that must run before anything opens: the \`?panels=\` link manager (every
 * definition's link.hydrate) and persistence (the person's open windows and saved component
 * state). Mounted by the deferred singleton core; an open they trigger loads the overlay world.
 */
import { Suspense, useEffect } from "react";
import { allOverlayMeta, closeAllInstancesOfOverlay, openOverlay, type OverlayId } from "@ai-matrx/summon";
import { OverlayLinkManager } from "@ai-matrx/summon/url";
import { OverlayPersistence } from "@ai-matrx/summon/persistence";
import { useAppStore } from "@/lib/redux/hooks";
import { ensureAppOverlaysRegistered } from "@/features/overlays/definitions/register";

ensureAppOverlaysRegistered();

declare global {
  interface Window {
    /** Dev builds only: the overlay sweep (scripts/overlays-convert/sweep.ts) opens overlays through it. */
    __overlaysTest?: {
      ids(): string[];
      open(id: string, data?: Record<string, unknown>): string;
      close(id: string): void;
      isOpen(id: string, instanceId: string): boolean;
    };
  }
}

export function OverlayServices() {
  const store = useAppStore();
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    window.__overlaysTest = {
      ids: () => allOverlayMeta().map((m) => m.id),
      open: (id, data) => {
        const multi = allOverlayMeta().find((m) => m.id === id)?.instance === "multi";
        const instanceId = multi ? \`sweep-\${Date.now()}\` : "default";
        store.dispatch(openOverlay({ overlayId: id as OverlayId, instanceId, data: data ?? {} }));
        return instanceId;
      },
      close: (id) => void store.dispatch(closeAllInstancesOfOverlay({ overlayId: id as OverlayId })),
      isOpen: (id, instanceId) => !!(store.getState() as { overlays: { overlays: Record<string, Record<string, unknown> | undefined> } }).overlays.overlays[id]?.[instanceId],
    };
    return () => {
      delete window.__overlaysTest;
    };
  }, [store]);
  return (
    <>
      <Suspense fallback={null}>
        <OverlayLinkManager />
      </Suspense>
      <OverlayPersistence />
    </>
  );
}
`,
  );
}

function wireHost(): void {
  // store: package reducers + middleware replace the four slices and the two app middlewares
  patch("lib/redux/rootReducer.ts", (t) => {
    t = t
      .replace(/^import overlaySlice from "\.\/slices\/overlaySlice";\n/m, "")
      .replace(/^import overlayDataReducer from "\.\/slices\/overlayDataSlice";\n/m, "")
      .replace(/^import windowManagerReducer from "\.\/slices\/windowManagerSlice";\n/m, "")
      .replace(/^import urlSyncReducer from "\.\/slices\/urlSyncSlice";\n/m, "");
    if (!t.includes(`import { summonReducers } from "@ai-matrx/summon";`)) t = t.replace(/^(import [^\n]+\n)/m, `$1import { summonReducers } from "@ai-matrx/summon";\n`);
    t = swap("rootReducer.ts", t, /\n  overlays: overlaySlice,\n/, "\n  // overlays, windowManager, urlSync, overlayState (@ai-matrx/summon)\n  ...summonReducers,\n");
    t = t.replace(/\n  overlayData: overlayDataReducer,\n/, "\n").replace(/\n  windowManager: windowManagerReducer,\n/, "\n").replace(/\n  urlSync: urlSyncReducer,\n/, "\n");
    return t;
  });
  patch("lib/redux/store.ts", (t) => {
    t = t
      .replace(/^import \{ overlayRenderWatchdogMiddleware \} from "[^"]+";\n/m, "")
      .replace(/^import \{ windowPersistenceCloseMiddleware \} from "[^"]+";\n/m, "");
    if (!t.includes(`from "@ai-matrx/summon";`)) {
      t = t.replace(/^(import \{ reduxErrorCaptureMiddleware \} from [^\n]+\n)/m, `import { createSummonMiddleware } from "@ai-matrx/summon";\nimport { bindOverlayStoreState, createStoreOverlayPorts } from "${HOST_SPEC}/ports";\n$1`);
    }
    t = swap("store.ts", t, "\n  let bootPromise: Promise<void> | null = null;", "\n  bindOverlayStoreState(() => store.getState());\n  let bootPromise: Promise<void> | null = null;", "bindOverlayStoreState(");
    return swap(
      "store.ts",
      t,
      /\n(\s+)windowPersistenceCloseMiddleware,\n\s+overlayRenderWatchdogMiddleware,\n/,
      "\n$1// close lifecycle + render watchdog (@ai-matrx/summon)\n$1...createSummonMiddleware(createStoreOverlayPorts()),\n",
      "createSummonMiddleware(createStoreOverlayPorts()",
    );
  });
  // providers: AppSummonProvider replaces WindowPersistenceManager; dead providers leave
  for (const rel of ["app/Providers.tsx", "features/applets-host/AppletProviders.tsx"]) {
    patch(rel, (t) => {
      t = t
        .replace(/(\/\/[^\n]*\n)*import \{ WindowPersistenceManager \} from "@\/features\/window-panels\/WindowPersistenceManager";\n/, `import { AppSummonProvider } from "${HOST_SPEC}/AppSummonProvider";\n`)
        .replace(/^import \{ RefProvider \} from "@\/lib\/refs";\n/m, "")
        .replace(/^import \{ PersistentComponentProvider \} from "@\/providers\/persistance\/PersistentComponentProvider";\n/m, "")
        .replace(/<WindowPersistenceManager>/g, "<AppSummonProvider>")
        .replace(/<\/WindowPersistenceManager>/g, "</AppSummonProvider>")
        .replace(/^\s*<\/?RefProvider>\n/gm, "")
        .replace(/^\s*<\/?PersistentComponentProvider>\n/gm, "");
      if (!t.includes("AppSummonProvider")) throw new Error(`[switch] ${rel}: AppSummonProvider not mounted`);
      return t;
    });
  }
  patch("features/board/__tests__/remount-safety/app-providers.tsx", (t) =>
    t.replace(/^import \{ RefProvider \} from "@\/lib\/refs";\n/m, "").replace(/^\s*<\/?RefProvider>\n/gm, ""),
  );
  patch("app/DeferredSingletonCore.tsx", (t) => {
    t = t
      .replace(/^import \{ PersistentDOMConnector \} from "[^"]+";\n/m, "")
      .replace(/^\s*<PersistentDOMConnector \/>\n/m, "")
      .replace(/^import \{ UrlPanelManager \} from "[^"]+";\n/m, `import { OverlayServices } from "${HOST_SPEC}/OverlayServices";\n`);
    return swap("DeferredSingletonCore.tsx", t, /<Suspense fallback=\{null\}>\s*<UrlPanelManager \/>\s*<\/Suspense>/, "<OverlayServices />");
  });
  patch("app/DeferredOverlayWorld.tsx", (t) => {
    t = t.replace(/^import OverlayController from "@\/features\/overlays\/OverlayController";\n/m, `import { OverlayWorldHost } from "${HOST_SPEC}/OverlayWorldHost";\n`);
    return swap("DeferredOverlayWorld.tsx", t, "<OverlayController />", "<OverlayWorldHost />");
  });
  patch("features/shell/islands/DeferredIslands.tsx", (t) => {
    t = t.replace(/const WindowTraySync = dynamic\(\s*\(\) => import\("@\/features\/window-panels\/WindowTraySync"\)[\s\S]*?\);\n/, "");
    t = t.replace(/\n\s*\{\/\* Window geometry must listen[\s\S]*?\*\/\}\n\s*<WindowTraySync \/>/, "").replace(/\n\s*<WindowTraySync \/>/, "");
    if (t.includes("WindowTraySync")) throw new Error("[switch] DeferredIslands.tsx: WindowTraySync still referenced");
    if (!/\bdynamic\(/.test(t)) t = t.replace(/^import dynamic from "next\/dynamic";\n/m, "");
    resolve("WindowTraySync: moved from the shell's deferred islands to the app root (AppSummonProvider, @ai-matrx/summon/window-host)");
    return t;
  });
  // extension bridge → the package's one link door
  patch("lib/extension-bridge/openPanelHandler.ts", (t) => {
    if (t.includes("openPanelRequest")) return t;
    const head = t.slice(0, t.indexOf("import type { Dispatch"));
    return (
      head +
      `import type { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { openPanelRequest } from "@ai-matrx/summon/url";
import { OpenPanelPayloadSchema } from "@/lib/types/bridge-envelope";
import { ensureAppOverlaysRegistered } from "${DEFS_SPEC}/register";

/**
 * Result returned to the extension over the bridge. Mirrors the
 * \`FrontendRpcResponse\` shape so the extension's \`chrome.runtime.sendMessage\`
 * callback and its Broadcast reply handler can use one branch.
 */
export type OpenPanelResult =
  | { ok: true; opened: true; panelId: string; instanceId: string | null }
  | { ok: false; error: string; details?: unknown };

/**
 * Translate an inbound \`openPanel\` envelope into an overlay open through the package's one
 * link door (\`openPanelRequest\`: registered-id check, default instance, same open path every
 * in-app caller takes). The envelope is validated against the bridge schema first.
 */
export function handleExtensionOpenPanel(
  dispatch: Dispatch<UnknownAction>,
  rawPayload: unknown,
): OpenPanelResult {
  const parsed = OpenPanelPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return { ok: false, error: "invalid_payload", details: parsed.error.issues };
  }
  ensureAppOverlaysRegistered();
  const result = openPanelRequest(parsed.data, { dispatch });
  if (!result.ok) return { ok: false, error: result.error, details: result.details };
  return { ok: true, opened: true, panelId: result.panelId, instanceId: result.instanceId };
}
`
    );
  });
  resolve("extension bridge: handleExtensionOpenPanel → zod envelope check + openPanelRequest (package door)");
  // notifications → openFromLink (all or nothing)
  patch("features/notifications/openPanelsInPlace.ts", (t) => {
    if (t.includes("openFromLink")) return t;
    const head = t.slice(0, t.indexOf("import type { AppDispatch }"));
    return (
      head +
      `import type { AppDispatch } from "@/lib/redux/store";
import { getOverlayMetaByLinkKey } from "@ai-matrx/summon";
import { canonicalLinkKey, openFromLink, parseLinkParam } from "@ai-matrx/summon/url";
import { ensureAppOverlaysRegistered } from "${DEFS_SPEC}/register";

export type OpenInPlaceResult =
  { opened: true; keys: string[] } | { opened: false; missingKeys: string[] };

/**
 * Open a notification's \`?panels=\` value in place — all or nothing: when any key has no
 * registered definition nothing opens and the caller opens the link in a new tab instead.
 */
export function openPanelsInPlace(
  dispatch: AppDispatch,
  panelsParam: string,
): OpenInPlaceResult {
  ensureAppOverlaysRegistered();
  const tokens = parseLinkParam(panelsParam);
  const missingKeys = tokens
    .filter((token) => !getOverlayMetaByLinkKey(canonicalLinkKey(token.key)))
    .map((token) => token.key);
  if (tokens.length === 0 || missingKeys.length > 0) {
    return { opened: false, missingKeys };
  }
  // Every key is known, so nothing is refused for being unknown; sync hydrators have dispatched
  // before this returns.
  void openFromLink(\`?panels=\${encodeURIComponent(panelsParam)}\`, { dispatch, requireAll: true });
  return { opened: true, keys: tokens.map((token) => token.key) };
}
`
    );
  });
  resolve("notifications: openPanelsInPlace → parseLinkParam + registry check (sync answer) + openFromLink(requireAll)");
  // registry metadata readers → the app definitions
  patch("features/window-panels/tools-grid/activateToolsGridTile.ts", (t) =>
    swap(
      "activateToolsGridTile.ts",
      t.replace(
        /^import \{ getStaticEntryByOverlayId \} from "@\/features\/window-panels\/registry\/windowRegistryMetadata";\n/m,
        `import { appOverlayDefinition } from "${DEFS_SPEC}/register";\n`,
      ),
      /getStaticEntryByOverlayId\(tile\.overlayId\);([\s\S]*?)entry\.instanceMode === "multi"/,
      'appOverlayDefinition(tile.overlayId);$1entry.instance === "multi"',
      "appOverlayDefinition(tile.overlayId)",
    )
      .replace(/\bentry\.slug\b/g, "(entry.window?.windowId ?? entry.id)")
      .replace(/\bentry\.overlayId\b/g, "entry.id"),
  );
  patch("features/window-panels/tools-grid/ToolsGrid.tsx", (t) =>
    swap(
      "ToolsGrid.tsx",
      t.replace(/^import \{ getStaticEntryByOverlayId \} from "@\/features\/window-panels\/registry\/windowRegistryMetadata";\n/m, `import { appOverlayDefinition } from "${DEFS_SPEC}/register";\n`),
      /getStaticEntryByOverlayId\(tile\.overlayId\)([\s\S]*?)deprecated=\{!!entry\?\.deprecated\}/,
      "appOverlayDefinition(tile.overlayId)$1deprecated={!!entry?.window?.deprecated}",
      "appOverlayDefinition(tile.overlayId)",
    ),
  );
  patch("features/window-panels/components/SidebarWindowToggle.tsx", (t) =>
    swap(
      "SidebarWindowToggle.tsx",
      t.replace(/^import \{ getStaticEntryBySlug \} from "@\/features\/window-panels\/registry\/windowRegistryMetadata";\n/m, `import { APP_OVERLAYS } from "${DEFS_SPEC}/registry";\n`),
      /!!getStaticEntryBySlug\(win\.id\)\s*\?\.deprecated/,
      "!!APP_OVERLAYS.find((d) => (d.window?.windowId ?? d.id) === win.id)?.window?.deprecated",
    ),
  );
  resolve("getStaticEntryByOverlayId / getStaticEntryBySlug (tools grid, sidebar toggle) → the app definition (APP_OVERLAYS): instanceMode → instance, deprecated → window.deprecated, slug → window.windowId ?? id");
  patch("features/admin/utils/lookupOverlay.ts", (t) => {
    if (t.includes("OVERLAY_META_INDEX")) return t;
    const head = t.slice(0, t.indexOf("import {"));
    return (
      head +
      `import type { MobilePresentation } from "@ai-matrx/summon";
// The plain metadata index, never the registry: FeatureAdminPage is a server component and the
// definitions are client modules.
import { OVERLAY_META_INDEX, type OverlayMetaRow } from "${DEFS_SPEC}/overlay-meta-index";

type AppOverlay = OverlayMetaRow;

export interface ResolvedWindowPanel {
  overlayId: string;
  slug: string | null;
  label: string;
  kind: "window" | "overlay";
  instanceMode: "singleton" | "multi";
  mobilePresentation: MobilePresentation | undefined;
  deprecated?: { replacement?: string; reason?: string };
}

const find = (overlayId: string): AppOverlay | undefined => OVERLAY_META_INDEX.find((d) => d.id === overlayId);
const windowSlug = (d: AppOverlay): string => d.window?.windowId ?? d.id;

export function resolveWindowPanel(overlayId: string): ResolvedWindowPanel | null {
  const d = find(overlayId);
  if (!d?.window) return null;
  return {
    overlayId,
    slug: windowSlug(d),
    label: d.label,
    kind: "window",
    instanceMode: d.instance === "multi" ? "multi" : "singleton",
    mobilePresentation: d.window.mobile,
    deprecated: d.window.deprecated,
  };
}

export interface ResolvedOverlay {
  overlayId: string;
  label: string;
  instanceMode: "singleton" | "multi";
  isWindow: boolean;
}

export function resolveOverlay(overlayId: string): ResolvedOverlay | null {
  const d = find(overlayId);
  if (!d) return null;
  return { overlayId, label: d.label, instanceMode: d.instance === "multi" ? "multi" : "singleton", isWindow: !!d.window };
}

export function findWindowPanelsBySlugPrefix(prefix: string): ResolvedWindowPanel[] {
  return OVERLAY_META_INDEX.filter((d) => d.window && windowSlug(d).startsWith(prefix))
    .map((d) => resolveWindowPanel(d.id))
    .filter((r): r is ResolvedWindowPanel => r !== null);
}
`
    );
  });
  resolve("features/admin/utils/lookupOverlay.ts: catalogue + window metadata lookups → OVERLAY_META_INDEX (server-safe plain data; kind now window|overlay; deprecated uses replacement/reason)");
  // the one in-app lazyOverlay use outside the controller
  patch("features/agent-shortcuts/components/LinkAgentToShortcutModal.tsx", (t) => {
    t = t.replace(/^import \{ lazyOverlay \} from "@\/features\/overlays\/boundary\/lazyOverlay";\n/m, 'import dynamic from "next/dynamic";\n');
    return swap(
      "LinkAgentToShortcutModal.tsx",
      t,
      /const CategoryForm = lazyOverlay<\s*import\("\.\/CategoryForm"\)\.CategoryFormProps\s*>\(\s*\(\) => import\("\.\/CategoryForm"\)\.then\(\(m\) => m\.CategoryForm\),\s*\{ ssr: false \},\s*"[^"]+",\s*\);/,
      'const CategoryForm = dynamic<import("./CategoryForm").CategoryFormProps>(\n  () => import("./CategoryForm").then((m) => m.CategoryForm),\n  { ssr: false },\n);',
    );
  });
  resolve("LinkAgentToShortcutModal: lazyOverlay (deleted app boundary) → next/dynamic with ssr:false (same one-edge lazy chunk)");
  // overlayDataSlice mirror → overlayState
  patch("components/mardown-display/chat-markdown/FullScreenMarkdownEditorBridge.tsx", (t) => {
    t = t.replace(/^import \{ updateOverlayData \} from "@\/lib\/redux\/slices\/overlayDataSlice";\n/m, 'import { instanceKey, setOverlayStateValue } from "@ai-matrx/summon";\n');
    return t.replace(
      /updateOverlayData\(\{\s*overlayId: "fullScreenEditor",\s*instanceId,\s*updates: \{ content: newContent \},\s*\}\)/g,
      'setOverlayStateValue({ key: instanceKey("fullScreenEditor", instanceId), name: "content", value: newContent })',
    );
  });
  resolve("FullScreenMarkdownEditorBridge: updateOverlayData({updates:{content}}) → setOverlayStateValue({key: instanceKey, name: 'content'}) (overlayState slice)");
  // MatrxFloatingFrame → LiteWindow (same props; onClose optional)
  for (const rel of ["components/matrx/resizable/MatrxDynamicPanelHost.tsx", "providers/chatUiRegistration.ts"]) {
    patch(rel, (t) =>
      t
        .replace(/import type \{ FloatingFrameSize \} from "@\/components\/matrx\/resizable\/MatrxFloatingFrame";/, 'import type { FloatingFrameSize } from "@ai-matrx/summon/lite";')
        .replace(/import\("@\/components\/matrx\/resizable\/MatrxFloatingFrame"\)\.then\(\s*\(m\) => m\.MatrxFloatingFrame,?\s*\)/, 'import("@ai-matrx/summon/lite").then((m) => m.LiteWindow)')
        .replace(/import \{ MatrxFloatingFrame as (\w+) \} from "@\/components\/matrx\/resizable\/MatrxFloatingFrame";/, 'import { LiteWindow as $1 } from "@ai-matrx/summon/lite";'),
    );
  }
  resolve("MatrxFloatingFrame → LiteWindow (@ai-matrx/summon/lite), import aliased so JSX stays");
  // the dev-only eager-load guard of the deleted engine (the package's assertLazyLoaded is opt-in)
  patch("app/DeferredSingletonWrapper.tsx", (t) => t.replace(/^import "@\/features\/window-panels\/utils\/lazy-bundle-guard";\n/m, ""));
  resolve("app/DeferredSingletonWrapper.tsx: side-effect import of the engine's lazy-bundle-guard removed (it would now load the whole window section eagerly)");
  // tests that read the catalogue / window metadata as objects → a view built from APP_OVERLAYS
  for (const rel of [
    "components/agent-copy/copy-subset/overlay-registration.test.ts",
    "features/connectors/__tests__/every-connected-product-offers-its-first-action.test.ts",
    "features/connectors/__tests__/an-opened-overlay-is-a-catalogued-overlay.test.ts",
    "features/window-panels/__tests__/everyWindowHasAnAddress.test.ts",
    "features/ai-watch/__tests__/watch-ai-never-restored.test.ts",
  ]) {
    patch(rel, (t) => catalogueViewForTest(rel, t));
  }
  patch("components/admin/state-analyzer/stateViewerTabs.tsx", (t) =>
    t.replace('id: "overlayData",\n      label: "Overlay Data",', 'id: "overlayState",\n      label: "Overlay State",').replace('sliceKey="overlayData"', 'sliceKey="overlayState"').replace("completeState.overlayData}", "completeState.overlayState}"),
  );
  resolve("state analyzer tab: overlayData slice → overlayState (package)");
  patch("providers/ChatHostAdapter.tsx", (t) => {
    t = t.replace("openOverlay({ overlayId: chatWindowOverlay(id), instanceId, data })", "overlaysRawActions.openOverlay({ overlayId: chatWindowOverlay(id), instanceId, data: data as Readonly<Record<string, unknown>> | null })");
    if (t.includes("overlaysRawActions.openOverlay") && !/import \{[^}]*overlaysRawActions/.test(t)) t = t.replace(/^(import [^\n]+\n)/m, `$1import { overlaysRawActions } from "@ai-matrx/summon";\n`);
    return t;
  });
  resolve("ChatHostAdapter: chat-window open with unknown data → overlaysRawActions.openOverlay (erased id/data, as the chat port hands them)");
  // tests whose subject moved into the package / definitions
  patch("features/notifications/__tests__/notice-opens-without-moving-the-page.test.tsx", (t) =>
    swap(
      "notice-opens-without-moving-the-page.test.tsx",
      t,
      /jest\.mock\("@\/features\/window-panels\/url-sync\/initUrlHydration", \(\) => \(\{\n  initUrlHydration: \(\) => \{\n    const \{ registerPanelHydrator \} = require\("@\/features\/window-panels\/url-sync\/UrlPanelRegistry"\);\n    registerPanelHydrator\("test_window", testHydrator\);\n  \},\n\}\)\);/,
      `jest.mock("${DEFS_SPEC}/register", () => ({
  ensureAppOverlaysRegistered: () => {
    const { registerOverlayMeta } = require("@ai-matrx/summon");
    registerOverlayMeta([
      {
        id: "testWindow",
        label: "Test window",
        instance: "single",
        link: { key: "test_window", hydrate: (ctx: { dispatch: unknown; id: string; args: unknown }) => testHydrator(ctx.dispatch, ctx.id, ctx.args) },
      },
    ]);
  },
}));`,
      `jest.mock("${DEFS_SPEC}/register"`,
    ),
  );
  patch("features/window-panels/detail/__tests__/the-title-never-runs-under-the-actions.test.tsx", (t) => {
    t = swap("the-title-never-runs…test.tsx", t, /^(import \{ WindowPanel \} from "[^"]+";)$/m, '$1\nimport { SummonProvider } from "@ai-matrx/summon/react";', 'import { SummonProvider } from "@ai-matrx/summon/react";');
    t = swap("the-title-never-runs…test.tsx", t, /(\n(\s*)<Provider store=\{store\}>\n)([\s\S]*?)(\n\s*<\/Provider>)/, "$1$2  <SummonProvider store={store}>\n$3\n$2  </SummonProvider>$4", "<SummonProvider store={store}>");
    return t;
  });
  resolve("tests: notice-opens-without-moving-the-page mocks the definitions registration (test link on the package registry); the-title-never-runs renders WindowPanel inside SummonProvider (WindowPanel needs the provider)");
  patch("components/agent-copy/copy-subset/overlay-registration.test.ts", (t) => {
    const start = t.indexOf('  it("has a lazy import and a gated multi-instance block in the controller"');
    if (start < 0) return t;
    const end = t.lastIndexOf("});");
    return (
      t.slice(0, start) +
      `  it("has a definition whose render module renders the window per instance", () => {
    const definition = readFileSync(join(ROOT, "${DEFS}/copySubsetWindow.overlay.tsx"), "utf8");
    expect(definition).toContain('render: () => import("./copySubsetWindow.render")');
    expect(definition).toContain('instance: "multi"');
    const render = readFileSync(join(ROOT, "${DEFS}/copySubsetWindow.render.tsx"), "utf8");
    expect(render).toContain('from "@/components/agent-copy/copy-subset/CopySubsetWindow"');
    expect(render).toContain("instanceId");
  });

  it("keeps the typed opener (hook + controller component) in the definition file", () => {
    const opener = readFileSync(join(ROOT, "${DEFS}/copySubsetWindow.overlay.tsx"), "utf8");
    expect(opener).toContain("export function useOpenCopySubsetWindow");
    expect(opener).toContain("export function CopySubsetWindowController");
    expect(opener).toContain('const OVERLAY_ID = "copySubsetWindow" as const');
    // Rows and callbacks never enter Redux: only the session id travels.
    expect(opener).toContain("registerCopySubsetSession(");
    expect(opener).not.toMatch(/data:\\s*\\{[^}]*rows/);
  });
` +
      t.slice(end)
    );
  });
  resolve("components/agent-copy/copy-subset/overlay-registration.test.ts: controller/opener source assertions → definition + render module");
  // code samples and source-text assertions that name the old module paths
  patch("app/(admin)/administration/ui/official-components/component-displays/image-asset-uploader.tsx", (t) =>
    t.replace("'@/features/overlays/openers/imageUploaderWindow'", `'${DEFS_SPEC}/imageUploaderWindow.overlay'`),
  );
  patch("features/marketing/content-plan/components/__tests__/node-measure-window-boundary.test.ts", (t) =>
    t.replace(/'from "@\/features\/window-panels\/WindowPanel"'/g, `'from "${WIN}"'`),
  );
  patch("scripts/check-hidden-primary-actions.ts", (t) => t.replace('import { WindowPanel } from "@/features/window-panels/WindowPanel";', `import { WindowPanel } from "${WIN}";`));
  resolve("source-text references to old paths (a code sample, a boundary test's expected import, a guard fixture) → new paths");
  // the catalogue as an object → APP_OVERLAYS
  patch("scripts/check-surface-overlays.ts", (t) =>
    swap(
      "check-surface-overlays.ts",
      t.replace(/^import \{ OVERLAY_CATALOGUE \} from "@\/features\/overlays\/catalogue";\n/m, `import { APP_OVERLAYS } from "${DEFS_SPEC}/registry";\n`),
      "new Set<string>(Object.keys(OVERLAY_CATALOGUE))",
      "new Set<string>(APP_OVERLAYS.map((d) => d.id))",
    ).replace(/absent from OVERLAY_CATALOGUE/g, "absent from APP_OVERLAYS"),
  );
  resolve("scripts/check-surface-overlays.ts reads APP_OVERLAYS ids");
}

/** Replace a test's catalogue / window-metadata imports with local views over APP_OVERLAYS. */
function catalogueViewForTest(rel: string, t: string): string {
  if (t.includes(`from "${DEFS_SPEC}/registry"`)) return t;
  const sf = parse(rel, t);
  const wanted = new Set<string>();
  let lastImportEnd = 0;
  const removals: Array<[number, number]> = [];
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st)) continue;
    lastImportEnd = st.getEnd();
    const spec = (st.moduleSpecifier as ts.StringLiteral).text;
    if (!/features\/overlays\/catalogue$|registry\/windowRegistryMetadata$/.test(spec)) continue;
    const nb = st.importClause?.namedBindings;
    if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) wanted.add((e.propertyName ?? e.name).text);
    removals.push([st.getFullStart(), st.getEnd()]);
  }
  if (!removals.length) return t;
  const decl: string[] = [`import { APP_OVERLAYS } from "${DEFS_SPEC}/registry";`];
  if (wanted.has("OverlayId")) decl.push(`import type { OverlayId } from "@ai-matrx/summon";`);
  decl.push(
    "",
    "/** The old catalogue's shape, read from the definitions (the catalogue file is gone). */",
    'const OVERLAY_CATALOGUE: Record<string, { label: string; isWindow: boolean; instanceMode: "singleton" | "multi"; closesOnNavigation: boolean }> = Object.fromEntries(',
    '  APP_OVERLAYS.map((d) => [d.id, { label: d.label, isWindow: !!d.window, instanceMode: d.instance === "multi" ? "multi" : "singleton", closesOnNavigation: !!d.closesOnNavigation }]),',
    ");",
  );
  if (wanted.has("isOverlayId")) decl.push("const isOverlayId = (id: string): id is OverlayId => id in OVERLAY_CATALOGUE;");
  if (wanted.has("ALL_WINDOW_STATIC_METADATA"))
    decl.push(
      "/** The old window-metadata rows, read from the definitions: windows with a window id, other overlays with a link. */",
      "const ALL_WINDOW_STATIC_METADATA = APP_OVERLAYS.filter((d) => (d.window ? d.window.windowId !== undefined : d.link !== undefined)).map((d) => ({",
      "  overlayId: d.id,",
      "  slug: d.window?.windowId ?? d.id,",
      "  urlSync: d.link ? { key: d.link.key } : undefined,",
      "  defaultData: d.window?.restoreDefaults as Record<string, unknown> | undefined,",
      "}));",
    );
  if (wanted.has("isPersistableWindow"))
    decl.push("const isPersistableWindow = (overlayId: string): boolean => { const w = APP_OVERLAYS.find((d) => d.id === overlayId)?.window; return !!w && w.windowId !== undefined && !w.ephemeral; };");
  if (wanted.has("getStaticEntryByOverlayId")) throw new Error(`[switch] ${rel}: getStaticEntryByOverlayId needs a hand port`);
  let out = t.slice(0, lastImportEnd) + "\n" + decl.join("\n") + "\n" + t.slice(lastImportEnd);
  for (const [a, b] of removals.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + out.slice(b);
  resolve(`${rel}: catalogue/window-metadata imports → local views over APP_OVERLAYS (${[...wanted].join(", ")})`);
  return out;
}

/**
 * The app's link tests, ported from the deleted url-sync internals onto the package link door and
 * the definitions' link.hydrate. Templates live beside this script (.tpl, so the real tree never
 * type-checks them before the switch).
 */
const PORTED_TESTS: Record<string, string> = {
  "linkKit.ts.tpl": `${DEFS}/__tests__/linkKit.ts`,
  "reviewWalkAddress.test.ts.tpl": "features/review-walk/__tests__/reviewWalkAddress.test.ts",
  "walkTitleSurvivesReload.test.ts.tpl": "features/review-walk/__tests__/walkTitleSurvivesReload.test.ts",
  "aWindowIdentityIsNeverAResourceId.test.ts.tpl": "features/window-panels/__tests__/aWindowIdentityIsNeverAResourceId.test.ts",
  "detailDeepLink.test.ts.tpl": "features/window-panels/__tests__/detailDeepLink.test.ts",
  "a-deep-link-says-what-it-closed.test.ts.tpl": "features/window-panels/detail/__tests__/a-deep-link-says-what-it-closed.test.ts",
  "a-refreshed-window-keeps-its-list.test.ts.tpl": "features/window-panels/detail/__tests__/a-refreshed-window-keeps-its-list.test.ts",
};
function emitPortedTests(): void {
  for (const [tpl, dest] of Object.entries(PORTED_TESTS)) write(dest, fs.readFileSync(path.join(SCRIPT_DIR, "ported-tests", tpl), "utf8"));
  resolve("6 app link tests (2 review-walk, aWindowIdentityIsNeverAResourceId, detailDeepLink, 2 detail deep-link) ported onto hydrateLinkToken / the grammar via definitions/__tests__/linkKit.ts");
}

// ── B. importers ─────────────────────────────────────────────────────────────────────────────

const CORE = "@ai-matrx/summon";
const WIN = "@ai-matrx/summon/window";
const URL_S = "@ai-matrx/summon/url";
const ENGINE_ORDER = [WIN, CORE, URL_S, "@ai-matrx/summon/persistence", "@ai-matrx/summon/lite", "@ai-matrx/summon/react", "@ai-matrx/summon/handles"];

interface Target {
  /** default module for import()/jest.mock/namespace imports */
  spec: string;
  /** name → [module, exported name]; undefined = keep the same name on `spec` */
  name?: (name: string) => [string, string] | null;
}
const SPECIFIC: Record<string, Record<string, [string, string]>> = {
  "features/overlays/catalogue": {
    OverlayId: [CORE, "OverlayId"],
    isOverlayId: [CORE, "isRegisteredOverlay"],
    getCatalogueEntry: [CORE, "getOverlayMeta"],
    OverlayCatalogueEntry: [CORE, "AnyOverlayMeta"],
    OVERLAY_CATALOGUE: [`${DEFS_SPEC}/registry`, "APP_OVERLAYS"],
  },
  "lib/redux/slices/overlaySlice": { default: [CORE, "overlaysReducer"], FullScreenEditorMode: [`${DEFS_SPEC}/fullScreenEditor.overlay`, "FullScreenEditorMode"] },
  "lib/redux/slices/windowManagerSlice": { default: [CORE, "windowManagerReducer"] },
  "lib/redux/slices/urlSyncSlice": { default: [CORE, "linksReducer"] },
  "lib/redux/slices/overlayDataSlice": { default: [CORE, "overlayStateReducer"] },
  "components/matrx/resizable/MatrxFloatingFrame": { MatrxFloatingFrame: ["@ai-matrx/summon/lite", "LiteWindow"] },
  "features/window-panels/mobile/MobileDrawerSurface": { default: [WIN, "MobileDrawerSurface"] },
  "features/window-panels/mobile/MobileCardSurface": { default: [WIN, "MobileCardSurface"] },
  "features/window-panels/url-sync/useUrlSync": { useUrlSync: [URL_S, "useOverlayLink"] },
  "features/window-panels/persistence/windowSessionSerialization": { sanitizeWindowSessionData: [WIN, "sanitizeWindowData"] },
};
function targetFor(rel: string): Target | undefined {
  const noExt = rel.replace(/\.(tsx?|jsx?|mts)$/, "").replace(/\/index$/, "");
  if (noExt.startsWith("features/overlays/openers/")) {
    const base = noExt.slice("features/overlays/openers/".length);
    const home = openerHome.get(base);
    if (!home) return undefined;
    return { spec: `${DEFS_SPEC}/${home}` };
  }
  if (noExt.startsWith("features/overlays/callbacks/")) return { spec: `${DEFS_SPEC}/callbacks/${noExt.slice("features/overlays/callbacks/".length)}` };
  if (noExt === "features/overlays/boundary/overlayErrorReport" || noExt === "features/overlays/boundary/overlayDiagnostics")
    return { spec: `${HOST_SPEC}/${path.basename(noExt)}` };
  if (noExt === "utils/callbackManager" || noExt === "hooks/useCallbackManager") return { spec: "@ai-matrx/summon/handles", name: (n) => lookup(n, ["@ai-matrx/summon/handles"]) };
  const specific = SPECIFIC[noExt];
  const isSlice = noExt.startsWith("lib/redux/slices/");
  const isEngine = noExt.startsWith("features/window-panels/") || noExt === "components/matrx/resizable/MatrxFloatingFrame" || noExt.startsWith("features/overlays/");
  if (!specific && !isSlice && !isEngine) return undefined;
  const order = isSlice || noExt === "features/overlays/catalogue" ? [CORE] : noExt.startsWith("features/window-panels/url-sync/") ? [URL_S, ...ENGINE_ORDER] : ENGINE_ORDER;
  return {
    spec: order[0]!,
    name: (n) => specific?.[n] ?? lookup(n, order),
  };
}
function lookup(name: string, order: string[]): [string, string] | null {
  const spec = pkgFind(name, order);
  return spec ? [spec, name] : null;
}

function rewriteImporters(): void {
  for (const rel of sourceFiles()) {
    if (isDeleted(rel)) continue;
    const text = read(rel);
    if (!/overlaySlice|windowManagerSlice|urlSyncSlice|overlayDataSlice|callbackManager|useCallbackManager|overlays\/|window-panels|MatrxFloatingFrame|from "\.|import\("\.|mock\("\./.test(text)) continue;
    const sf = parse(rel, text);
    const edits: Array<{ start: number; end: number; text: string }> = [];
    const mapSpec = (spec: string): Target | undefined => {
      const r = resolveSpec(rel, spec);
      if (!r || !isDeleted(r)) return undefined;
      const t = targetFor(r);
      if (!t) unresolved.push(`${rel}: "${spec}" → ${r} has no target`);
      return t;
    };
    for (const st of sf.statements) {
      if (!(ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) || !st.moduleSpecifier || !ts.isStringLiteral(st.moduleSpecifier)) continue;
      const spec = st.moduleSpecifier.text;
      const t = mapSpec(spec);
      if (!t) continue;
      if (!t.name) {
        edits.push({ start: st.moduleSpecifier.getStart(), end: st.moduleSpecifier.getEnd(), text: JSON.stringify(t.spec) });
        continue;
      }
      // split by name
      const isExport = ts.isExportDeclaration(st);
      const declType = isExport ? st.isTypeOnly : !!st.importClause?.isTypeOnly;
      const groups = new Map<string, string[]>();
      const add = (mod: string, part: string) => groups.set(mod, [...(groups.get(mod) ?? []), part]);
      const named: Array<{ imported: string; local: string; typeOnly: boolean }> = [];
      let ns: string | undefined;
      if (ts.isImportDeclaration(st)) {
        const c = st.importClause;
        if (!c) {
          edits.push({ start: st.getStart(), end: st.getEnd(), text: `import "${t.spec}";` });
          resolve(`${rel}: side-effect import of ${spec} → ${t.spec}`);
          continue;
        }
        if (c.name) named.push({ imported: "default", local: c.name.text, typeOnly: false });
        const nb = c.namedBindings;
        if (nb && ts.isNamespaceImport(nb)) ns = nb.name.text;
        if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) named.push({ imported: (e.propertyName ?? e.name).text, local: e.name.text, typeOnly: e.isTypeOnly });
      } else if (st.exportClause && ts.isNamedExports(st.exportClause)) {
        for (const e of st.exportClause.elements) named.push({ imported: (e.propertyName ?? e.name).text, local: e.name.text, typeOnly: e.isTypeOnly });
      } else {
        ns = "*";
      }
      if (ns) {
        edits.push({ start: st.moduleSpecifier.getStart(), end: st.moduleSpecifier.getEnd(), text: JSON.stringify(t.spec) });
        resolve(`${rel}: namespace ${isExport ? "re-export" : "import"} of ${spec} → ${t.spec}`);
        continue;
      }
      for (const n of named) {
        const hit = t.name(n.imported);
        if (!hit) {
          unresolved.push(`${rel}: ${n.imported} from "${spec}"`);
          add(t.spec, `${n.typeOnly ? "type " : ""}${n.imported === n.local ? n.local : `${n.imported} as ${n.local}`}`);
          continue;
        }
        const [mod, exported] = hit;
        add(mod, `${n.typeOnly ? "type " : ""}${exported === n.local ? exported : `${exported} as ${n.local}`}`);
      }
      const kw = isExport ? "export" : "import";
      const lines = [...groups.entries()].map(([mod, parts]) => `${kw} ${declType ? "type " : ""}{ ${parts.join(", ")} } from "${mod}";`);
      edits.push({ start: st.getStart(), end: st.getEnd(), text: lines.join("\n") });
    }
    walk(sf, (n) => {
      if (!ts.isCallExpression(n) || !n.arguments[0] || !ts.isStringLiteral(n.arguments[0])) return;
      const callee = n.expression.getText();
      if (!(n.expression.kind === ts.SyntaxKind.ImportKeyword || /^(jest|vi)\.(mock|doMock|unmock|requireActual|requireMock)$/.test(callee) || callee === "require")) return;
      const t = mapSpec(n.arguments[0].text);
      if (!t) return;
      // import() of a module whose DEFAULT export now lives as a named export: keep the default shape
      const old = resolveSpec(rel, n.arguments[0].text);
      const def = old && n.expression.kind === ts.SyntaxKind.ImportKeyword ? read(old).match(/^export default (?:function\s+|class\s+)?(\w+)/m)?.[1] : undefined;
      const usesThen = ts.isPropertyAccessExpression(n.parent) && n.parent.name.text === "then";
      const hit = def && t.name ? t.name(def) : null;
      if (def && hit && !usesThen) {
        edits.push({ start: n.getStart(), end: n.getEnd(), text: `import(${JSON.stringify(hit[0])}).then((m) => ({ default: m.${hit[1]} }))` });
        resolve(`${rel}: import() of ${n.arguments[0].text} (default export) → ${hit[0]} .then(default: ${hit[1]})`);
        return;
      }
      edits.push({ start: n.arguments[0].getStart(), end: n.arguments[0].getEnd(), text: JSON.stringify(t.spec) });
    });
    if (!edits.length) continue;
    let out = text;
    for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    write(rel, out);
  }
}

/** WindowPanel props the package removed (minimize always keeps the body; persistence is the store's). */
/**
 * Package subpaths the published packages retired in favour of summon: @ai-matrx/chat 0.8.138
 * dropped "./utils/callbackManager" (its handles now come from @ai-matrx/summon/handles), so any app
 * file still naming it (imports, jest.mock, import()) is repointed to the summon module.
 */
const RETIRED_PACKAGE_SPECS: Record<string, string> = { "@ai-matrx/chat/utils/callbackManager": "@ai-matrx/summon/handles" };
function repointRetiredPackageSpecs(): void {
  for (const rel of sourceFiles()) {
    if (rel.startsWith("scripts/overlays-convert/") || isDeleted(rel)) continue;
    let text = read(rel);
    if (!Object.keys(RETIRED_PACKAGE_SPECS).some((k) => text.includes(k))) continue;
    for (const [from, to] of Object.entries(RETIRED_PACKAGE_SPECS)) {
      text = text.replace(new RegExp(`(["'])${from.replace(/[/.]/g, "\\$&")}\\1`, "g"), (_m, q) => `${q}${to}${q}`);
    }
    write(rel, text);
    resolve(`${rel}: retired package subpath(s) ${Object.keys(RETIRED_PACKAGE_SPECS).join(", ")} → summon`);
  }
}

const REMOVED_WINDOW_PROPS = new Set(["retainBodyOnMinimize", "onSessionSaved", "onHeavySnapshot"]);

/** B2: drop removed WindowPanel props; host windows that extend Omit<WindowPanelProps, …> and close
 * page-locally leave the overlay close bindings out, so their spread meets the close-binding union. */
function adaptWindowPanelUsers(): void {
  for (const rel of sourceFiles()) {
    if (isDeleted(rel) || !/\.tsx?$/.test(rel)) continue;
    const text = read(rel);
    if (!text.includes("WindowPanel")) continue;
    const sf = parse(rel, text);
    const edits: Array<{ start: number; end: number; text: string }> = [];
    let baseProps = false;
    walk(sf, (n) => {
      if (ts.isJsxAttribute(n) && REMOVED_WINDOW_PROPS.has(n.name.getText())) {
        const el = n.parent.parent;
        if ((ts.isJsxOpeningElement(el) || ts.isJsxSelfClosingElement(el)) && el.tagName.getText() === "WindowPanel") {
          edits.push({ start: n.getFullStart(), end: n.getEnd(), text: "" });
        }
      }
      // `Omit<WindowPanelProps, K>` (type reference or `extends` clause) spread into <WindowPanel>
      // carries `boundToOverlay?: true` (and `overlayId?: string`) from the close-binding union, which
      // then matches no branch of it. A host window that binds its own close leaves them out.
      const omitArgs =
        (ts.isTypeReferenceNode(n) && n.typeName.getText() === "Omit" && n.typeArguments) ||
        (ts.isExpressionWithTypeArguments(n) && n.expression.getText() === "Omit" && n.typeArguments) ||
        undefined;
      if (omitArgs && omitArgs.length === 2 && omitArgs[0]!.getText() === "WindowPanelProps" && /\{\.\.\.\w+\}/.test(text)) {
        edits.push({ start: omitArgs[0]!.getStart(), end: omitArgs[0]!.getEnd(), text: "WindowPanelBaseProps" });
        baseProps = true;
      }
    });
    if (!edits.length) continue;
    let out = text;
    for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    if (baseProps) {
      // the window's own props extend the props WITHOUT the close binding (it binds its own close)
      const stillUsed = /\bWindowPanelProps\b/.test(out.replace(/import[^;]*;/g, ""));
      out = out.replace(/(import \{[^}]*?)\btype WindowPanelProps\b([^}]*\} from "@ai-matrx\/summon\/window";)/, (_m, a, b) =>
        stillUsed ? `${a}type WindowPanelProps, type WindowPanelBaseProps${b}` : `${a}type WindowPanelBaseProps${b}`,
      );
      if (!/\bWindowPanelBaseProps\b[^;]*from "@ai-matrx\/summon\/window"/.test(out)) throw new Error(`[switch] ${rel}: could not import WindowPanelBaseProps`);
    }
    write(rel, out);
    resolve(`${rel}: WindowPanel removed props dropped / Omit<WindowPanelProps, …> → Omit<WindowPanelBaseProps, …>`);
  }
}

// ── D. delete ────────────────────────────────────────────────────────────────────────────────

function deleteReplaced(): void {
  for (const d of DELETED) {
    const rel = d.endsWith("/**") ? d.slice(0, -3) : d;
    if (!exists(rel)) continue;
    fs.rmSync(abs(rel), { recursive: true, force: true });
    deleted.push(rel);
  }
}

// ── E. guards ────────────────────────────────────────────────────────────────────────────────

function repointGuards(): void {
  patch("eslint.config.mjs", (t) =>
    t
      .replace(/"features\/overlays\/OverlayController\.tsx"/g, `"${DEFS}/*.render.tsx"`)
      .replace(
        "Import window components only via the overlay controller's per-overlay dynamic() (features/overlays/OverlayController.tsx).",
        "Import window components only from an overlay's render module (features/overlays/definitions/<id>.render.tsx, loaded lazily by its definition).",
      )
      .replace("No JSX prop spread in OverlayController.tsx — wire every prop by name.", "No JSX prop spread in an overlay render module — wire every prop by name.")
      .replace(
        "  // window component into its own chunk. `features/overlays/openers/**` is the",
        "  // window component into its own chunk. `features/overlays/definitions/**` is the",
      )
      .replace(
        "  // must import from `@/features/overlays/openers/<overlay>`, not from",
        "  // must import from `@/features/overlays/definitions/<overlay>.overlay`, not from",
      ),
  );
  resolve("eslint.config.mjs: no-spread rule → definitions/*.render.tsx; windows-import restriction message + the features/overlays/** seam comment → definitions (the override still covers render modules)");
  patch("scripts/check-alchemy-doors.ts", (t) =>
    t
      .replace(/\n\s*\/\/ WindowPanel's own imperative openPopout handle[^\n]*\n\s*"features\/window-panels\/popout\/usePopoutControl\.ts",/, "")
      .replace(/\n\s*\/\/ URL -> panel HYDRATORS[^\n]*\n\s*"features\/window-panels\/url-sync\/UrlPanelRegistry\.ts",/, ""),
  );
  resolve("scripts/check-alchemy-doors.ts: allowlist rows for two deleted engine files removed");
  patch("scripts/run-notes-2a-isolated-mutations.mjs", (t) => t.replace('"features/overlays/callbacks/fullScreenEditor.test.ts"', `"${DEFS}/callbacks/fullScreenEditor.test.ts"`));
  patch("scripts/dead-ends/scan.ts", (t) => t.replace('  "features/overlays/openers",', `  "${DEFS}",`));
  resolve("scripts/dead-ends/scan.ts + run-notes-2a-isolated-mutations.mjs: openers/callbacks paths → definitions");
  patch("scripts/record-pages/census.ts", (t) =>
    swap(
      "census.ts",
      t,
      /  const controller = "features\/overlays\/OverlayController\.tsx";\n  const controllerText = read\(controller\) \?\? "";\n  const windowFiles = new Set<string>\(\);\n  for \(const m of controllerText\.matchAll\([^\n]+\n    const r = resolveImport\(controller, m\[1\]\);\n    if \(r\) windowFiles\.add\(r\);\n  \}/,
      `  // Each overlay's render module statically imports the component it renders (the lazy chunk).
  const defsDir = "${DEFS}";
  const windowFiles = new Set<string>();
  const renderFiles = existsSync(join(root, defsDir)) ? readdirSync(join(root, defsDir)).filter((f) => f.endsWith(".render.tsx")) : [];
  for (const f of renderFiles) {
    const renderRel = \`\${defsDir}/\${f}\`;
    const text = read(renderRel) ?? "";
    for (const m of text.matchAll(/^import (?!type )(?:[A-Z]\\w*|\\{[^}]*\\b[A-Z]\\w*[^}]*\\}) from ["']([^"']+)["'];$/gm)) {
      if (m[1].startsWith("@ai-matrx/summon")) continue;
      const r = resolveImport(renderRel, m[1]);
      if (r) windowFiles.add(r);
    }
  }`,
      "Each overlay's render module statically imports",
    ),
  );
  resolve("scripts/record-pages/census.ts: window units read from definitions/*.render.tsx component imports (was the controller's lazyOverlay imports)");
  patch("scripts/rich-content-inventory/scan.ts", (t) => {
    t = swap(
      "rich-content scan.ts",
      t,
      "const OPENER_FILE = featureRegExp(/^features\\/overlays\\/openers\\/[^/]+\\.tsx?$/);",
      "const OPENER_FILE = featureRegExp(/^features\\/overlays\\/definitions\\/[^/]+\\.overlay\\.tsx?$/);\n/** An overlay's render module IS its surface root (it renders the overlay's component). */\nconst RENDER_FILE = featureRegExp(/^features\\/overlays\\/definitions\\/[^/]+\\.render\\.tsx$/);",
    );
    t = swap(
      "rich-content scan.ts",
      t,
      '  if (OPENER_FILE.test(rel)) return `opener ${path.basename(rel).replace(/\\.tsx?$/, "")}`;',
      '  if (RENDER_FILE.test(rel)) return `overlay ${path.basename(rel).replace(/\\.render\\.tsx$/, "")}`;\n  if (OPENER_FILE.test(rel)) return `opener ${path.basename(rel).replace(/\\.overlay\\.tsx?$/, "")}`;',
    );
    return t;
  });
  resolve("scripts/rich-content-inventory/scan.ts: overlay surfaces = definitions/*.render.tsx roots, openers = definitions/*.overlay.ts (the controller map finds nothing and is inert)");
}

function wireStylesAndDependency(): void {
  patch("app/globals.css", (t) => {
    t = swap("globals.css", t, '@source "../node_modules/@ai-matrx/capture/dist";\n', '@source "../node_modules/@ai-matrx/capture/dist";\n@source "../node_modules/@ai-matrx/summon/dist";\n', '@source "../node_modules/@ai-matrx/summon/dist";');
    return swap("globals.css", t, '@import "@ai-matrx/design-system/web-base.css";\n', '@import "@ai-matrx/design-system/web-base.css";\n@import "@ai-matrx/summon/styles.css";\n', '@import "@ai-matrx/summon/styles.css";');
  });
  patch("package.json", (t) => swap("package.json", t, '    "@ai-matrx/office": "latest",\n', '    "@ai-matrx/office": "latest",\n    "@ai-matrx/summon": "latest",\n', '"@ai-matrx/summon": "latest"'));
  resolve('globals.css: @source "../node_modules/@ai-matrx/summon/dist" + @import "@ai-matrx/summon/styles.css"; package.json: "@ai-matrx/summon": "latest" (pnpm-lock is NOT touched: install after publish)');
}

// ── run ──────────────────────────────────────────────────────────────────────────────────────

const preSwitch = exists("features/overlays/OverlayController.tsx");
if (preSwitch) {
  emitDefinitions();
  emitHost();
  wireHost();
  emitPortedTests();
} else {
  console.log("[switch] A/C: OverlayController.tsx is gone — definitions and host wiring already in place");
  emitHost();
  emitPortedTests();
}
rewriteImporters();
repointRetiredPackageSpecs();
adaptWindowPanelUsers();
deleteReplaced();
repointGuards();
wireStylesAndDependency();

console.log(`[switch] changed ${changed.size} files, deleted ${deleted.length} paths`);
if (resolutions.length) console.log(`[switch] explicit resolutions:\n  ${resolutions.join("\n  ")}`);
if (unresolved.length) console.log(`[switch] UNRESOLVED (${unresolved.length}):\n  ${unresolved.join("\n  ")}`);
if (REPORT) {
  fs.writeFileSync(REPORT, JSON.stringify({ root: ROOT, changed: [...changed].sort(), deleted, resolutions, unresolved, orphanOpeners }, null, 2));
}
if (unresolved.length) process.exitCode = 1;
