/**
 * /notes FIRST PAINT READS ONLY WHAT IT SHOWS: the scope tree (context_tree) is loaded by a picker
 * or the agent surface when it is actually used — never by the page mounting. The sidebar, global
 * find and the agent surface name homes through `useNoteHomeNames` (one `platform.home_names` read,
 * coalesced across mounts); the tree loads only through `engage()` / `homesWhenLoaded()`.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

test.each([
  "hooks/useGlobalFind.ts",
  "hooks/useNotesSurfaceScope.ts",
  "agent-context/useNotesSurfaceRuntime.ts",
])("%s does not mount the whole-tree home hook", (file) => {
  expect(read(file)).not.toMatch(/\buseNoteHomes\s*\(/);
});

test("NotesView does not dispatch ensureScopeTree on mount", () => {
  const src = read("components/NotesView.tsx");
  // The one remaining dispatch is the explicit Refresh (`{ refresh: true }`).
  const calls = src.match(/ensureScopeTree\(([^)]*)\)/g) ?? [];
  expect(calls.filter((c) => !c.includes("refresh: true"))).toEqual([]);
});

test("every mount's home-name ask goes through the one coalescing queue", () => {
  const src = read("homes/useNoteHomes.ts");
  expect(src.match(/rpc\("home_names"/g)?.length).toBe(1);
  expect(src).toMatch(/queueHomeNames\(missing/);
});
