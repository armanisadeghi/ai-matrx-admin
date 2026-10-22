#!/usr/bin/env node
/**
 * check:crumb-doors — EVERY CRUMB IS A DOOR; "…" HOLDS EVERY ACTION OF ITS LEVEL (Arman, 2026-10-22).
 *
 * The header trail is `[product icon ▾] › Level ▾ › Record ▾ ★ …`. Every crumb above the page is a
 * real link, every level opens a door to everything else at its level, and "…" carries every action
 * the page offers at that level. Law + contract: features/shell/FEATURE.md § Every crumb is a door.
 * The DERIVED trail is proven for every manifest route by
 * features/shell/breadcrumbs/__tests__/every-crumb-is-a-door.test.ts; this guard watches what a
 * page DECLARES. Four items (best-effort static reads — the limits are listed below):
 *
 *   no-declared-trail|<page>         a (core) page whose page file, its layouts and the files they
 *                                    import (three hops) use no page-top template and declare no trail
 *                                    (RecordPageHeader, EntityModeHeader, CrumbTrailHeader,
 *                                    DerivedBreadcrumb, EntityListPage, useDeclareFrameCrumbs …). In
 *                                    the frame it still gets the address-derived trail, but its record
 *                                    names, sibling doors and actions are nobody's.
 *   dead-crumb|<file>                a `trail={[…]}` / `parents={[…]}` level above the page with no
 *                                    `href` — text that goes nowhere ("I don't want fake things!!").
 *   record-without-siblings|<file>   a record header (RecordPageHeader `record={{…}}`, EntityModeHeader
 *                                    `entityRecord=`) with no sibling door (`siblings`, `entityOptions`).
 *   button-outside-actions|<file>    a header control passed through `right=` / `rightEnd=` or a
 *                                    PageHeaderRightPortal with an onClick — a button whose action is
 *                                    not in the declared `actions` list, so "…" cannot carry it.
 *
 * NOT A PAGE: a page file whose body is only a server redirect (`redirect(` / `permanentRedirect(` and
 * no JSX at all) has no UI and so no header — it is skipped, never exempted (`isRedirectOnly`).
 *
 * EXEMPT only by Arman's word, in the file: `// crumb-doors-exempt: Arman <date> <quote>`.
 *
 * LIMITS (static, best-effort): imports are followed three hops; a template counts only where it is
 * RENDERED or CALLED (a name in a comment or a type is not a use) and only through `@/`, `./`, `../`
 * specifiers; a template rendered deeper, or through a registry or dynamic import, reads as
 * "no-declared-trail". Trail literals built in a variable (`const trail = …`) are not read;
 * `right=` content that is a status (no action) is still flagged — move it to `entityStatus`.
 *
 * BASELINE (scripts/crumb-doors/baseline.json) ONLY SHRINKS — the census of routes still to convert.
 * Loud, never blocking: `--strict` exits 1 on a NEW item.
 *
 *   node scripts/crumb-doors/check-crumb-doors.mjs [paths…] [--strict] [--shrink]
 *   node scripts/crumb-doors/check-crumb-doors.mjs --self-test
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { emitItem, endItems } from "../checks/items.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TAG = "[crumb-doors]";
const BASELINE = "scripts/crumb-doors/baseline.json";
const EXEMPT = /\/\/\s*crumb-doors-exempt:\s*Arman\s+\d{4}-\d{2}-\d{2}\s+\S/;

export const RULES = {
  "no-declared-trail": {
    title: "page declares no trail",
    fix: "Render a page-top template (RecordPageHeader for a record, EntityListPage for a list, CrumbTrailHeader/DerivedBreadcrumb otherwise) so the page names its levels, their doors and its actions.",
  },
  "dead-crumb": {
    title: "crumb above the page with no address",
    fix: "Give the level its `href` (the page it stands for); a level with no page of its own is left out — never text that goes nowhere.",
  },
  "record-without-siblings": {
    title: "record crumb with no sibling door",
    fix: "Pass the record's siblings (RecordPageHeader `record.siblings`, EntityModeHeader `entityOptions`) from the list's own data source, capped, so the record crumb opens every other record.",
  },
  "button-outside-actions": {
    title: "header button outside the declared actions",
    fix: "Declare the button in the template's `actions` (one list: the line draws it, \"…\" carries it); a status goes to `entityStatus`.",
  },
};

export function remedyForKey(key) {
  return RULES[String(key).split("|")[0]]?.fix ?? null;
}

const TEMPLATE_LIST =
  "RecordPageHeader|EntityModeHeader|CrumbTrailHeader|DerivedBreadcrumb|EntityListPage|RouteTreeBreadcrumbHeader|useDeclareFrameCrumbs|ModuleLanding";
/**
 * A template is USED — rendered (`<RecordPageHeader`) or called (`useDeclareFrameCrumbs(`) — never
 * merely named: a comment ("the EntityListPage shell's TRow") or a type (`type EntityListPage`) in a
 * file three hops away used to clear a page that declares nothing (hop-depth 3 review, 2026-10-22).
 */
