/**
 * check:media-play-handled — EVERY `HTMLMediaElement.play()` PROMISE IS HANDLED.
 *
 * `play()` returns a promise that rejects when the element cannot play its
 * source ("NotSupportedError: The element has no supported sources" — a dead
 * link, a 404 page, a bare storage path bound as a relative src) or when the
 * browser blocks autoplay (NotAllowedError). Left floating — a bare
 * `el.play();` or `void el.play();` — the rejection reaches the window as an
 * unhandled rejection with no operation name, and the UI has already flipped
 * to "playing" for audio that never started (2026-10-21, the transcript
 * player on /knowledge/transcripts/<id>, 4 red captures in one minute).
 *
 * Refuses, by file:line, an argument-less `.play()` call that is not
 * `await`ed, `return`ed, or chained into `.catch(` / `.then(`.
 *
 *   pnpm check:media-play-handled              # scan
 *   pnpm check:media-play-handled --self-test  # prove the detector fails on each bad shape
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const SCAN_ROOTS = ["app", "features", "components", "lib", "hooks", "utils", "providers"];

/**
 * `.play()` receivers that are not media elements and return `void`, each
 * with its reason. Keyed `file::receiver`.
 */
const NOT_A_MEDIA_ELEMENT: Record<string, string> = {
  "features/audio/components/GoogleMusicMixer.tsx::player":
    "createStreamingPcmPlayer() — @ai-matrx/media live-audio PCM player; play(): void",
};

export interface Finding {
  file: string;
  line: number;
  what: string;
}

const PLAY_CALL = /([\w$\]\)]+!?)\s*(\?\.|\.)\s*play\s*(\?\.)?\s*\(\s*\)/g;

/** Whether the `.then(` at the start of `text` passes a second (rejection) argument. */
function thenHasRejectionHandler(text: string): boolean {
  const open = text.indexOf("(");
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"' || c === "'" || c === "`") {
      for (i += 1; i < text.length && text[i] !== c; i += 1) if (text[i] === "\\") i += 1;
      continue;
    }
    if (c === "(" || c === "{" || c === "[") depth += 1;
    else if (c === ")" || c === "}" || c === "]") {
      depth -= 1;
      if (depth === 0) {
        // `.then(a).catch(…)` is handled too.
        return /^\s*\.catch\s*\(/.test(text.slice(i + 1));
      }
    } else if (c === "," && depth === 1) return true;
  }
  return false;
}

export function scanFile(file: string, src: string): Finding[] {
  const out: Finding[] = [];
  const lines = src.split("\n");
  let offset = 0;
  const lineStarts = lines.map((l) => {
    const start = offset;
    offset += l.length + 1;
    return start;
  });
  const lineOf = (index: number) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  for (const m of src.matchAll(PLAY_CALL)) {
    const index = m.index ?? 0;
    const lineNo = lineOf(index);
    const lineText = lines[lineNo - 1].trim();
    if (lineText.startsWith("//") || lineText.startsWith("*") || lineText.startsWith("/*")) continue;
    const receiver = m[1].replace(/[\])!]+$/, "");
    if (NOT_A_MEDIA_ELEMENT[`${file}::${receiver}`]) continue;
    const after = src.slice(index + m[0].length).replace(/^\s+/, "");
    if (/^\.catch\s*\(/.test(after)) continue;
    // `.then(onOk, onErr)` handles; a one-argument `.then(onOk)` does not.
    if (/^\.then\s*\(/.test(after) && thenHasRejectionHandler(after)) continue;
    // Walk back over the receiver expression to the token that precedes it.
    const before = src.slice(Math.max(0, index - 200), index).replace(/[\w$.?!\[\]()]+$/, "");
    if (/\b(await|return)\s*$/.test(before)) continue;
    // `x = el.play()` / `const p = el.play()` hands the promise on.
    if (/(?<![=!<>])=\s*$/.test(before)) continue;
    out.push({
      file,
      line: lineNo,
      what: `${lineText.slice(0, 100)} — play() promise is never handled; chain .catch() (reset the playing state, surface a dead source)`,
    });
  }
  return out;
}

function walk(dir: string, acc: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith(".d.ts")) acc.push(full);
  }
}

function selfTest(): number {
  const bad = [
    "audioRef.current.play();",
    "void el.play();",
    "audioRef.current?.play();",
    "if (x) a.play()\nsetPlaying(true);",
    "ref.current!.play();",
    "el.play?.();",
    "el.play().then(() => setPlaying(true));",
  ];
  const good = [
    "el.play().catch(() => setPlaying(false));",
    "await audio.play();",
    "return el.play();",
    "const p = el.play();",
    "void elementRef.current?.play().catch(() => {});",
    "audio\n  .play()\n  .then(() => {}, () => {});",
    "el.play().then(() => go()).catch(() => stop());",
    "player.play(resp.source);",
    "router.push(ENGAGE_ROUTES.play(id, code));",
  ];
  let failed = 0;
  for (const src of bad) {
    if (scanFile("self-test.ts", src).length !== 1) {
      console.error(`SELF-TEST FAIL: did not flag ${JSON.stringify(src)}`);
      failed += 1;
    }
  }
  for (const src of good) {
    if (scanFile("self-test.ts", src).length !== 0) {
      console.error(`SELF-TEST FAIL: flagged handled shape ${JSON.stringify(src)}`);
      failed += 1;
    }
  }
  const allowed = scanFile("features/audio/components/GoogleMusicMixer.tsx", "player.play();");
  if (allowed.length !== 0) {
    console.error("SELF-TEST FAIL: allowlisted non-element receiver was flagged");
    failed += 1;
  }
  if (failed === 0) console.log(`check:media-play-handled self-test: ${bad.length} bad shapes caught, ${good.length} handled shapes passed`);
  return failed === 0 ? 0 : 1;
}

function main(): number {
  if (process.argv.includes("--self-test")) return selfTest();
  const files: string[] = [];
  for (const r of SCAN_ROOTS) {
    try {
      walk(join(ROOT, r), files);
    } catch {
      // root absent in this checkout
    }
  }
  const findings = files.flatMap((f) => scanFile(relative(ROOT, f), readFileSync(f, "utf8")));
  for (const f of findings) console.error(`${f.file}:${f.line}  ${f.what}`);
  if (findings.length) {
    console.error(`\ncheck:media-play-handled: ${findings.length} unhandled play() promise(s)`);
    return 1;
  }
  console.log(`check:media-play-handled: ${files.length} files, every play() promise handled`);
  return 0;
}

process.exit(main());
