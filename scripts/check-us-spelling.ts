#!/usr/bin/env tsx
/**
 * scripts/check-us-spelling.ts — THE US-SPELLING GUARD (matrx-frontend).
 *
 * Arman, 2026-10-18: British spellings ("Colour", "Cancelled", "Catalogue") reached the UI and put off a
 * US audience. Everything a person reads is American English.
 *
 * What it checks: USER-VISIBLE text only — JSX text, string literals and template parts in .ts/.tsx/.jsx/.mts
 * files — for the British spellings in WORDS below. Comments are not user-visible and are not checked.
 * A lowercase single-token literal ('cancelled', 'colour') is a stored value or identifier and is skipped, exactly
 * as the sweep that cleaned the codebase skipped it; a capitalized single word ("Colour") is a label and fails.
 * A line listing stored status words (`a | cancelled | b`, `a -> cancelled`) is skipped.
 *
 *   pnpm check:us-spelling              files changed vs HEAD (working tree, staged, untracked)
 *   pnpm check:us-spelling --base=REF   files changed from REF to HEAD, plus the working tree
 *   pnpm check:us-spelling --all        every tracked source file
 *   pnpm check:us-spelling:self-test    RED on a planted `Colour` in JSX, GREEN on a clean file
 *
 * Exit: 0 clean · 1 a British spelling in user-visible text. Advisory in scripts/run-release-gates.sh.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/** stem -> [American stem, allowed endings]. Mirrors the sweep that cleaned the codebase. */
export const WORDS: Record<string, [string, string[]]> = {
  colour: ["color", ["", "s", "ed", "ing", "ful", "less"]],
  favour: ["favor", ["", "s", "ed", "ing", "ite", "ites", "able", "ably"]],
  behaviour: ["behavior", ["", "s", "al", "ally"]],
  honour: ["honor", ["", "s", "ed", "ing", "able"]],
  labour: ["labor", ["", "s", "ed", "er", "ers", "ing"]],
  organis: ["organiz", ["e", "es", "ed", "er", "ers", "ing", "ation", "ations", "ational"]],
  recognis: ["recogniz", ["e", "es", "ed", "ing", "able", "ably", "ation"]],
  realis: ["realiz", ["e", "es", "ed", "ing", "ation", "ations", "able"]],
  customis: ["customiz", ["e", "es", "ed", "ing", "able", "ation", "ations"]],
  optimis: ["optimiz", ["e", "es", "ed", "er", "ers", "ing", "ation", "ations"]],
  normalis: ["normaliz", ["e", "es", "ed", "er", "ers", "ing", "ation", "ations", "able"]],
  summaris: ["summariz", ["e", "es", "ed", "er", "ers", "ing", "ation", "ations", "able"]],
  prioritis: ["prioritiz", ["e", "es", "ed", "ing", "ation", "ations"]],
  analys: ["analyz", ["e", "ed", "ing", "er", "ers"]],
  catalogue: ["catalog", ["", "s"]],
  cataloguing: ["cataloging", [""]],
  centre: ["center", ["", "s"]],
  centring: ["centering", [""]],
  licence: ["license", ["", "s"]],
  cancelled: ["canceled", [""]],
  cancelling: ["canceling", [""]],
  grey: ["gray", ["", "s", "ed", "ing", "ish", "er", "est", "scale"]],
  modelling: ["modeling", [""]],
  modelled: ["modeled", [""]],
  travelling: ["traveling", [""]],
  travelled: ["traveled", [""]],
  traveller: ["traveler", ["", "s"]],
  labelled: ["labeled", [""]],
  labelling: ["labeling", [""]],
  judgement: ["judgment", ["", "s"]],
  defence: ["defense", ["", "s", "less"]],
  programme: ["program", ["", "s"]],
};

/**
 * Whole-word forms whose American spelling is NOT `american + british ending` (stem + "d" turned "centred" into the
 * non-word "centerd" and "catalogued" into "catalogd"). Every irregular form is spelled out in full here.
 */
export const IRREGULAR: Record<string, string> = {
  centred: "centered",
  catalogued: "cataloged",
};

const MAP = new Map<string, string>();
const ALTS: string[] = [];
for (const [british, american] of Object.entries(IRREGULAR)) {
  MAP.set(british, american);
  ALTS.push(british);
}
for (const [stem, [american, ends]] of Object.entries(WORDS)) {
  for (const e of ends) {
    MAP.set(stem + e, american + e);
    ALTS.push(stem + e);
  }
}
ALTS.sort((a, b) => b.length - a.length);
const WORD = new RegExp(
  "(?:(?<![\\w\\-.$@/#'\"`|=:\\\\])|(?<=\\\\[nrt]))(" +
    ALTS.join("|") +
    ")(?![\\w\\-$@/'\"`|=])(?!\\.\\w)(?!\\(\\))",
  "gi",
);
const STORED_LIST = /\s\|\s|→|->/;
const SINGLE = /^\S+$/;
const CAP = /^[A-Z][a-z]/;
const SKIP_ATTR = new Set(["className", "class", "key", "id", "name", "value", "type", "variant", "href", "src", "as", "role", "htmlFor", "to", "path", "slot", "size", "color", "tone", "intent", "status", "kind"]);

