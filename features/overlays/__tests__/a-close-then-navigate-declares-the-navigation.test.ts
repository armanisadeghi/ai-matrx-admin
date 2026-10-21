/**
 * A window or dialog that closes and then navigates (router.push) declares the navigation first
 * (`expectNavigation` from @ai-matrx/summon/url). Without it the overlay layer's address write for
 * the close (history.replaceState of the CURRENT page) races the push and the push is lost: "Open the
 * table" and "Go to scope" did nothing. This census reads every source file: a router.push within
 * three lines of a close must have expectNavigation in the six lines above it.
 * Red before: 19 close-then-push sites, none declared.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const TOPS = ["features", "components", "app", "providers"];

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(ts|tsx)$/.test(name)) yield p;
  }
}

it("every close-then-push declares the navigation", () => {
  const offenders: string[] = [];
  for (const top of TOPS) {
    for (const file of files(join(ROOT, top))) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (!/\brouter\.push\(/.test(line)) return;
        const near = lines.slice(Math.max(0, i - 3), i + 4).join("\n");
        if (!/\bonClose\??\.?\(\)|\bclose\(\)|closeOverlay\(|closeWindow\(/.test(near)) return;
        if (!/expectNavigation\(/.test(lines.slice(Math.max(0, i - 6), i + 1).join("\n"))) offenders.push(`${relative(ROOT, file)}:${i + 1}`);
      });
    }
  }
  expect(offenders).toEqual([]);
});
