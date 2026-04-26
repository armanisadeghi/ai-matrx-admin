#!/usr/bin/env node
/**
 * One-off: rewrite `from "@/components/ui"` to direct module paths.
 * Run from repo root: node scripts/migrate-ui-barrel.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function listTsFiles(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const name = e.name;
    if (
      name === "node_modules" ||
      name === ".git" ||
      name === ".claude" ||
      name === ".next"
    ) {
      continue;
    }
    const p = path.join(dir, name);
    if (e.isDirectory()) listTsFiles(p, acc);
    else if (/\.(tsx?)$/.test(name)) acc.push(p);
  }
  return acc;
}

/** @param {string} indexFile absolute path */
function parseExports(indexFile, symbolToModule) {
  const txt = fs.readFileSync(indexFile, "utf8");
  const indexDir = path.dirname(indexFile);

  for (const m of txt.matchAll(
    /export\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g,
  )) {
    const fromRaw = m[2];
    const mod =
      fromRaw.startsWith("@/") ?
        fromRaw
      : `@/components/ui/${fromRaw.replace(/^\.\//, "")}`;
    for (const seg of m[1].split(",")) {
      const s = seg.trim();
      if (!s) continue;
      const mm = s.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
      if (!mm) {
        console.warn("skip segment", s, "in", indexFile);
        continue;
      }
      const orig = mm[1];
      const asName = mm[2];
      if (asName) symbolToModule.set(asName, mod);
      else symbolToModule.set(orig, mod);
    }
  }

  for (const m of txt.matchAll(/export\s*\*\s*from\s*["']([^"']+)["']/g)) {
    const sub = m[1].replace(/^\.\//, "");
    const candidates = [
      path.join(indexDir, sub, "index.ts"),
      path.join(indexDir, sub + ".ts"),
      path.join(indexDir, sub + ".tsx"),
    ];
    const subFile = candidates.find((p) => fs.existsSync(p));
    if (!subFile) {
      console.warn("missing sub barrel", sub, "from", indexFile);
      continue;
    }
    parseExports(subFile, symbolToModule);
  }
}

/**
 * @param {string} spec single import specifier e.g. "type Foo", "Foo as Bar"
 */
function parseSpec(spec) {
  let s = spec.trim();
  let isType = false;
  if (s.startsWith("type ")) {
    isType = true;
    s = s.slice(5).trim();
  }
  let imported;
  let local;
  if (s.includes(" as ")) {
    const i = s.indexOf(" as ");
    imported = s.slice(0, i).trim();
    local = s.slice(i + 4).trim();
  } else {
    imported = local = s;
  }
  return { isType, imported, local };
}

/**
 * @param {Map<string, string>} symbolToModule
 */
function migrateImportBlock(inner, symbolToModule) {
  function resolveUiModule(symbol) {
    const mod = symbolToModule.get(symbol);
    if (!mod) {
      throw new Error(`Unknown barrel symbol: ${symbol}`);
    }
    return mod;
  }

  const specs = [];
  let depth = 0;
  let cur = "";
  for (const ch of inner) {
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === "," && depth === 0) {
      if (cur.trim()) specs.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) specs.push(cur.trim());

  /** @type {Map<string, { typeOnly: boolean, parts: string[] }>} */
  const byModule = new Map();
  for (const raw of specs) {
    const { isType, imported, local } = parseSpec(raw);
    const mod = resolveUiModule(imported);
    let entry = byModule.get(mod);
    if (!entry) {
      entry = { typeOnly: true, parts: [] };
      byModule.set(mod, entry);
    }
    if (!isType) entry.typeOnly = false;
    if (imported === local) {
      entry.parts.push(isType ? `type ${imported}` : imported);
    } else {
      entry.parts.push(
        isType ? `type ${imported} as ${local}` : `${imported} as ${local}`,
      );
    }
  }

  const lines = [];
  const sortedMods = [...byModule.keys()].sort();
  for (const mod of sortedMods) {
    const { parts, typeOnly } = byModule.get(mod);
    let stmt;
    if (typeOnly) {
      stmt = `import type { ${parts.map((p) => p.replace(/^type /, "")).join(", ")} } from "${mod}";`;
    } else {
      stmt = `import { ${parts.join(", ")} } from "${mod}";`;
    }
    lines.push(stmt);
  }
  return lines.join("\n");
}

const symbolToModule = new Map();
parseExports(path.join(ROOT, "components/ui/react-live-scope.ts"), symbolToModule);

const allSources = listTsFiles(ROOT);
const files = allSources.filter((f) => {
  const c = fs.readFileSync(f, "utf8");
  return /from\s*["']@\/components\/ui["']/.test(c);
});

const skip = (f) =>
  f.includes(`${path.sep}node_modules${path.sep}`) ||
  f.includes(`${path.sep}.claude${path.sep}`) ||
  f.endsWith(`${path.sep}components${path.sep}ui${path.sep}index.ts`);

/**
 * Replace `import { ... } from "@/components/ui"` using balanced `{` `}` from
 * each `from` site (avoids matching across separate import statements).
 */
function replaceBarrelImports(content, symbolToModule, debugLabel = "") {
  let out = "";
  let cursor = 0;
  const fromRe = /\bfrom\s*(["'])@\/components\/ui\1\s*;?/;

  while (cursor < content.length) {
    const rel = content.slice(cursor);
    const m = fromRe.exec(rel);
    if (!m) {
      out += content.slice(cursor);
      break;
    }
    const matchStart = cursor + m.index;
    const matchEnd = cursor + m.index + m[0].length;

    let i = matchStart - 1;
    while (i >= cursor && /\s/.test(content[i])) i--;
    if (content[i] !== "}") {
      out += content.slice(cursor, matchEnd);
      cursor = matchEnd;
      continue;
    }
    const closeIdx = i;
    let depth = 1;
    i = closeIdx - 1;
    while (i >= cursor && depth > 0) {
      const c = content[i];
      if (c === "}") depth++;
      else if (c === "{") depth--;
      i--;
    }
    if (depth !== 0) {
      out += content.slice(cursor, matchEnd);
      cursor = matchEnd;
      continue;
    }
    const openIdx = i + 1;
    const importStart = content.lastIndexOf("import", openIdx);
    if (importStart < 0 || importStart < cursor) {
      out += content.slice(cursor, matchEnd);
      cursor = matchEnd;
      continue;
    }
    const header = content.slice(importStart, openIdx + 1);
    if (!/^import\s*(?:type\s+)?\s*\{/s.test(header)) {
      out += content.slice(cursor, matchEnd);
      cursor = matchEnd;
      continue;
    }
    const inner = content.slice(openIdx + 1, closeIdx);
    try {
      const replacement = migrateImportBlock(inner, symbolToModule);
      out += content.slice(cursor, importStart) + replacement;
      cursor = matchEnd;
    } catch (e) {
      if (debugLabel) console.warn(debugLabel, e.message);
      out += content.slice(cursor, matchEnd);
      cursor = matchEnd;
    }
  }
  return out;
}

let changed = 0;
for (const filePath of files) {
  if (skip(filePath)) continue;
  const rel = path.relative(ROOT, filePath);
  let content = fs.readFileSync(filePath, "utf8");
  const orig = content;

  if (
    /import\s*\*\s*as\s+\w+\s*from\s*["']@\/components\/ui["']/.test(content)
  ) {
    console.log("skip namespace import:", rel);
    continue;
  }

  content = replaceBarrelImports(content, symbolToModule, rel);

  if (content !== orig) {
    fs.writeFileSync(filePath, content);
    changed++;
    console.log("updated", rel);
  }
}

console.log("files changed:", changed);
