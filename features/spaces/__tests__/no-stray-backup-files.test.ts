/** A leftover `.bak` / `.orig` copy of a source file inside the Spaces fence (database-host.tsx.bak was swept into git). */
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

function strays(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) strays(p, out);
    else if (/\.(bak|orig|rej|swp)$|~$/.test(name)) out.push(p);
  }
  return out;
}

it("the Spaces fence holds no backup copies of files", () => {
  const root = resolve(__dirname, "../../..");
  const found = ["features/spaces", "app/(core)/spaces", "lib/spaces-blocks"].flatMap((d) => strays(join(root, d)));
  expect(found).toEqual([]);
});
