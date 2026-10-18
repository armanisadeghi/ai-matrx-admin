// EVERY INLINE SCRIPT GOES THROUGH PrepaintScript (lane L7, 2026-10-17).
//
// React 19 logs "Encountered a script tag while rendering React component" whenever a render that
// is NOT hydrating creates a <script> element — and such a script never runs. That happens to a
// server component too: a (core) layout Suspense boundary that React client-renders, a client
// navigation that mounts AppShell, a page re-rendered from the RSC payload. Every page logged it
// from the streamed boot seed (lib/boot/BootSeedScript inside the (core) layout's Suspense).
//
// THE RULE: an executable inline <script> in JSX is drawn only by `components/ssr/PrepaintScript`
// (server HTML + hydration only; a client-only render draws nothing). A data block
// (`type="application/ld+json"` / `application/json`) is exempt: React never warns for it.
// `next/script` is the other allowed door and is not matched here.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const DOOR = "components/ssr/PrepaintScript.tsx";

function rawScripts(): string[] {
  const files = execFileSync("git", ["grep", "-l", "<script", "--", "*.tsx", ":!**/__tests__/**", ":!*.test.tsx"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .filter((f) => f !== DOOR);
  const found: string[] = [];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), "utf8");
    // A JSX element opener: `<script` followed by whitespace, `>` or `/`, and not inside a template
    // string building HTML text (those carry a closing `</script>` on the same element string).
    const re = /<script(?=[\s/>])([\s\S]*?)(\/>|>)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const attrs = m[1];
      if (!/dangerouslySetInnerHTML|src=\{/.test(attrs)) continue; // prose / HTML strings, not JSX
      if (/type=["{]["']?application\/(ld\+)?json/.test(attrs)) continue; // data block
      found.push(`${f}:${text.slice(0, m.index).split("\n").length}`);
    }
  }
  return found;
}

it("no executable inline <script> is drawn outside PrepaintScript", () => {
  expect(rawScripts()).toEqual([]);
});
