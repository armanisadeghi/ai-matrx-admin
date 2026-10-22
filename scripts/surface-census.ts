/**
 * surface-census — the facts behind the surface campaign's one list.
 *
 * For every registered surface: its host
 * (route or overlay), how many values it declares, and — computed from source,
 * never self-reported — whether anything emits it: the manifest module's
 * `create…Scope` builder has at least one call site outside the manifest file.
 *
 * Why a script and not a hand-kept list: on 2026-09-25 the only lists were
 * self-declarations (78 manifests said "verified", 16 surfaces had ever been
 * certified), and a regex census read a header comment instead of the field.
 * This imports the registry and each manifest module, so it reads what the app
 * reads.
 *
 * EMITTING is detected two ways, and each row says which:
 *   - "builder": the manifest's `create…Scope` is called outside the manifest,
 *     in this repo OR inside the installed @ai-matrx/chat package (chat, the
 *     agent runner and other pages live there since 2026-10-07);
 *   - "name": a file that mounts a surface runtime (SurfaceRuntimeProvider,
 *     useSurfaceRuntimeRegistration, …) names the surface — by its literal
 *     name or a constant the manifest exports for it. Weaker evidence: confirm
 *     with `pnpm surface:probe` before trusting it.
 * Board columns also show write targets, the guide, and how many values carry
 * a context budget (`inlineUpTo`).
 *
 * Usage:
 *   pnpm surface:census                 # markdown table to stdout
 *   pnpm surface:census --json out.json # also write JSON
 *   pnpm surface:census --sql           # print a read-only SQL query that
 *                                       # returns every surface whose DB mirror
 *                                       # (ui.ui_surface / ui_surface_value)
 *                                       # disagrees with code — save it to a
 *                                       # file and run it against the live DB
 *                                       # (https://db.matrxserver.com) with
 *                                       # `pnpm admin-query --file <file>`.
 *   pnpm surface:census --only not-emitting   # filter rows
 */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { getAllManifests } from "@/features/surfaces/manifests/registry";
import { builderCallSites, builderSitesInFiles } from "./lib/surface-emitters";

// Bounded and visible: on 2026-10-22 this script ran 300 s and 590 s with no output (one
// full-tree git grep per scope builder, ~28 min). It now takes ONE git grep for all builders,
// every git call carries its own timeout and fails loudly (scripts/lib/surface-emitters.ts),
// and each stage prints to stderr so a slow run shows where it is. A whole-run timer would
// not help: tsx runs this as CommonJS, so every stage is synchronous and a timer cannot fire.
const started = Date.now();
function enter(next: string) {
  console.error(`[surface-census] ${next} (${Math.round((Date.now() - started) / 1000)} s)`);
}

// Inspect the same published modules the host registry consumes. Requiring a
// sibling package's TS source bypasses its exports and breaks after extraction.
const LOCAL_MANIFEST_DIR = "features/surfaces/manifests";
const PACKAGE_MANIFESTS = [...readFileSync(`${LOCAL_MANIFEST_DIR}/registry.ts`, "utf8")
  .matchAll(/from ["'](@ai-matrx\/chat\/surfaces\/manifests\/[^"']+)["']/g)]
  .flatMap((match) => match[1] ? [match[1]] : []);
// Same resolution path as the registry's own static imports (a dynamic import()
// by file URL takes the ESM path, which one package's exports map refuses).
const requireModule = createRequire(__filename);

type Row = {
  detectedBy: "builder" | "name" | "none";
  writeTargets: number;
  guide: boolean;
  budgetedValues: number;
  surface: string;
  label: string;
  host: string;
  values: number;
  scopeBuilders: string[];
  emitterFiles: string[];
  emitting: boolean;
};

const PACKAGE_DIST = "node_modules/@ai-matrx/chat/dist";
// resolveContextOnOpen: a v3 context menu that resolves per-target context at
// right-click time and launches with it (matrx-user/assistant-message emits only so).
const MOUNT_MARKER =
  /SurfaceRuntimeProvider|useSurfaceRuntimeRegistration|registerSurfaceRuntime|useSurfaceScopeContribution|BattleSurfaceRuntime|resolveContextOnOpen/;