export interface Finding {
  file: string;
  line: number;
  found: string;
  use: string;
}

/** British spellings in one piece of visible text. */
export function britishIn(text: string): { found: string; use: string }[] {
  const out: { found: string; use: string }[] = [];
  for (const m of text.matchAll(WORD)) {
    const found = m[1];
    const idx = m.index ?? 0;
    if (found.toLowerCase().startsWith("cancel")) {
      const a = text.lastIndexOf("\n", idx) + 1;
      let b = text.indexOf("\n", idx + found.length);
      if (b < 0) b = text.length;
      if (STORED_LIST.test(text.slice(a, b))) continue;
    }
    out.push({ found, use: MAP.get(found.toLowerCase()) ?? "" });
  }
  return out;
}

function worthChecking(text: string): boolean {
  const t = text.trim();
  return !(SINGLE.test(t) && !CAP.test(t));
}

function isNameLike(node: ts.StringLiteral): boolean {
  const p = node.parent;
  if (!p) return false;
  const k = ts.SyntaxKind;
  if ([k.ImportDeclaration, k.ExportDeclaration, k.ExternalModuleReference, k.ImportType, k.ModuleDeclaration, k.ElementAccessExpression, k.ComputedPropertyName, k.CaseClause, k.LiteralType].includes(p.kind)) return true;
  if ((p as { name?: ts.Node }).name === node) return true;
  if (p.kind === k.BinaryExpression) {
    const op = (p as ts.BinaryExpression).operatorToken.kind;
    if ([k.EqualsEqualsEqualsToken, k.ExclamationEqualsEqualsToken, k.EqualsEqualsToken, k.ExclamationEqualsToken].includes(op)) return true;
  }
  if (p.kind === k.JsxAttribute) {
    const n = (p as ts.JsxAttribute).name.getText();
    if (SKIP_ATTR.has(n) || n.startsWith("data-") || n.startsWith("aria-controls") || n.startsWith("aria-labelledby")) return true;
  }
  return false;
}

