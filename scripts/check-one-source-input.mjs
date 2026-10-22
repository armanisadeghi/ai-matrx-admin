#!/usr/bin/env node
// GUARD: ONE SOURCE INPUT (unified-source-input G1, 2026-10-22).
// Every place a person feeds material to AI uses features/resource-manager/source-input/ (SourceInput)
// and the canonical tiles in features/resource-manager/resource-picker/. A screen that renders its own
// upload / paste / web page / YouTube tile row, keeps its own "add source" option list, or ships a file
// named *SourceInput* / *SourcePicker* / *SourceCapture* is a local copy.
// Shrink-only: scripts/one-source-input-baseline.json lists today's known copies. A copy NOT in the
// baseline fails; a baseline entry that no longer hits is reported (delete it) and never fails.
// Release paths run this report-only (run-release-gates.sh); locally it exits 1.
// Usage: node scripts/check-one-source-input.mjs [--self-test] [--root <dir>] [--baseline <file>] [--write-baseline]
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, "..");
const BASELINE = join(HERE, "one-source-input-baseline.json");
const ROOTS = ["features", "components", "app", "lib"];

// The canonical homes, and hosts of unrelated "source" pickers (file-storage location windows).
const CANONICAL = /(^|\/)features\/resource-manager\/(source-input|resource-picker)\//;
const SKIP = /(^|\/)(node_modules|__tests__|\(dev\)|generated|\.next)(\/|$)|\.(test|spec|stories|d)\.tsx?$|(^|\/)features\/overlays\/|(^|\/)features\/window-panels\//;

const NAME = /Source(Input|Picker|Capture)/;
const OPTIONS_CONST = /^\s*(?:export\s+)?const\s+[A-Z_]*(?:ADD_)?SOURCE_(?:OPTIONS|TILES|CHOICES|DOORS)\b[^\n]*=\s*\[/m;
// A DOOR is a way to put material in. A door LABEL stands alone as a tile / tab / button: a `label:` or
// `text:` value, or JSX text between tags. A bare map entry (`youtube: "YouTube"`), a sentence that happens to
// start with "Upload" (marketing copy, helper text) and a type union are NOT doors. One family list drives
// the row rule, the name rule and the options-list rule.
const LABEL = (words) => new RegExp(`(?:\\b(?:label|text)\\s*:\\s*["'\`]|>\\s*)(?:${words})\\b[^<"'\`\\n]{0,24}(?:["'\`]|<|\\s*$)`, "im");
const DOOR_FAMILIES = [
  ["upload", LABEL("Upload|Audio file|Upload a file")],
  ["paste", LABEL("Paste")],
  ["web", LABEL("Web\\s?page|Website|Web link|URL")],
  ["youtube", LABEL("YouTube")],
];
// A source-options LIST (not any list named *_SOURCE_OPTIONS: a crawl's "discovered via" filter is not one)
// must offer at least two ways in.
const LOOSE_FAMILIES = [/upload|file|audio/i, /paste|text|notes/i, /web ?page|website|\burl\b/i, /youtube|video/i, /\btopic\b/i];
function optionsListIsDoors(src) {
  const m = OPTIONS_CONST.exec(src);
  if (!m) return false;
  const rest = src.slice(m.index);
  const end = rest.search(/\n\]/);
  const body = end < 0 ? rest : rest.slice(0, end);
  return LOOSE_FAMILIES.filter((re) => re.test(body)).length >= 2;
}
// A file named like a source input is a copy only when it gives a person a way to put material in: a file input
// or drop zone, the file picker, a text area, the URL resolver, or one of the source-kind lists.
const FILE_AFFORDANCE = /type=["']file["']|\buseFileUpload\b|\bFilePickerWindow\b|\bonDrop\b|\bDropzone\b|\bSourceResolverPanel\b|<(?:Pro)?[Tt]extarea\b|\b[A-Z_]*SOURCE_(?:OPTIONS|TILES|CHOICES|DOORS)\b/;
const ASSOC_IMPORT = /import\s*\{[^}]*\bUniversalAssociationPicker\b[^}]*\}\s*from/;
// Known local copies the patterns above cannot see (a tile row built from icons, or a data file). They stay
// flagged for as long as the file exists, so the baseline entry is what lets them live, and deleting the file
// (or moving the screen onto <SourceInput>) is what shrinks the census.
const KNOWN_LOCAL = new Set([
  "features/transcript-studio/components/columns/AudioImportDialog.tsx",
  "app/(core)/transcripts/new/page.tsx",
]);
const EDU_CLASS = /(^|\/)features\/education\/classes\//;