/** Every JS file of the installed chat package, excluding its manifests. */
function packageFiles(): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  const walk = (dir: string) => {
    let entries: import("node:fs").Dirent[] = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!full.includes(`${path.sep}surfaces${path.sep}manifests`)) walk(full);
      } else if (e.name.endsWith(".js") && !e.name.endsWith(".map")) {
        out.push({ file: full, text: readFileSync(full, "utf8") });
      }
    }
  };
  walk(PACKAGE_DIST);
  return out;
}

/** Repo files (outside manifests and tests) that mount a surface runtime. */
function repoMountFiles(): { file: string; text: string }[] {
  let list: string[] = [];
  try {
    list = execFileSync(
      "git",
      ["grep", "-lE", MOUNT_MARKER.source, "--", "*.ts", "*.tsx", ":!features/surfaces/manifests/*"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024, timeout: 60_000 },
    )
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.includes(".test.") && !l.includes("__tests__"));
  } catch (error) {
    const e = error as { status?: number | null; signal?: string | null; message?: string };
    if (e.status !== 1 || e.signal) throw new Error(`surface-census: git grep for mount files failed: ${e.message}`);
    list = []; // git grep exits 1 when nothing matches
  }
  return list.map((file) => ({ file, text: readFileSync(file, "utf8") }));
}

