/**
 * Config attestation — the SECOND-CHANCE resolver for the web manifest (lane CONFIG-ATTEST-ROLLOUT).
 *
 * `scanKnobReads` (scripts/settings-guards/lib.ts) names every read whose address is a literal, a
 * string constant or a `{ feature, key }` pair constant. What it cannot name it lists as unresolved.
 * This pass follows the indirection those reads hide behind, and NEVER guesses:
 *
 *   1. OBJECT KEY MAPS: `COMPOSER_KNOBS.defaultMode` where `const COMPOSER_KNOBS = { defaultMode:
 *      { feature: "x", key: "y" }, … }` (or `{ name: "feature.key" }`), in this file or exported from
 *      another scanned file — and the addresses a bundled @ai-matrx/* package exports in its knob
 *      declaration (see ./package-declarations.ts).
 *   2. LOCAL HELPERS: `const read = (key: string) => knobInt(FEATURE, key)` — the read's key (or
 *      feature) is a parameter, so every call `read("ttl")` in the file is a read. A call with a
 *      computed argument stays unresolved at THAT call; a helper nobody calls stays unresolved at
 *      its own read.
 *
 * A name defined with different values in two files is a collision: unresolved, never a guess.
 */
import { FULL_KEY_FNS, HELPER_MODULES, TS_KNOB_FNS, localStringConsts, lineOf, type DynamicRead, type ReadSite, type SourceFile } from "../settings-guards/lib";

export interface Address {
  feature: string;
  key: string;
}

/** Pooled `NAME.member` addresses and strings, plus the names that collide across files. */
export interface MemberPool {
  pairs: Map<string, Address>;
  strings: Map<string, string>;
  ambiguous: Set<string>;
}