/** Scan one source text; returns findings in user-visible strings. */
export function scanSource(file: string, src: string): Finding[] {
  const kind = file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, kind);
  const found: Finding[] = [];
  const check = (start: number, end: number) => {
    if (end <= start) return;
    const text = src.slice(start, end);
    for (const hit of britishIn(text)) {
      found.push({ file, line: sf.getLineAndCharacterOfPosition(start).line + 1, found: hit.found, use: hit.use });
    }
  };
  const walk = (n: ts.Node): void => {
    const k = ts.SyntaxKind;
    if (n.kind === k.StringLiteral) {
      if (!isNameLike(n as ts.StringLiteral)) {
        const a = n.getStart() + 1;
        const b = n.getEnd() - 1;
        if (b > a && worthChecking(src.slice(a, b))) check(a, b);
      }
    } else if (n.kind === k.NoSubstitutionTemplateLiteral) {
      if (n.parent?.kind !== k.TaggedTemplateExpression) {
        const a = n.getStart() + 1;
        const b = n.getEnd() - 1;
        if (b > a && worthChecking(src.slice(a, b))) check(a, b);
      }
    } else if (n.kind === k.TemplateExpression) {
      if (n.parent?.kind !== k.TaggedTemplateExpression) {
        const te = n as ts.TemplateExpression;
        check(te.head.getStart() + 1, te.head.getEnd() - 2);
        for (const sp of te.templateSpans) {
          const l = sp.literal;
          check(l.getStart() + 1, l.getEnd() - (l.kind === k.TemplateTail ? 1 : 2));
        }
      }
    } else if (n.kind === k.JsxText) {
      if (n.getText().trim()) check(n.pos, n.end);
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return found;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = /\.(tsx?|jsx|mts)$/;
const SKIP = /(^|\/)(node_modules|dist|\.next|migrations|fixtures|__fixtures__|generated|captured|sample_data|system-prompts)\/|\.generated\.|\.d\.ts$|check-us-spelling/;

function git(root: string, args: string[]): string[] {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function filesToScan(root: string, argv: string[]): string[] {
  let files: string[];
  if (argv.includes("--all")) files = git(root, ["ls-files"]);
  else {
    const base = argv.find((a) => a.startsWith("--base="))?.slice(7);
    files = [
      ...git(root, ["diff", "--name-only", base ? `${base}...HEAD` : "HEAD"]),
      ...(base ? git(root, ["diff", "--name-only", "HEAD"]) : []),
      ...git(root, ["ls-files", "--others", "--exclude-standard"]),
    ];
  }
  return [...new Set(files)].filter((f) => SOURCE.test(f) && !SKIP.test(f));
}

/**
 * THE COLOR LAW (Arman, 2026-10-21): the British "colour" does not exist anywhere in our files: not in a
 * comment, an identifier, a file name, a CSS variable, a template JSON or a doc. Unlike the user-visible scan above
 * this one reads every tracked text file. The only exceptions: applied SQL migrations (immutable history) and this
 * guard itself (it has to spell the word).
 */
const COLOUR_TEXT = /\.(tsx?|jsx|mts|mjs|cjs|json|css|md|mdx|py|sh|yml|yaml|fixture)$/;
const COLOUR_EXEMPT = /(^|\/)(node_modules|dist|\.next|migrations)\/|\.sql$|check-us-spelling|pnpm-lock|package-lock/;
export function colourAnywhere(file: string, text: string): Finding[] {
  if (!COLOUR_TEXT.test(file) || COLOUR_EXEMPT.test(file)) return [];
  const out: Finding[] = [];
  if (/colour/i.test(file)) out.push({ file, line: 0, found: "colour", use: "color" });
  text.split("\n").forEach((line, i) => {
    if (/colour/i.test(line)) out.push({ file, line: i + 1, found: "colour", use: "color" });
  });
  return out;
}

export function scanRoot(root: string, argv: string[]): Finding[] {
  const out: Finding[] = [];
  const everyTracked = argv.includes("--all") ? git(root, ["ls-files"]) : [...new Set([
    ...git(root, ["diff", "--name-only", "HEAD"]),
    ...git(root, ["ls-files", "--others", "--exclude-standard"]),
  ])];
  for (const f of everyTracked) {
    const p = join(root, f);
    if (!existsSync(p) || !COLOUR_TEXT.test(f)) continue;
    out.push(...colourAnywhere(f, readFileSync(p, "utf8")));
  }
  for (const f of filesToScan(root, argv)) {
    const p = join(root, f);
    if (!existsSync(p)) continue;
    out.push(...scanSource(f, readFileSync(p, "utf8")));
  }
  return out;
}

function selfTest(): number {
  const dir = mkdtempSync(join(tmpdir(), "us-spelling-"));
  let failed = false;
  try {
    const red = join(dir, "red.tsx");
    const green = join(dir, "green.tsx");
    writeFileSync(red, 'export const A = () => <div>Pick a Colour</div>;\n');
    writeFileSync(
      green,
      'export const A = () => <div>Pick a color</div>;\n// the old colour comment is not user-visible\nexport const S = "cancelled";\n',
    );
    const r = scanSource("red.tsx", readFileSync(red, "utf8"));
    const g = scanSource("green.tsx", readFileSync(green, "utf8"));
    if (r.length !== 1 || r[0].found !== "Colour") {
      console.error("SELF-TEST FAILED: the guard did not go red on a planted 'Colour' in JSX.");
      failed = true;
    }
    if (g.length !== 0) {
      console.error(`SELF-TEST FAILED: the guard went red on a clean file: ${JSON.stringify(g)}`);
      failed = true;
    }
    if (colourAnywhere("features/x/t.pack.json", '{"label":"Colour"}').length !== 1 || colourAnywhere("a.ts", "// a colour comment").length !== 1) {
      console.error("SELF-TEST FAILED: the color law did not go red on a planted 'Colour' in JSON or a comment.");
      failed = true;
    }
    if (colourAnywhere("features/x/t.pack.json", '{"label":"Color"}').length !== 0) {
      console.error("SELF-TEST FAILED: the color law went red on 'Color'.");
      failed = true;
    }
    // Every suggestion must be a real word: the whole-word table, never stem + ending.
    const expected: Record<string, string> = { centred: "centered", catalogued: "cataloged", centres: "centers", Centred: "centered" };
    for (const [word, want] of Object.entries(expected)) {
      const hits = britishIn(`Pick a ${word} option`);
      if (hits.length !== 1 || hits[0].use !== want) {
        console.error(`SELF-TEST FAILED: "${word}" should map to "${want}", got ${JSON.stringify(hits)}`);
        failed = true;
      }
    }
    for (const [british, american] of MAP) {
      if (/(erd|ogd)$/.test(american)) {
        console.error(`SELF-TEST FAILED: "${british}" maps to the non-word "${american}".`);
        failed = true;
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  if (!failed) console.log("check-us-spelling self-test: RED on planted 'Colour' in JSX, GREEN on a clean file.");
  return failed ? 1 : 0;
}

function main(): number {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-test")) return selfTest();
  const root = resolve(HERE, "..");
  const findings = scanRoot(root, argv);
  if (findings.length === 0) {
    console.log("check-us-spelling: clean — no British spelling in user-visible text.");
    return 0;
  }
  for (const f of findings) console.error(`${f.file}:${f.line}  "${f.found}" -> "${f.use}"`);
  console.error(`\ncheck-us-spelling: ${findings.length} British spelling(s) in user-visible text. Our audience is American: use the US spelling.`);
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