async function main() {
  const args = process.argv.slice(2);
  const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : undefined;
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;
  enter("reading manifest modules");

  // Map each manifest module to its surface name(s), its scope builders and
  // the string constants it exports for the surface's name.
  const buildersBySurface = new Map<
    string,
    { file: string; builders: string[]; nameConsts: string[] }
  >();
  for (const rel of [
    ...readdirSync(LOCAL_MANIFEST_DIR)
      .filter((f) => f.endsWith(".manifest.ts"))
      .map((f) => path.join(LOCAL_MANIFEST_DIR, f)),
    ...new Set(PACKAGE_MANIFESTS),
  ]) {
    const mod = requireModule(rel.startsWith("@") ? rel : path.resolve(rel)) as Record<string, unknown>;
    const builders = Object.entries(mod)
      .filter(([k, v]) => typeof v === "function" && /^create[A-Za-z0-9]*Scope$/.test(k))
      .map(([k]) => k);
    // A builder shared by sibling surfaces lives in a `_<name>.manifest.ts`
    // the manifest imports (run console, assessment list): it is this
    // surface's builder too.
    if (!rel.startsWith("@")) {
      const text = readFileSync(rel, "utf8");
      for (const imp of text.matchAll(/from\s+["'](\.\/_[\w.-]+\.manifest)["']/g)) {
        const shared = requireModule(path.resolve(path.dirname(rel), `${imp[1]}.ts`)) as Record<string, unknown>;
        for (const [k, v] of Object.entries(shared)) {
          if (typeof v === "function" && /^create[A-Za-z0-9]*Scope$/.test(k) && !builders.includes(k)) builders.push(k);
        }
      }
    }
    for (const value of Object.values(mod)) {
      if (value && typeof value === "object" && typeof (value as { surfaceName?: unknown }).surfaceName === "string") {
        const name = (value as { surfaceName: string }).surfaceName;
        const nameConsts = Object.entries(mod)
          .filter(([, v]) => v === name)
          .map(([k]) => k);
        buildersBySurface.set(name, { file: rel, builders, nameConsts });
      }
    }
  }

  enter("reading the installed @ai-matrx/chat package");
  const pkg = packageFiles();
  enter("finding surface mount files");
  // Comments are not evidence: a provider whose comment names another surface
  // read as mounting it (basic-editor, canvas; review 2026-10-22).
  const stripComments = (text: string) =>
    text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
  const mounts = [...repoMountFiles(), ...pkg.filter((f) => MOUNT_MARKER.test(f.text))]
    .map((f) => ({ file: f.file, text: stripComments(f.text) }))
    .filter((f) => MOUNT_MARKER.test(f.text));
  const word = (w: string) => new RegExp(`\\b${w.replace(/[$]/g, "\\$")}\\b`);

  // Constants outside the manifests that hold a surface's name
  // (`IMAGE_STUDIO_SURFACE_NAME = "matrx-user/image-studio"`, or an object
  // const whose `surfaceName:` is it, like FILES_CONTEXT_MENU_PROPS): a mount
  // that passes the constant names the surface. Only SCREAMING_CASE or
  // …SurfaceName identifiers count, so a generic `props` never does.
  const nameConstsOutside = new Map<string, Set<string>>();
  {
    const allNames = getAllManifests().map((m) => m.surfaceName);
    const quotedAll = allNames.flatMap((n) => [`"${n}"`, `'${n}'`]);
    let hits: string[] = [];
    try {
      hits = execFileSync(
        "git",
        ["grep", "-n", "-F", ...quotedAll.flatMap((q) => ["-e", q]), "--", "*.ts", "*.tsx", ":!features/surfaces/manifests/*.manifest.ts", ":!features/surfaces/manifests/generated/*"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 },
      ).split("\n");
    } catch {
      hits = [];
    }
    const fileLines = new Map<string, string[]>();
    const CONST = /^\s*(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)/;
    const NAMEISH = /^[A-Z][A-Z0-9_]+$|SurfaceName$/;
    for (const hit of hits) {
      const m = /^(.+?):(\d+):(.*)$/.exec(hit);
      if (!m || m[1].includes(".test.") || m[1].includes("__tests__")) continue;
      const [, file, lineNo, text] = m;
      if (/^\s*(\/\/|\*|\/\*)/.test(text)) continue;
      const surface = allNames.find((n) => text.includes(`"${n}"`) || text.includes(`'${n}'`));
      if (!surface) continue;
      if (!fileLines.has(file)) fileLines.set(file, readFileSync(file, "utf8").split("\n"));
      const lines = fileLines.get(file)!;
      let ident: string | undefined;
      // Only a const that IS the name (declared on this line) or an object
      // whose `surfaceName:` is it — never a list of many surface names.
      const sameLine = CONST.exec(text);
      const isNameProp = /\bsurfaceName\s*:/.test(text);
      if (sameLine) ident = sameLine[1];
      for (let i = Number(lineNo) - 2; !ident && isNameProp && i >= Math.max(0, Number(lineNo) - 30); i -= 1) {
        const c = CONST.exec(lines[i] ?? "");
        if (c) {
          ident = c[1];
          break;
        }
      }
      if (ident && NAMEISH.test(ident)) {
        if (!nameConstsOutside.has(surface)) nameConstsOutside.set(surface, new Set());
        nameConstsOutside.get(surface)!.add(ident);
      }
    }
  }

  // `surfaceName=` / `surfaceName:` sites anywhere in the app code: a window
  // that hands its surface's name to a shared page component (CrmManagerWindow
  // → CrmListPage), or a launch that names it (image-studio).
  const surfaceNameProps: { file: string; text: string }[] = [];
  try {
    for (const hit of execFileSync(
      "git",
      ["grep", "-n", "-E", "surfaceName[[:space:]]*[=:]", "--", "*.ts", "*.tsx", ":!features/surfaces/manifests/*"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 },
    ).split("\n")) {
      const m = /^(.+?):\d+:(.*)$/.exec(hit);
      if (!m || m[1].includes(".test.") || m[1].includes("__tests__")) continue;
      if (/^\s*(\/\/|\*|\/\*)/.test(m[2])) continue;
      surfaceNameProps.push({ file: m[1], text: m[2] });
    }
  } catch {
    // git grep exits 1 when nothing matches
  }

  // ONE git grep and ONE package pass for every builder (scripts/lib/surface-emitters.ts).
  const allBuilders = [...new Set([...buildersBySurface.values()].flatMap((e) => e.builders))];
  enter(`finding call sites of ${allBuilders.length} scope builders`);
  const repoSites = builderCallSites(allBuilders, {
    pathspecs: [":!features/surfaces/manifests/*.manifest.ts", ":!packages/chat/src/surfaces/manifests/*.manifest.ts"],
  });
  const pkgSites = builderSitesInFiles(allBuilders, pkg);
  enter("building rows");

  const rows: Row[] = getAllManifests().map((m) => {
    const entry = buildersBySurface.get(m.surfaceName);
    const builderSites = entry
      ? [
          ...entry.builders.flatMap((b) => (repoSites.get(b) ?? []).filter((f) => f !== entry.file)),
          ...entry.builders.flatMap((b) => pkgSites.get(b) ?? []),
        ]
      : [];
    const quoted = [`"${m.surfaceName}"`, `'${m.surfaceName}'`, `\`${m.surfaceName}\``];
    const nameSites = mounts
      .filter(
        (f) =>
          quoted.some((q) => f.text.includes(q)) ||
          [...(entry?.nameConsts ?? []), ...(nameConstsOutside.get(m.surfaceName) ?? [])].some((c) =>
            word(c).test(f.text),
          ),
      )
      .map((f) => f.file);
    const consts = [...(entry?.nameConsts ?? []), ...(nameConstsOutside.get(m.surfaceName) ?? [])];
    for (const site of surfaceNameProps) {
      if (quoted.some((q) => site.text.includes(q)) || consts.some((c) => word(c).test(site.text)))
        nameSites.push(site.file);
    }
    const emitterFiles = [...new Set(builderSites.length ? builderSites : nameSites)];
    const detectedBy: Row["detectedBy"] = builderSites.length
      ? "builder"
      : nameSites.length
        ? "name"
        : "none";
    const resolved = m as typeof m & { guide?: string };
    return {
      detectedBy,
      writeTargets: (m.writeTargets ?? []).length,
      guide: Boolean(resolved.guide),
      budgetedValues: m.values.filter(
        (v) => typeof (v as { inlineUpTo?: unknown }).inlineUpTo === "number",
      ).length,
      surface: m.surfaceName,
      label: m.label,
      host: m.overlayId ? `overlay:${m.overlayId}` : (m.urlPattern ?? "(none)"),
      values: m.values.length,
      scopeBuilders: entry?.builders ?? [],
      emitterFiles,
      emitting: emitterFiles.length > 0,
    };
  });

  if (args.includes("--sql")) {
    const values = rows
      .map((r) => `('${r.surface.replace(/'/g, "''")}',${r.values})`)
      .join(",\n  ");
    console.log(`-- Surfaces whose DB mirror disagrees with code (read-only).
-- Run against https://db.matrxserver.com: save to a file, then pnpm admin-query --file <file>.
with code(name, n_values) as (values
  ${values}
)
select coalesce(c.name, s.name) as surface,
       c.n_values as code_values,
       (select count(*) from ui.ui_surface_value v where v.surface_name = coalesce(c.name, s.name) and v.deleted_at is null) as db_values,
       s.check_claimed_by, s.check_claimed_at,
       case when c.name is null then 'db row with no manifest'
            when s.name is null then 'never synced'
            else 'differs' end as problem
from code c full join ui.ui_surface s on s.name = c.name
where c.name is null or s.name is null
   or c.n_values <> (select count(*) from ui.ui_surface_value v where v.surface_name = c.name and v.deleted_at is null)
order by 1;`);
    return;
  }

  const filtered = rows.filter((r) =>
    only === "not-emitting" ? !r.emitting : true,
  );
  const totals = {
    surfaces: rows.length,
    emitting: rows.filter((r) => r.emitting).length,
    notEmitting: rows.filter((r) => !r.emitting).length,
  };

  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ totals, rows }, null, 2));
  console.log(
    `Surfaces: ${totals.surfaces} · emitting ${totals.emitting} · not emitting ${totals.notEmitting}`,
  );
  console.log(
    `Emitting detected by builder ${rows.filter((r) => r.detectedBy === "builder").length} · by name only ${rows.filter((r) => r.detectedBy === "name").length} (probe these)`,
  );
  console.log(
    "\n| surface | emitting | values | targets | guide | budgeted | host |\n|---|---|---|---|---|---|---|",
  );
  for (const r of filtered)
    console.log(
      `| ${r.surface} | ${r.emitting ? (r.detectedBy === "name" ? "by name" : "yes") : "NO"} | ${r.values} | ${r.writeTargets} | ${r.guide ? "yes" : "—"} | ${r.budgetedValues || "—"} | ${r.host} |`,
    );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
