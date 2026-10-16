/**
 * check:contact-values — EVERY EMAIL, PHONE NUMBER AND SOCIAL PROFILE IS THE CANONICAL COMPONENT
 * (Arman, 2026-10-16: "you cannot have emails that don't use our canonical email component or phone
 * numbers that don't use it").
 *
 * The components are `EmailValue`, `PhoneValue`, `AddressValue`, `SocialHandleValue`, `UrlValue` (and
 * `ContactValue` by type) from `@ai-matrx/design-system`: inline value + THE peek + real actions.
 *
 * Refuses, by file:line, in rendered code (`.tsx` under the scan roots):
 *   1. a hand-built `mailto:` / `tel:` / `sms:` link (any string or template literal holding one);
 *   2. an `href` written straight to a social profile host (LinkedIn, Instagram, X/Twitter, Facebook,
 *      TikTok, YouTube, Threads, Pinterest).
 * Debt from before the guard lives in `scripts/contact-values-baseline.json`, per file — SHRINK-ONLY:
 * a file above its count, or a new file, fails; a file below its count fails too until the baseline
 * is lowered (`--update-baseline` only ever lowers).
 *
 *   pnpm check:contact-values                     # scan against the baseline
 *   pnpm check:contact-values --no-baseline       # every finding (the full debt)
 *   pnpm check:contact-values --update-baseline   # lower counts after a rollout (never raises)
 *   pnpm check:contact-values:self-test           # prove each rule fails on a bad shape
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const SCAN_ROOTS = ["app", "features", "components", "lib", "hooks", "utils", "providers"];
const BASELINE_FILE = join(ROOT, "scripts/contact-values-baseline.json");

const SCHEME = /["'`](?:mailto|tel|sms):/;
const SOCIAL_HREF =
  /\bhref\s*=\s*\{?\s*["'`]https?:\/\/(?:www\.|m\.)?(?:linkedin\.com|instagram\.com|x\.com|twitter\.com|facebook\.com|tiktok\.com|youtube\.com|threads\.net|pinterest\.com)\//;

export interface Finding {
  file: string;
  line: number;
  what: string;
}

export function scanFile(file: string, src: string): Finding[] {
  const out: Finding[] = [];
  src.split("\n").forEach((text, i) => {
    const trimmed = text.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
    const scheme = SCHEME.exec(text);
    if (scheme) {
      out.push({ file, line: i + 1, what: `hand-built ${scheme[0].slice(1)} link — render <EmailValue>/<PhoneValue> (@ai-matrx/design-system)` });
    }
    if (SOCIAL_HREF.test(text)) {
      out.push({ file, line: i + 1, what: "hand-built social profile link — render <SocialHandleValue> (@ai-matrx/design-system)" });
    }
  });
  return out;
}

function walk(dir: string, files: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".") || name === "__tests__") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (name.endsWith(".tsx") && !/\.(test|spec|stories)\.tsx$/.test(name)) files.push(path);
  }
}

export function scanRepo(): Finding[] {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    try {
      walk(join(ROOT, root), files);
    } catch {
      /* a scan root that does not exist */
    }
  }
  return files.flatMap((path) => scanFile(relative(ROOT, path), readFileSync(path, "utf8")));
}

function countByFile(findings: Finding[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of findings) counts[f.file] = (counts[f.file] ?? 0) + 1;
  return counts;
}

function readBaseline(): Record<string, number> {
  try {
    return JSON.parse(readFileSync(BASELINE_FILE, "utf8")).files ?? {};
  } catch {
    return {};
  }
}

function selfTest(): void {
  const bad: [string, string][] = [
    ["mailto", '<a href={`mailto:${email}`}>{email}</a>'],
    ["tel", '<a href={"tel:" + phone}>{phone}</a>'],
    ["sms", "const href = `sms:${n}`;"],
    ["social", '<a href="https://www.linkedin.com/in/someone">LinkedIn</a>'],
    ["social-x", "<OutboundLink href={`https://x.com/${handle}`}>"],
  ];
  const good = [
    "<EmailValue email={email} />",
    '<PhoneValue phone="949 555 0142" />',
    "// a comment that says mailto: is fine",
    '<a href="https://example.com/about">About</a>',
  ];
  let failed = 0;
  for (const [name, src] of bad) {
    if (scanFile("x.tsx", src).length === 0) {
      console.error(`self-test: rule did not fire on ${name}: ${src}`);
      failed += 1;
    }
  }
  for (const src of good) {
    if (scanFile("x.tsx", src).length !== 0) {
      console.error(`self-test: false positive on: ${src}`);
      failed += 1;
    }
  }
  if (failed) {
    console.error(`check:contact-values self-test FAILED (${failed})`);
    process.exit(1);
  }
  console.log(`check:contact-values self-test: ${bad.length} bad shapes caught, ${good.length} good shapes pass`);
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  if (args.has("--self-test")) return selfTest();
  const findings = scanRepo();
  const counts = countByFile(findings);
  if (args.has("--update-baseline")) {
    const before = readBaseline();
    const next: Record<string, number> = {};
    for (const [file, n] of Object.entries(before)) {
      const now = Math.min(n, counts[file] ?? 0);
      if (now > 0) next[file] = now;
    }
    writeFileSync(BASELINE_FILE, `${JSON.stringify({ note: "SHRINK-ONLY debt from before check:contact-values (2026-10-16). Lower it as files move to the canonical contact values; never raise it.", files: next }, null, 2)}\n`);
    console.log(`baseline lowered: ${Object.values(before).reduce((a, b) => a + b, 0)} -> ${Object.values(next).reduce((a, b) => a + b, 0)}`);
    return;
  }
  const baseline = args.has("--no-baseline") ? {} : readBaseline();
  const problems: string[] = [];
  for (const [file, n] of Object.entries(counts)) {
    const allowed = baseline[file] ?? 0;
    if (n > allowed) {
      for (const f of findings.filter((x) => x.file === file)) problems.push(`${f.file}:${f.line}  ${f.what}`);
      problems.push(`  -> ${file}: ${n} hand-built contact link(s), baseline ${allowed}`);
    }
  }
  for (const [file, allowed] of Object.entries(baseline)) {
    const n = counts[file] ?? 0;
    if (n < allowed) problems.push(`${file}: now ${n}, baseline ${allowed} — run \`pnpm check:contact-values --update-baseline\` to lower it`);
  }
  if (problems.length) {
    console.error(problems.join("\n"));
    console.error(`\ncheck:contact-values FAILED — render emails, phones, addresses, social profiles and links with the canonical contact values from @ai-matrx/design-system.`);
    process.exit(1);
  }
  console.log(`check:contact-values: ${findings.length} baselined hand-built contact link(s) in ${Object.keys(counts).length} file(s); nothing new.`);
}

main();