const TEMPLATE_USE = new RegExp(`<(${TEMPLATE_LIST})[\\s/><]|\\b(${TEMPLATE_LIST})\\(`);
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const usesTemplate = (text) => TEMPLATE_USE.test(stripComments(text));
const OUT_OF_SCOPE = /(^|\/)node_modules\/|\.(test|spec)\.tsx?$|\/__tests__\/|^app\/\((dev|lab|public|popup)\)\/|\/demos?\/|^scripts\//;
const PAGE_FILE = /^app\/\(core\)\/(.+\/)?page\.tsx$/;

/** The text of `name={[ … ]}` starting at `from`, bracket-matched (strings skipped). */
function arrayLiteralAt(text, from) {
  const open = text.indexOf("[", from);
  let depth = 0;
  let quote = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "[" || c === "{" || c === "(") depth++;
    else if (c === "]" || c === "}" || c === ")") {
      depth--;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return "";
}

/** Top-level `{…}` objects of an array literal's body. */
function topLevelObjects(body) {
  const out = [];
  let depth = 0;
  let start = -1;
  let quote = null;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{" || c === "[" || c === "(") {
      if (depth === 0 && c === "{") start = i;
      depth++;
    } else if (c === "}" || c === "]" || c === ")") {
      depth--;
      if (depth === 0 && c === "}" && start >= 0) {
        out.push(body.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return out;
}

let tokens = null;
/** Entity types with a sibling loader (features/shell/breadcrumbs/record-siblings.ts RECORD_SIBLINGS). */
function siblingTokens() {
  if (tokens) return tokens;
  const file = join(ROOT, "features/shell/breadcrumbs/record-siblings.ts");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  const body = /RECORD_SIBLINGS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(text)?.[1] ?? "";
  tokens = new Set([...body.matchAll(/^\s{2}["']?([\w-]+)["']?:\s*async/gm)].map((m) => m[1]));
  return tokens;
}

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/** The JSX opening tag of `<Name` at `index` (up to its closing `>` at depth 0). */
function tagAt(text, index) {
  let depth = 0;
  let quote = null;
  for (let i = index + 1; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{" || c === "(" || c === "[") depth++;
    else if (c === "}" || c === ")" || c === "]") depth--;
    else if (c === ">" && depth === 0) return text.slice(index, i + 1);
  }
  return text.slice(index);
}

/** Per-file rules (dead-crumb, record-without-siblings, button-outside-actions): [{ rule, line, what }]. */
export function scanSource(file, text) {
  if (OUT_OF_SCOPE.test(file) || EXEMPT.test(text)) return [];
  if (/^features\/shell\/components\/header\//.test(file) || /^features\/shell\/(frame|frame-host|breadcrumbs)\//.test(file)) return [];
  const sites = [];
  for (const m of text.matchAll(/\b(trail|parents)=\{\s*\[/g)) {
    const objects = topLevelObjects(arrayLiteralAt(text, m.index));
    // A `parents` list is every level ABOVE the record; a `trail` ends on the page itself.
    const above = m[1] === "parents" ? objects : objects.slice(0, -1);
    for (const o of above) {
      if (!/\bhref\s*:/.test(o) && !/\.\.\./.test(o)) {
        const label = /label\s*:\s*([^,}]+)/.exec(o)?.[1]?.trim() ?? o.slice(0, 40);
        sites.push({ rule: "dead-crumb", line: lineOf(text, m.index), what: `level ${label} has no href` });
      }
    }
  }
  for (const m of text.matchAll(/<(RecordPageHeader|EntityModeHeader)\b/g)) {
    const tag = tagAt(text, m.index);
    const isRecord = m[1] === "RecordPageHeader" ? /\brecord=\{\{/.test(tag) : /\bentityRecord=/.test(tag);
    // A record whose type has a sibling loader (record-siblings.ts) gets its door from the derived trail.
    const token = /\btoken\s*:\s*["'`]([\w-]+)["'`]/.exec(tag)?.[1];
    const registered = token != null && siblingTokens().has(token);
    if (isRecord && !registered && !/\bsiblings\s*[:=]|\bentityOptions=/.test(tag)) {
      sites.push({ rule: "record-without-siblings", line: lineOf(text, m.index), what: `<${m[1]}> record without siblings` });
    }
    for (const p of tag.matchAll(/\b(right|rightEnd)=\{/g)) {
      sites.push({ rule: "button-outside-actions", line: lineOf(text, m.index + p.index), what: `<${m[1]} ${p[1]}=…>` });
    }
  }
  for (const m of text.matchAll(/<PageHeaderRightPortal\b[\s\S]*?<\/PageHeaderRightPortal>/g)) {
    if (/onClick=|onPress=/.test(m[0])) sites.push({ rule: "button-outside-actions", line: lineOf(text, m.index), what: "PageHeaderRightPortal button" });
  }
  return sites;
}

function resolveImport(root, fromFile, spec) {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith("./") || spec.startsWith("../")) base = posix.normalize(posix.join(posix.dirname(fromFile), spec));
  else return null;
  for (const ext of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    const candidate = `${base}${ext}`;
    if (/\.(tsx|ts)$/.test(candidate) && existsSync(join(root, candidate))) return candidate;
  }
  return null;
}

const readCache = new Map();
function read(root, file) {
  const key = `${root}|${file}`;
  if (!readCache.has(key)) readCache.set(key, existsSync(join(root, file)) ? readFileSync(join(root, file), "utf8") : "");
  return readCache.get(key);
}

/** Does this file, or anything it imports within `hops`, use a page-top template? */
function reachesTemplate(root, file, hops, seen = new Set()) {
  if (seen.has(file)) return false;
  seen.add(file);
  const text = read(root, file);
  if (usesTemplate(text) || EXEMPT.test(text)) return true;
  if (hops === 0) return false;
  for (const m of text.matchAll(/from\s+["']([^"']+)["']/g)) {
    const target = resolveImport(root, file, m[1]);
    if (target && !/^(components\/ui|lib|utils|hooks|types)\//.test(target) && reachesTemplate(root, target, hops - 1, seen)) return true;
  }
  return false;
}

/** Import hops followed from a page and its layouts (owner decision 2026-10-22: 3 — HR shells sit three deep). */
const HOPS = 3;
const JSX = /<>|(?:^|[^\w$.])<[A-Za-z][\w.:-]*(?=[\s/>])/m;
/** A page whose body is only a server redirect renders nothing: no header to declare. */
export function isRedirectOnly(text) {
  const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return /\b(redirect|permanentRedirect)\(/.test(code) && !JSX.test(code);
}

/** no-declared-trail: the page, or any layout above it, reaches a template within HOPS hops. */
export function pageDeclaresTrail(root, pageFile) {
  const dirs = posix.dirname(pageFile).split("/");
  const files = [pageFile];
  for (let i = dirs.length; i >= 2; i--) {
    const layout = `${dirs.slice(0, i).join("/")}/layout.tsx`;
    if (existsSync(join(root, layout))) files.push(layout);
  }
  return files.some((f) => reachesTemplate(root, f, HOPS));
}

function listFiles(root) {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.tsx"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\n")
    .filter((f) => f && !OUT_OF_SCOPE.test(f));
}

export function collect({ root = ROOT, paths = null } = {}) {
  let files = listFiles(root);
  if (paths) files = files.filter((f) => paths.some((p) => f === p || f.startsWith(`${p}/`)));
  const byKey = new Map();
  const add = (rule, file, site) => {
    const key = `${rule}|${file}`;
    if (!byKey.has(key)) byKey.set(key, { key, rule, file, sites: [] });
    byKey.get(key).sites.push(site);
  };
  for (const file of files) {
    const text = read(root, file);
    for (const site of scanSource(file, text)) add(site.rule, file, site);
    if (PAGE_FILE.test(file) && !EXEMPT.test(text) && !isRedirectOnly(text) && !pageDeclaresTrail(root, file)) {
      add("no-declared-trail", file, { rule: "no-declared-trail", line: 1, what: "no page-top template within three hops" });
    }
  }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function readBaseline(root) {
  const abs = join(root, BASELINE);
  if (!existsSync(abs)) return [];
  return JSON.parse(readFileSync(abs, "utf8")).keys ?? [];
}

function writeBaseline(root, keys) {
  writeFileSync(
    join(root, BASELINE),
    `${JSON.stringify({ note: "Shrink-only census of routes not yet on the crumb-door contract. Remove a key by fixing it; never add one (scripts/crumb-doors/check-crumb-doors.mjs).", keys }, null, 2)}\n`,
  );
}

export function main(argv = process.argv.slice(2), env = process.env, root = ROOT) {
  if (argv.includes("--self-test")) return selfTest();
  const raw = argv.filter((a) => !a.startsWith("--"));
  const paths = raw.length ? raw.map((p) => relative(root, isAbsolute(p) ? p : resolve(process.cwd(), p)).split("\\").join("/").replace(/\/+$/, "")) : null;
  const found = collect({ root, paths });
  const baseline = new Set(readBaseline(root));
  if (!paths && argv.includes("--write-census")) {
    // One-time: the census the baseline starts from (2026-10-22). Never used to ADD later.
    writeBaseline(root, found.map((f) => f.key));
    console.log(`${TAG} census written: ${found.length} key(s)`);
    return 0;
  }
  let fresh = 0;
  for (const f of found) {
    const known = baseline.has(f.key);
    if (!known) fresh += 1;
    emitItem({
      key: f.key,
      status: known ? "known" : "new",
      ...(known ? { basis: "debt" } : {}),
      title: `${f.sites.length} × ${RULES[f.rule].title}`,
      file: f.file,
      line: f.sites[0].line,
      rule: f.rule,
    });
  }
  if (!paths) endItems();
  for (const f of found) {
    if (baseline.has(f.key)) continue;
    for (const s of f.sites.slice(0, 3)) console.log(`  NEW ${f.file}:${s.line}  ${RULES[f.rule].title}: ${s.what}\n      fix: ${RULES[f.rule].fix}`);
  }
  if (!paths && argv.includes("--shrink")) {
    const live = new Set(found.map((f) => f.key));
    const kept = [...baseline].filter((k) => live.has(k)).sort();
    writeBaseline(root, kept);
    console.log(`${TAG} baseline shrunk ${baseline.size} → ${kept.length}`);
  }
  const byRule = (r) => found.filter((f) => f.rule === r).length;
  console.log(
    `${TAG} ${found.length} item(s) (${Object.keys(RULES).map((r) => `${r} ${byRule(r)}`).join(", ")}), ${fresh} new${paths ? " (narrowed scan)" : ""}`,
  );
  return argv.includes("--strict") && fresh ? 1 : 0;
}

/** Proves each rule fires on its planted shape (RED) and stays quiet on the contract (GREEN). */
function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "crumb-doors-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    const plant = {
      // RED: a page with no template at all.
      "app/(core)/forms/bare/page.tsx": "export default function P() { return <div>Forms</div>; }\n",
      // RED: a dead crumb, a record with no siblings, a button outside the actions.
      "app/(core)/forms/[id]/page.tsx":
        'import { FormRecord } from "@/features/forms/FormRecord";\nexport default function P() { return <FormRecord />; }\n',
      "features/forms/FormRecord.tsx":
        'import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";\nimport { CrumbTrailHeader } from "@/features/shell/components/header/templates/CrumbTrailHeader";\nexport function FormRecord() { return (<><CrumbTrailHeader trail={[{ label: "Forms" }, { label: "Intake" }]} />\n<RecordPageHeader record={{ name: "Intake" }} rightEnd={<button onClick={() => {}}>Share</button>} /></>); }\n',
      // GREEN: the contract — links on every level, siblings, one action list.
      "app/(core)/notes/[id]/page.tsx":
        'import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";\nexport default function P() { return <RecordPageHeader parents={[{ label: "Notes", href: "/notes" }]} record={{ name: "A", siblings: [] }} actions={[]} />; }\n',
      // GREEN: a redirect-only page renders nothing — no header to declare.
      "app/(core)/forms/old/page.tsx":
        'import { redirect } from "next/navigation";\nexport default async function P({ params }: { params: Promise<{ id: string }> }) { redirect(`/forms/${(await params).id}`); }\n',
      // RED: a redirect guard in front of a real body is still a page.
      "app/(core)/forms/guarded/page.tsx":
        'import { redirect } from "next/navigation";\nexport default function P() { if (Math.random()) redirect("/login");\n  return (\n    <>\n      <div>Forms</div>\n    </>\n  ); }\n',
      // GREEN: a template three hops down (page → shell → sub-shell → the shell that renders it).
      "app/(core)/hr/people/page.tsx": 'import { People } from "@/features/hr/People";\nexport default function P() { return <People />; }\n',
      "features/hr/People.tsx": 'import { SubShell } from "./SubShell";\nexport function People() { return <SubShell />; }\n',
      "features/hr/SubShell.tsx": 'import { Shell } from "./Shell";\nexport function SubShell() { return <Shell />; }\n',
      "features/hr/Shell.tsx": 'import { useDeclareFrameCrumbs } from "@/features/shell/frame-host/framePageHeader";\nexport function Shell() { useDeclareFrameCrumbs([]); return null; }\n',
      // GREEN: a generic list shell (`<EntityListPage<Row>`).
      "app/(core)/rows/page.tsx": 'import { EntityListPage } from "@/lib/entity-list/components/EntityListPage";\nexport default function P() { return <EntityListPage<{ id: string }> config={{}} />; }\n',
      // RED: a template only NAMED (comment, type) in an imported file is not a header.
      "app/(core)/labels/page.tsx": 'import { Labels } from "@/features/labels/Labels";\nexport default function P() { return <Labels />; }\n',
      "features/labels/Labels.tsx": '// The EntityListPage shell\'s TRow lives in types.\nimport type { EntityListPage } from "./types";\nexport function Labels() { return <div />; }\n',
      // GREEN: exempt by Arman's word.
      "app/(core)/kiosk-like/page.tsx": '// crumb-doors-exempt: Arman 2026-10-22 "no header on this one"\nexport default function P() { return <div />; }\n',
    };
    for (const [name, text] of Object.entries(plant)) {
      execFileSync("mkdir", ["-p", dirname(join(dir, name))]);
      writeFileSync(join(dir, name), text);
    }
    const keys = collect({ root: dir }).map((f) => f.key);
    const want = [
      "button-outside-actions|features/forms/FormRecord.tsx",
      "dead-crumb|features/forms/FormRecord.tsx",
      "no-declared-trail|app/(core)/forms/bare/page.tsx",
      "no-declared-trail|app/(core)/forms/guarded/page.tsx",
      "no-declared-trail|app/(core)/labels/page.tsx",
      "record-without-siblings|features/forms/FormRecord.tsx",
    ];
    const ok = JSON.stringify(keys) === JSON.stringify(want);
    console.log(`${TAG} self-test ${ok ? "PASS" : "FAIL"}: ${JSON.stringify(keys)}`);
    return ok ? 0 : 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