const PAIR_INLINE = /^\{\s*feature\s*:\s*["']([\w.]+)["']\s*,\s*key\s*:\s*["']([\w.]+)["']\s*,?\s*\}$/;

/** The balanced `{…}` block starting at `open` (index of `{`); returns the index after its `}`. */
function blockEnd(text: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{" || c === "(" || c === "[") depth++;
    else if (c === "}" || c === ")" || c === "]") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return text.length;
}

/** `[export] const NAME = { member: {feature,key} | "string", … }` members of one file. */
export function objectMembers(text: string): { pairs: Map<string, Address>; strings: Map<string, string>; exported: Set<string> } {
  const pairs = new Map<string, Address>();
  const strings = new Map<string, string>();
  const exported = new Set<string>();
  const re = /^[ \t]*(export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*\{/gm;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const open = m.index + m[0].length - 1;
    const body = text.slice(open + 1, blockEnd(text, open) - 1);
    const name = m[2];
    const memberRe = /(?:^|[,{\s])([A-Za-z_$][\w$]*)\s*:\s*(\{[^{}]*\}|["'][^"'\n]+["'])/g;
    for (let mm = memberRe.exec(body); mm; mm = memberRe.exec(body)) {
      const pair = PAIR_INLINE.exec(mm[2].trim());
      const full = `${name}.${mm[1]}`;
      if (pair) pairs.set(full, { feature: pair[1], key: pair[2] });
      else if (!mm[2].startsWith("{")) strings.set(full, mm[2].slice(1, -1));
      if (m[1]) exported.add(full);
    }
  }
  return { pairs, strings, exported };
}

/** Exported object members pooled across files (and package addresses); collisions are ambiguous. */
export function poolMembers(files: SourceFile[], packageAddresses: Map<string, Address> = new Map()): MemberPool {
  const pool: MemberPool = { pairs: new Map(), strings: new Map(), ambiguous: new Set() };
  const putPair = (k: string, v: Address) => {
    const prior = pool.pairs.get(k);
    if (prior && (prior.feature !== v.feature || prior.key !== v.key)) pool.ambiguous.add(k);
    pool.pairs.set(k, v);
  };
  for (const f of files) {
    if (f.rel.endsWith(".py") || !/feature\s*:|knob/i.test(f.text)) continue;
    const o = objectMembers(f.text);
    for (const [k, v] of o.pairs) if (o.exported.has(k)) putPair(k, v);
    for (const [k, v] of o.strings) {
      if (!o.exported.has(k)) continue;
      const prior = pool.strings.get(k);
      if (prior !== undefined && prior !== v) pool.ambiguous.add(k);
      pool.strings.set(k, v);
    }
  }
  for (const [k, v] of packageAddresses) putPair(k, v);
  return pool;
}

/** Top-level comma split of a call's arguments, from just after its `(` to the matching `)`. */
export function callArgs(text: string, from: number): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  let quote: string | null = null;
  for (let i = from; i < text.length && i < from + 2000; i++) {
    const c = text[i];
    if (quote) {
      cur += c;
      if (c === "\\") cur += text[++i] ?? "";
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") {
      if (depth === 0) break;
      depth--;
    } else if (c === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const READER_RE = new RegExp(`(?<![.\\w$])(${FULL_KEY_FNS}|${TS_KNOB_FNS}|resolveSessionKnob)\\s*(?:<[^>()]*>)?\\(`, "g");
const KNOBX = new RegExp(`^(?:${TS_KNOB_FNS})$`);

/** A value in one file: a static string, a parameter of the enclosing helper, or unknown. */
type V = { s: string } | { param: string } | null;

interface Helper {
  name: string;
  params: string[];
  /** A parameter typed as a union of string literals (inline or a same-file `type X = "a" | "b"`). */
  unions: Map<string, string[]>;
  start: number;
  end: number;
}

/** Every `const name = (a, b) => …` / `function name(a, b) {…}` in the file, with its body span. */
function helpers(text: string): Helper[] {
  const out: Helper[] = [];
  const arrow = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^()]*)\)\s*(?::\s*[^=;{]+?)?\s*=>\s*/g;
  for (let m = arrow.exec(text); m; m = arrow.exec(text)) {
    const at = m.index + m[0].length;
    const end = text[at] === "{" ? blockEnd(text, at) : statementEnd(text, at);
    out.push({ name: m[1], params: paramNames(m[2]), unions: paramUnions(text, m[2]), start: at, end });
  }
  const fn = /(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*(?:<[^>()]*>)?\(([^()]*)\)\s*(?::\s*[^{;]+?)?\s*\{/g;
  for (let m = fn.exec(text); m; m = fn.exec(text)) {
    const at = m.index + m[0].length - 1;
    out.push({ name: m[1], params: paramNames(m[2]), unions: paramUnions(text, m[2]), start: at, end: blockEnd(text, at) });
  }
  return out;
}

function statementEnd(text: string, from: number): number {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") {
      if (depth === 0) return i;
      depth--;
    } else if ((c === ";" || c === "\n") && depth === 0) return i;
  }
  return text.length;
}

/** `key: "a" | "b"` or `key: Alias` with `type Alias = "a" | "b"` in the file → the literal values. */
function paramUnions(text: string, list: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const literals = (t: string): string[] | null => {
    const parts = t.split("|").map((x) => x.trim()).filter(Boolean);
    const vals = parts.map((x) => /^["']([\w.]+)["']$/.exec(x)?.[1] ?? null);
    return parts.length && vals.every(Boolean) ? (vals as string[]) : null;
  };
  for (const p of list.split(",")) {
    const m = /^\s*([A-Za-z_$][\w$]*)\??\s*:\s*(.+?)\s*(?:=.*)?$/.exec(p);
    if (!m) continue;
    let vals = literals(m[2]);
    if (!vals && /^[A-Z][\w$]*$/.test(m[2])) {
      const alias = new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?type\\s+${m[2]}\\s*=\\s*([^;]+);`).exec(text);
      if (alias) vals = literals(alias[1].replace(/\s+/g, " "));
    }
    if (vals) out.set(m[1], vals);
  }
  return out;
}

function paramNames(list: string): string[] {
  return list
    .split(",")
    .map((p) => /^\s*(?:\.\.\.)?([A-Za-z_$][\w$]*)/.exec(p)?.[1] ?? "")
    .filter(Boolean);
}

export interface Pass {
  sites: ReadSite[];
  dynamic: DynamicRead[];
}

/**
 * Re-resolve the reads `scanKnobReads` left unresolved, and the reader calls it never saw.
 * `scan` is the first pass's result; returns the merged sites and the remaining unresolved list.
 */
export function followIndirection(
  files: SourceFile[],
  scan: { sites: ReadSite[]; dynamic: DynamicRead[]; consts: Map<string, string>; ambiguous: Set<string> },
  pool: MemberPool,
): Pass {
  const sites = [...scan.sites];
  const dynamic: DynamicRead[] = [];
  const byFile = new Map<string, DynamicRead[]>();
  for (const d of scan.dynamic) byFile.set(d.file, [...(byFile.get(d.file) ?? []), d]);
  const seenSiteLines = new Set(scan.sites.map((s) => `${s.file}|${s.line}`));

  for (const f of files) {
    if (f.rel.endsWith(".py") || HELPER_MODULES.test(f.rel)) {
      for (const d of byFile.get(f.rel) ?? []) dynamic.push(d);
      continue;
    }
    const pending = byFile.get(f.rel) ?? [];
    if (!pending.length && !/resolveSessionKnob\s*\(/.test(f.text)) continue;
    const local = localStringConsts(f.text);
    // `const X = \`${FEATURE}.key\`` — a template whose every part is static.
    const tplRe = /^[ \t]*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*`([^`\n]*)`/gm;
    for (let m = tplRe.exec(f.text); m; m = tplRe.exec(f.text)) {
      const out = m[2].replace(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (_, n: string) => local.get(n) ?? (scan.ambiguous.has(n) ? "\u0000" : (scan.consts.get(n) ?? "\u0000")));
      if (!out.includes("\u0000") && !out.includes("${")) local.set(m[1], out);
    }
    const own = objectMembers(f.text);
    const fileHelpers = helpers(f.text);
    const str = (raw: string): V => {
      const t = raw.trim().replace(/\s+as\s+(?:const|never|string)$/, "");
      const lit = /^["']([^"'\n]+)["']$/.exec(t);
      if (lit) return { s: lit[1] };
      const named = local.get(t) ?? (scan.ambiguous.has(t) ? undefined : scan.consts.get(t));
      if (named) return { s: named };
      const member = own.strings.get(t) ?? (pool.ambiguous.has(t) ? undefined : pool.strings.get(t));
      if (member) return { s: member };
      if (/^[A-Za-z_$][\w$]*$/.test(t)) return { param: t };
      return null;
    };
    const pairOf = (raw: string): { feature: V; key: V } | null => {
      const t = raw.trim().replace(/\s+as\s+(?:const|never)$/, "");
      const member = own.pairs.get(t) ?? (pool.ambiguous.has(t) ? undefined : pool.pairs.get(t));
      if (member) return { feature: { s: member.feature }, key: { s: member.key } };
      const obj = /^\{\s*feature\s*:\s*([^,]+?)\s*,\s*key(?:\s*:\s*([^,}]+?))?\s*,?\s*\}$/.exec(t);
      if (obj) return { feature: str(obj[1]), key: str(obj[2] ?? "key") };
      const full = str(t);
      if (full && "s" in full) {
        const at = full.s.lastIndexOf(".");
        return at > 0 ? { feature: { s: full.s.slice(0, at) }, key: { s: full.s.slice(at + 1) } } : null;
      }
      if (full && "param" in full) return { feature: full, key: full }; // a full key passed in whole
      return null;
    };

    // Candidate reader calls: every unresolved one, plus reader calls the first pass never listed.
    const annotated = scan.sites.filter((s) => s.file === f.rel && s.fn === "KNOB READS").map((s) => s.line);
    const dynLines = new Map<number, DynamicRead[]>();
    for (const d of pending) dynLines.set(d.line, [...(dynLines.get(d.line) ?? []), d]);
    const handled = new Set<DynamicRead>();
    READER_RE.lastIndex = 0;
    for (let m = READER_RE.exec(f.text); m; m = READER_RE.exec(f.text)) {
      const before = f.text.slice(Math.max(0, m.index - 30), m.index);
      if (/\bfunction\s*$/.test(before)) continue; // a definition, not a call
      const line = lineOf(f.text, m.index);
      // A `KNOB READS` annotation (≤3 lines above) already declared this computed read.
      if (annotated.some((l) => line > l && line <= l + 3)) continue;
      const ds = (dynLines.get(line) ?? []).filter((d) => d.fn.split(" ")[0] === m![1] || d.fn === m![1]);
      if (!ds.length && seenSiteLines.has(`${f.rel}|${line}`)) continue;
      if (!ds.length && m[1] !== "resolveSessionKnob") continue; // resolved already, or not a read
      const fn = m[1];
      const args = callArgs(f.text, m.index + m[0].length);
      let addr: { feature: V; key: V } | null;
      if (KNOBX.test(fn)) addr = args.length >= 2 ? { feature: str(args[0]), key: str(args[1]) } : null;
      else if (/^(?:useSessionKnob|getSessionKnob|resolveSessionKnob)$/.test(fn)) addr = args[0] ? pairOf(args[0]) : null;
      else addr = args[2] ? pairOf(args[2]) : null;
      for (const d of ds) handled.add(d);
      const fail = (why: string) =>
        dynamic.push(ds[0] ?? { file: f.rel, line, fn, raw: args.join(", ").replace(/\s+/g, " ").slice(0, 80), why });
      if (!addr || !addr.feature || !addr.key) {
        fail("address argument is computed at run time");
        continue;
      }
      if ("s" in addr.feature && "s" in addr.key) {
        sites.push({ file: f.rel, line, fn: `${fn} (indirect)`, feature: addr.feature.s, key: addr.key.s });
        continue;
      }
      // A parameter: follow the enclosing helper to its call sites in this file.
      const enclosing = fileHelpers.filter((x) => x.start <= m!.index && m!.index < x.end).sort((a, b) => b.start - a.start)[0];
      const typed = (v: V): string[] | null => (v && "s" in v ? [v.s] : v && enclosing ? (enclosing.unions.get(v.param) ?? null) : null);
      const tf = typed(addr.feature);
      const tk = typed(addr.key);
      if (tf && tk && !(addr.feature && "param" in addr.feature && addr.key && "param" in addr.key && addr.feature.param === addr.key.param)) {
        for (const fv of tf) for (const kv of tk) sites.push({ file: f.rel, line, fn: `${fn} (typed parameter)`, feature: fv, key: kv });
        continue;
      }
      const h = fileHelpers
        .filter((x) => x.start <= m!.index && m!.index < x.end)
        .sort((a, b) => b.start - a.start)
        .find((x) => [addr!.feature, addr!.key].every((v) => v && ("s" in v || x.params.includes(v.param))));
      if (!h) {
        fail("address is a variable no static value reaches");
        continue;
      }
      const wholeKey = "param" in addr.feature && "param" in addr.key && addr.feature.param === addr.key.param;
      const callRe = new RegExp(`(?<![.\\w$])${h.name}\\s*\\(`, "g");
      let calls = 0;
      for (let c = callRe.exec(f.text); c; c = callRe.exec(f.text)) {
        if (c.index >= h.start - 200 && c.index < h.start) continue; // the definition itself
        const cargs = callArgs(f.text, c.index + c[0].length);
        const at = (v: V): V => (v && "param" in v ? str(cargs[h.params.indexOf(v.param)] ?? "") : v);
        const cline = lineOf(f.text, c.index);
        calls++;
        if (wholeKey) {
          const p = pairOf(cargs[h.params.indexOf((addr.key as { param: string }).param)] ?? "");
          if (p && p.feature && p.key && "s" in p.feature && "s" in p.key) {
            sites.push({ file: f.rel, line: cline, fn: `${h.name} → ${fn}`, feature: p.feature.s, key: p.key.s });
          } else {
            dynamic.push({ file: f.rel, line: cline, fn: h.name, raw: cargs.join(", ").slice(0, 80), why: `helper ${h.name} is called with a computed address` });
          }
          continue;
        }
        const fv = at(addr.feature);
        const kv = at(addr.key);
        if (fv && kv && "s" in fv && "s" in kv) sites.push({ file: f.rel, line: cline, fn: `${h.name} → ${fn}`, feature: fv.s, key: kv.s });
        else dynamic.push({ file: f.rel, line: cline, fn: h.name, raw: cargs.join(", ").slice(0, 80), why: `helper ${h.name} is called with a computed argument` });
      }
      if (calls === 0) fail(`helper ${h.name} is never called by name in this file`);
    }
    for (const d of pending) if (!handled.has(d)) dynamic.push(d);
  }
  for (const d of scan.dynamic) if (!files.some((f) => f.rel === d.file)) dynamic.push(d);
  return { sites, dynamic };
}
