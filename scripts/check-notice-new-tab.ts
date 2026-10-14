/**
 * check:notice-new-tab — A NOTIFICATION NEVER MOVES THE PAGE (lib/notice-open/openFromNotice.ts).
 *
 * Refuses, by file:line:
 *   1. In notification code (assists, admin attention dock, bell / inbox, and any
 *      file that marks a `data-matrx-notice-surface`): `router.push` / `router.replace`,
 *      `location.assign` / `.replace` / `.href =`, and a `<Link>` / `<AppLink>` / `<a>`
 *      with an href but no `target=`.
 *   2. Anywhere in the app: a toast whose `action` / `cancel` navigates the same tab.
 * The fix is always `openFromNotice(href)` or `target="_blank"`.
 *
 *   pnpm check:notice-new-tab              # scan
 *   pnpm check:notice-new-tab --self-test  # prove the detector fails on each bad shape
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const SCAN_ROOTS = ["app", "features", "components", "lib", "hooks", "utils", "providers"];
const NOTICE_DIRS = ["features/assists/", "features/admin/attention/", "features/notifications/"];
/** Files inside a notice dir that are a full page, not a notification. Each with its reason. */
const NOT_A_NOTICE: Record<string, string> = {
  "features/notifications/components/InboxPage.tsx": "the /notifications page rewrites its own query string",
};

const SAME_TAB_CALL = /\brouter\.(push|replace)\s*\(|\blocation\.(assign|replace)\s*\(|\blocation\.href\s*=[^=]|\bwindow\.location\s*=[^=]/;

export interface Finding {
  file: string;
  line: number;
  what: string;
}

function lineOf(src: string, index: number): number {
  let n = 1;
  for (let i = 0; i < index; i += 1) if (src.charCodeAt(i) === 10) n += 1;
  return n;
}

/** Index just past the bracket that closes the one at `open` (skips strings and template literals). */
function matchClose(src: string, open: number): number {
  const pairs: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
  const stack: string[] = [];
  for (let i = open; i < src.length; i += 1) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      for (i += 1; i < src.length && src[i] !== q; i += 1) if (src[i] === "\\") i += 1;
      continue;
    }
    if (pairs[c]) stack.push(pairs[c]);
    else if (c === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return i + 1;
    }
  }
  return src.length;
}

/** Rule 1: same-tab navigation inside notification code. */
export function scanNoticeFile(file: string, src: string): Finding[] {
  const out: Finding[] = [];
  const lines = src.split("\n");
  lines.forEach((text, i) => {
    const trimmed = text.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    const m = SAME_TAB_CALL.exec(text);
    if (m) out.push({ file, line: i + 1, what: `same-tab navigation \`${m[0].trim()}\` — use openFromNotice(href)` });
  });
  const tag = /<(Link|AppLink|a)\b/g;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(src))) {
    const end = src.indexOf(">", m.index);
    // A `>` inside an attribute expression (`=>`) ends the slice early; walk braces instead.
    let i = m.index + m[0].length;
    while (i < src.length && src[i] !== ">" && !(src[i] === "/" && src[i + 1] === ">")) {
      if (src[i] === "{") i = matchClose(src, i);
      else if (src[i] === '"' || src[i] === "'") i = src.indexOf(src[i], i + 1) + 1;
      else i += 1;
    }
    const opening = src.slice(m.index, end < 0 ? src.length : Math.max(i, end));
    if (!/\bhref\s*=/.test(opening)) continue;
    if (/\btarget\s*=/.test(opening)) continue;
    out.push({ file, line: lineOf(src, m.index), what: `<${m[1]}> opens in this tab — add target="_blank" rel="noopener"` });
  }
  return out;
}