// (a) BROWSER-SIDE SOURCE RESOLVERS. SourceResolverPanel / useSourceResolvers turn a URL, YouTube link or note
// into text inside the screen. A reviewer beat the name/label rules with `<SourceResolverPanel resolveKind="website"/>`
// (no door label anywhere in the file). Any use outside the canonical folders is a local copy; the two files that
// DEFINE them are the legacy home and are not themselves flagged (their callers are).
const RESOLVER_USE = /\b(?:SourceResolverPanel|useSourceResolvers)\b|\bresolveKind\s*=/;
const RESOLVER_HOME = /(^|\/)features\/podcasts\/generator\/(components\/SourceResolverPanel|useSourceResolvers)\.tsx?$/;
// (b) A real file intake (not just a word) ...
const REAL_FILE_INTAKE = /type=["']file["']|\buseFileUpload\b|\bFilePickerWindow\b|\bonDrop\b|\bDropzone\b|\bFileDropZone\b/;
// ... living in the same component as a paste / URL / text intake for material.
const PASTE_OR_URL_INTAKE = /<(?:Pro)?[Tt]extarea\b[^>]*placeholder=\{?["'`][^"'`]*(?:paste|https?:|\burl\b|link|notes|transcript)|<(?:Pro)?[Ii]nput\b[^>]*(?:placeholder=\{?["'`][^"'`]*(?:paste|https?:|\burl\b|link|youtube)|type=["']url["'])|\b(?:onPaste|pasteText|setPastedText|pastedText|sourceUrl|setSourceUrl|setUrl)\b/i;
// Only a component that talks about material for AI ("source", "material", "transcript") twice or more counts, so
// image croppers and CRM CSV imports (a file and a URL box, but not material) stay out.
const MATERIAL_WORDS = /\b(?:sources?|materials?|transcripts?)\b/gi;
const NOT_MATERIAL_PATH = /image|asset|crop|brand|stock|\/crm\/|envelope|workbook|board\//i;
const talksAboutMaterial = (src) => (src.match(MATERIAL_WORDS) ?? []).length >= 2;
// (c) A SECOND PAYLOAD SHAPE. Generation takes a SourceSet (source_set); raw text / blobs under input_data or
// a { text } source object are the old shape. Scoped to the education + podcast generation code.
const GEN_SCOPE = /(^|\/)features\/(education|podcasts)\//;
const INPUT_DATA = /\binput_data\b/;
const RAW_SOURCE_FIELD = /\b(?:source|sources|material|materials)\s*:\s*\{\s*(?:text|rawText|raw_text|blob|content)\s*:|\b(?:rawSourceText|raw_source_text|sourceText|source_text|sourceBlob|source_blob)\s*:/;

function* walk(dir) {
  let names;
  try { names = readdirSync(dir); } catch { return; }
  for (const n of names) {
    const p = join(dir, n);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { if (n !== "node_modules" && n !== ".next") yield* walk(p); }
    else if (/\.tsx?$/.test(n)) yield p;
  }
}

/** Rules a file trips. Pure: (relative path, source) -> string[] */
export function findings(rel, src) {
  if (CANONICAL.test(rel) || SKIP.test(rel)) return [];
  const out = [];
  const fams = DOOR_FAMILIES.filter(([, re]) => re.test(src)).map(([n]) => n);
  // A file NAMED like a source input is a copy only when it renders a way in (a door label or a file input).
  // Data-source field forms and database-record pickers carry the name and offer no way to add material.
  if (NAME.test(rel.split("/").pop()) && (fams.length >= 1 || FILE_AFFORDANCE.test(src))) out.push("named-source-input-file");
  if (optionsListIsDoors(src)) out.push("local-source-options-list");
  if (fams.length >= 3) out.push("hand-rolled-door-row");
  if (KNOWN_LOCAL.has(rel)) out.push("known-local-copy");
  if (EDU_CLASS.test(rel) && ASSOC_IMPORT.test(src)) out.push("local-association-picker-for-sources");
  if (!RESOLVER_HOME.test(rel) && RESOLVER_USE.test(src)) out.push("browser-side-source-resolver");
  if (REAL_FILE_INTAKE.test(src) && !NOT_MATERIAL_PATH.test(rel) && talksAboutMaterial(src) && (PASTE_OR_URL_INTAKE.test(src) || fams.some((f) => f !== "upload"))) out.push("file-plus-paste-intake-in-one-component");
  if (GEN_SCOPE.test(rel)) {
    if (INPUT_DATA.test(src)) out.push("second-payload-input-data");
    if (RAW_SOURCE_FIELD.test(src)) out.push("second-payload-raw-source");
  }
  return out;
}

export function scan(root) {
  const hits = {};
  for (const r of ROOTS) {
    for (const f of walk(join(root, r))) {
      const rel = relative(root, f).split("\\").join("/");
      const rules = findings(rel, readFileSync(f, "utf8"));
      if (rules.length) hits[rel] = rules;
    }
  }
  return hits;
}

export function compare(hits, baseline) {
  const grown = [], stale = [];
  for (const [file, rules] of Object.entries(hits)) {
    const allowed = baseline[file];
    if (!allowed) { grown.push(`${file}  [${rules.join(", ")}]`); continue; }
    const extra = rules.filter((r) => !allowed.includes(r));
    if (extra.length) grown.push(`${file}  new rule(s): ${extra.join(", ")}`);
  }
  for (const file of Object.keys(baseline)) if (!hits[file]) stale.push(file);
  return { grown, stale };
}

function readBaseline(p) {
  try { return JSON.parse(readFileSync(p, "utf8")).copies ?? {}; } catch { return {}; }
}

function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "one-source-input-"));
  const put = (rel, body) => { const p = join(dir, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, body); };
  try {
    // COPIES: each must be detected
    put("features/foo/Tiles.tsx", `export const A = () => (<div><b>Upload</b><b>Paste</b><b>Website</b><b>YouTube</b></div>);`);
    put("features/foo/MySourceInput.tsx", `export const B = () => <input type="file" />;`);
    put("features/foo/SourceCapture.tsx", `export const B = () => <b>Upload</b>;`);
    put("features/foo/TextSourcePicker.tsx", `export const B = () => <ProTextarea value="" />;`);
    put("features/foo/constants.ts", `export const SOURCE_OPTIONS = [\n  { kind: "text", label: "Rough notes" },\n  { kind: "web", label: "Website" },\n];\n`);
    put("features/foo/tiles.ts", `export const A = [{ label: "Upload" }, { label: "Paste" }, { label: "Website" }];`);
    // REVIEWER ESCAPE 1 (2026-10-22): a hand-rolled file input + textarea + Upload / Paste buttons, no source-input name
    put("features/foo/AddMaterial.tsx", `export const D = () => (<div><input type="file" /><textarea placeholder="Paste your source text" /><button>Upload</button><button>Paste</button><p>Add a source or material</p></div>);`);
    // REVIEWER ESCAPE 2 (2026-10-22): the browser-side resolver panel with a bare resolveKind, no door label anywhere
    put("features/foo/Resolve.tsx", `import { SourceResolverPanel } from "@/features/podcasts/generator/components/SourceResolverPanel";\nexport const E = () => <SourceResolverPanel resolveKind="website" onResolved={() => {}} />;`);
    put("features/foo/useIt.ts", `import { useSourceResolvers } from "@/features/podcasts/generator/useSourceResolvers";\nexport const useIt = () => useSourceResolvers();`);
    // a second payload shape: raw text posted as input_data / a { text } source object in education + podcast generation
    put("features/education/foo/gen.ts", `export const g = (text: string) => fetch("/x", { body: JSON.stringify({ input_data: text, input_data_type: "full_content" }) });`);
    put("features/podcasts/foo/gen2.ts", `export const g = (t: string) => run({ source: { text: t }, title: "x" });`);
    // NOT COPIES: each must be ignored
    // the legacy home that DEFINES the resolver (its callers are flagged, not the definition)
    put("features/podcasts/generator/useSourceResolvers.ts", `export function useSourceResolvers() { return {}; }`);
    // an image cropper with a file input and a URL box is not material intake; a lone file input is not a door row
    put("features/image-studio/Cropper.tsx", `export const I = () => (<div><input type="file" /><input placeholder="Paste image url" /><p>source image, source crop</p></div>);`);
    put("features/foo/JustAFile.tsx", `export const J = () => <input type="file" />;`);
    // input_data outside education / podcasts is some other API
    put("features/foo/other.ts", `export const o = { input_data: 1 };`);
    put("features/resource-manager/source-input/Ok.tsx", `<b>Upload</b><b>Paste</b><b>Website</b><b>YouTube</b>`);
    put("features/foo/Fine.tsx", `export const C = () => <b>Upload</b>;`);
    // a field form that carries the name but offers no way to add material (data-source link/search fields)
    put("features/foo/SourceInputFields.tsx", `export const F = () => <ProInput value="" />;`);
    // a record picker that carries the name (database tables / built-in sources)
    put("features/foo/SourcePicker.tsx", `export const P = () => <SearchField value="" />;`);
    // a filter list that is named *_SOURCE_OPTIONS but is not a list of ways in
    put("features/foo/CrawlTable.tsx", `const DISCOVERY_SOURCE_OPTIONS = [\n  { value: "seed", label: "Seed" },\n  { value: "link", label: "Link" },\n  { value: "sitemap", label: "Sitemap" },\n];\n`);
    // kind -> display label maps and marketing prose are not tile rows
    put("features/foo/labels.ts", `export const L = { upload: "Upload", web_page: "Web page", youtube: "YouTube", paste: "Paste" };`);
    put("features/foo/copy.ts", `export const T = ["Upload a PDF, paste notes, or pick a reading.", "Paste a link or a YouTube URL", "Website, Upload, YouTube"];`);
    const hits = scan(dir);
    const keys = Object.keys(hits).sort();
    const expect = [
      "features/education/foo/gen.ts", "features/foo/AddMaterial.tsx", "features/foo/MySourceInput.tsx",
      "features/foo/Resolve.tsx", "features/foo/SourceCapture.tsx", "features/foo/TextSourcePicker.tsx",
      "features/foo/Tiles.tsx", "features/foo/constants.ts", "features/foo/tiles.ts", "features/foo/useIt.ts",
      "features/podcasts/foo/gen2.ts",
    ];
    if (JSON.stringify(keys) !== JSON.stringify(expect)) { console.error("self-test FAILED: detection", keys); process.exit(1); }
    const { grown } = compare(hits, { "features/foo/Tiles.tsx": ["hand-rolled-door-row"] });
    if (grown.length !== 10) { console.error("self-test FAILED: baseline compare", grown); process.exit(1); }
    if (compare(hits, Object.fromEntries(Object.entries(hits))).grown.length) { console.error("self-test FAILED: full baseline should pass"); process.exit(1); }
    console.log("check-one-source-input self-test: ok (detects 11 copy shapes incl. both reviewer escapes (hand-rolled file+textarea+buttons, bare SourceResolverPanel) and the input_data / raw-source payloads; ignores the canonical folder, field forms, record pickers, filter lists, label maps and prose; baseline gates growth)");
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function main() {
  const a = process.argv.slice(2);
  if (a.includes("--self-test")) return selfTest();
  const arg = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const root = resolve(arg("--root", DEFAULT_ROOT));
  const basePath = resolve(arg("--baseline", BASELINE));
  const hits = scan(root);
  if (a.includes("--write-baseline")) {
    const sorted = Object.fromEntries(Object.keys(hits).sort().map((k) => [k, hits[k]]));
    writeFileSync(basePath, JSON.stringify({ note: "Shrink-only census of local source-input copies. Delete entries as screens move onto features/resource-manager/source-input. Never add.", copies: sorted }, null, 2) + "\n");
    console.log(`wrote ${Object.keys(sorted).length} entries to ${relative(process.cwd(), basePath)}`);
    return;
  }
  const { grown, stale } = compare(hits, readBaseline(basePath));
  for (const s of stale) console.log(`shrunk: ${s} no longer a local copy; delete it from scripts/one-source-input-baseline.json`);
  if (grown.length) {
    for (const g of grown) console.error(`${g}\n   renders its own source input. Use <SourceInput> from features/resource-manager/source-input (add options to the canonical tiles, never a local list).`);
    console.error(`\n${grown.length} new local source-input copy(ies). The census may only shrink.`);
    process.exit(1);
  }
  console.log(`check-one-source-input: clean (${Object.keys(hits).length} grandfathered, ${stale.length} shrunk)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
