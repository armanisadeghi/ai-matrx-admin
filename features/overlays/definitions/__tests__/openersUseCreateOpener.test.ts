/**
 * ONE OPENER: every overlay opener is declared through `appOpener` (`../app-opener.ts`, on summon's
 * `createOpener` from `@ai-matrx/summon/opener`). Summon owns the open/close actions, the instance-id
 * mint and the open-on-mount Controller; an opener file holds only its option types and data mapping.
 *
 * Fails on:
 *   1. a `<id>.overlay.ts(x)` that dispatches `openOverlay`/`closeOverlay` or hand-writes a Controller
 *      (`useEffect`) and is not in HAND_OPENERS below (and on a stale HAND_OPENERS line);
 *   2. a hand-built instance id (`Date.now()` / `randomUUID()` / `Math.random()`) in any app file
 *      that opens overlays: use `mintInstanceId` (`@ai-matrx/summon/boot`) or `appOpener({ multi: true })`;
 *   3. a local `DEFAULT_INSTANCE_ID` declaration anywhere in the app (import summon's);
 *   4. `appOpener(…, { multi: true })` on an overlay whose definition is `instance: "single"`
 *      (read from the generated overlay-meta-index.ts, i.e. from registry.ts).
 *
 * Openers with their own open logic (callback groups, thunks, computed ids) keep only that logic and open/close
 * through `createOpener` (`opener.open(dispatch, …)`, `opener.close(id)`); their Controllers are
 * `hookController(useOpenX)` from `../app-opener`. HAND_OPENERS is the shrink-only list of true exceptions,
 * each with its reason.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DIR = path.resolve(__dirname, "..");
const REPO = path.resolve(DIR, "../../..");

const HAND_OPENERS: Readonly<Record<string, string>> = {
  // Controllers that are not open-on-mount/re-open-on-change
  copySubsetWindow: "Controller opens once with its first props",
  gmailComposeWindow: "unmount effect disposes the hook's callback handles",
  liveRunWindow: "Controller keeps one handle across prop changes",
};

const HAND_WRITTEN = /\b(openOverlay|closeOverlay)\(|\buseEffect\(/;
// Any overlay instance id built by hand from a clock or random source: `${id}-${Date.now()}`, `x:${crypto.randomUUID()}`,
// `instanceId: crypto.randomUUID()`, `…-${Math.random().toString(36)…}` (dup-census-2 TRUE-1). One mint: summon `mintInstanceId`.
const MINT = /[iI]nstanceId\s*(?:\?\?|[:=])[^;,]{0,160}?(?:Date\.now\(\)|randomUUID\(\)|Math\.random\(\))/s;
const OPENS_OVERLAYS = /\b(openOverlay|instanceId)\b/;
const LOCAL_DEFAULT_INSTANCE = /\b(const|let|var)\s+DEFAULT_INSTANCE_ID\s*=/;

function openerFiles(): string[] {
  return fs.readdirSync(DIR).filter((f) => /\.overlay\.tsx?$/.test(f)).sort();
}

function appSourceFiles(): string[] {
  const out = execFileSync("git", ["ls-files", "--", "*.ts", "*.tsx"], { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return out
    .split("\n")
    .filter((f) => f && !f.startsWith("node_modules/") && !f.includes("/__tests__/") && !/\.test\.tsx?$/.test(f) && fs.existsSync(path.join(REPO, f)));
}

describe("one opener: appOpener on summon createOpener", () => {
  it("no hand-written opener outside the census, and no stale census line", () => {
    const hand = openerFiles()
      .filter((f) => HAND_WRITTEN.test(fs.readFileSync(path.join(DIR, f), "utf8")))
      .map((f) => f.replace(/\.overlay\.tsx?$/, ""));
    const unlisted = hand.filter((id) => !(id in HAND_OPENERS));
    const stale = Object.keys(HAND_OPENERS).filter((id) => !hand.includes(id));
    expect({ unlisted, stale }).toEqual({ unlisted: [], stale: [] });
  });

  it("no hand-copied instance-id mint and no local DEFAULT_INSTANCE_ID in the app", () => {
    const mints: string[] = [];
    const defaults: string[] = [];
    for (const f of appSourceFiles()) {
      const src = fs.readFileSync(path.join(REPO, f), "utf8");
      if (MINT.test(src) && OPENS_OVERLAYS.test(src)) mints.push(f);
      if (LOCAL_DEFAULT_INSTANCE.test(src)) defaults.push(f);
    }
    expect({ mints, defaults }).toEqual({ mints: [], defaults: [] });
  });

  it("appOpener multi agrees with the definition's instance mode", () => {
    const meta = fs.readFileSync(path.join(DIR, "overlay-meta-index.ts"), "utf8");
    const modes = new Map([...meta.matchAll(/\{ id: "(\w+)",[^}]*?instance: "(single|multi)"/g)].map((m) => [m[1], m[2]]));
    const wrong: string[] = [];
    for (const f of openerFiles()) {
      const src = fs.readFileSync(path.join(DIR, f), "utf8");
      if (!/appOpener[^(]*\([^)]*multi: true/s.test(src)) continue;
      const id = src.match(/OVERLAY_ID\s*=\s*"(\w+)"/)?.[1] ?? f.replace(/\.overlay\.tsx?$/, "");
      if (modes.get(id) !== "multi") wrong.push(`${id} (definition: ${modes.get(id) ?? "missing"})`);
    }
    expect(wrong).toEqual([]);
  });
});