/** Rule 2: a toast action/cancel that navigates the same tab, anywhere. */
export function scanToastActions(file: string, src: string): Finding[] {
  const out: Finding[] = [];
  const call = /\btoast(?:\.[A-Za-z]+)?\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = call.exec(src))) {
    const open = m.index + m[0].length - 1;
    const args = src.slice(open, matchClose(src, open));
    const slot = /\b(action|cancel)\s*:\s*\{/g;
    let s: RegExpExecArray | null;
    while ((s = slot.exec(args))) {
      const braceAt = s.index + s[0].length - 1;
      const body = args.slice(braceAt, matchClose(args, braceAt));
      const nav = SAME_TAB_CALL.exec(body);
      if (nav) {
        out.push({
          file,
          line: lineOf(src, open + braceAt + nav.index),
          what: `toast ${s[1]} navigates this tab (\`${nav[0].trim()}\`) — use openFromNotice(href)`,
        });
      }
    }
  }
  return out;
}

function walk(dir: string, files: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !p.includes("__tests__")) files.push(p);
  }
}

function scanRepo(): Finding[] {
  const files: string[] = [];
  for (const r of SCAN_ROOTS) walk(join(ROOT, r), files);
  const out: Finding[] = [];
  for (const abs of files) {
    const file = relative(ROOT, abs);
    if (file.startsWith("lib/notice-open/")) continue;
    const src = readFileSync(abs, "utf8");
    const isNotice =
      (NOTICE_DIRS.some((d) => file.startsWith(d)) || src.includes("data-matrx-notice-surface")) && !NOT_A_NOTICE[file];
    if (isNotice) out.push(...scanNoticeFile(file, src));
    if (src.includes("toast")) out.push(...scanToastActions(file, src));
  }
  return out;
}

function selfTest(): number {
  const bad: Array<[string, (f: string, s: string) => Finding[], string]> = [
    ["router push in an assist", scanNoticeFile, "const go = () => router.push('/x');"],
    ["location.assign in a dock", scanNoticeFile, "run: () => window.location.assign(href),"],
    ["location.href write", scanNoticeFile, "window.location.href = '/x';"],
    ["same-tab Link", scanNoticeFile, '<Link href="/assists" className="x">Open</Link>'],
    ["same-tab AppLink with arrow attr", scanNoticeFile, '<AppLink href={h} onClick={() => setOpen(false)}>Go</AppLink>'],
    ["toast action router.push", scanToastActions, "toast.success('Saved', { action: { label: 'Open', onClick: () => router.push(`/b/${id}`) } });"],
    ["toast cancel location.assign", scanToastActions, "toast('x', { cancel: { label: 'Go', onClick: () => location.assign('/y') } })"],
  ];
  const good: Array<[string, (f: string, s: string) => Finding[], string]> = [
    ["new-tab Link", scanNoticeFile, '<Link href="/assists" target="_blank" rel="noopener">Open</Link>'],
    ["door call", scanNoticeFile, "navigate: (href) => openFromNotice(href),"],
    ["toast action door", scanToastActions, "toast.success('Saved', { action: { label: 'Open', onClick: () => openFromNotice(`/b/${id}`) } });"],
    ["router.push after a toast, not in it", scanToastActions, "toast.success('Saved'); router.push('/b');"],
  ];
  let failed = 0;
  for (const [name, fn, src] of bad) {
    if (fn("fixture.tsx", src).length === 0) {
      console.error(`SELF-TEST FAIL: did not catch "${name}"`);
      failed += 1;
    }
  }
  for (const [name, fn, src] of good) {
    const f = fn("fixture.tsx", src);
    if (f.length) {
      console.error(`SELF-TEST FAIL: flagged the allowed "${name}": ${f[0].what}`);
      failed += 1;
    }
  }
  console.log(failed ? `check:notice-new-tab self-test: ${failed} failure(s)` : `check:notice-new-tab self-test: ${bad.length} bad shapes caught, ${good.length} good shapes pass`);
  return failed ? 1 : 0;
}

if (require.main === module) {
  if (process.argv.includes("--self-test")) process.exit(selfTest());
  const findings = scanRepo();
  for (const f of findings) console.error(`${f.file}:${f.line}  ${f.what}`);
  if (findings.length) {
    console.error(`\ncheck:notice-new-tab: ${findings.length} same-tab navigation(s) from a notification. A notification opens a window or a NEW TAB — lib/notice-open/openFromNotice.ts.`);
    process.exit(1);
  }
  console.log("check:notice-new-tab: every notification opens a window or a new tab.");
}
