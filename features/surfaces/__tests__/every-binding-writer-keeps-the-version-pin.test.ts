/**
 * EVERY BINDING WRITER KEEPS THE VERSION PIN (L6 defect 12, 2026-10-17).
 *
 * A surface binding's payload (`surface_binding` v5) is REPLACED WHOLESALE on
 * every save. `agent_version_id` is the pin a binding launches (the Notes
 * "Agents for this page" binding is pinned to its v3); a writer that saves
 * mappings, policies or auto-run without carrying `agentVersionId` silently
 * unpins the binding, and the next run uses the live agent.
 *
 * So every call that writes a binding payload — the thunk, the service, the
 * bind panel's direct call, the batch editor's per-surface payload — must name
 * `agentVersionId`. A new writer that forgets it fails here.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const WRITERS = [
  "upsertAgentSurfaceBindingThunk(",
  "upsertAgentSurfaceBinding(",
  "bindAgentToSurface(",
];

function callBody(src: string, start: number): string {
  let depth = 0;
  for (let i = src.indexOf("(", start); i < src.length; i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")" && --depth === 0) return src.slice(start, i + 1);
  }
  return src.slice(start);
}

function writerFiles(): string[] {
  const out = execSync(
    `git grep -l -e "upsertAgentSurfaceBindingThunk(" -e "upsertAgentSurfaceBinding(" -e "bindAgentToSurface(" -e "bulkUpsertAgentSurfaceBindingsThunk(" -- '*.ts' '*.tsx' ':!**/__tests__/**'`,
    { cwd: ROOT, encoding: "utf8" },
  );
  return out.split("\n").filter(Boolean);
}

describe("every surface-binding writer carries agentVersionId", () => {
  const files = writerFiles();

  it("finds the writers", () => {
    expect(files.length).toBeGreaterThanOrEqual(6);
  });

  it.each(writerFiles())("%s", (file) => {
    const src = readFileSync(path.join(ROOT, file), "utf8");
    const missing: string[] = [];
    for (const name of WRITERS) {
      let at = src.indexOf(name);
      while (at !== -1) {
        // Skip imports / the declaration itself.
        const lineStart = src.lastIndexOf("\n", at) + 1;
        const line = src.slice(lineStart, src.indexOf("\n", at));
        if (!/^\s*(import|export|\*|\/\/)/.test(line) && !/function\s/.test(line)) {
          const body = callBody(src, at);
          if (!body.includes("agentVersionId")) {
            missing.push(`${name} at line ${src.slice(0, at).split("\n").length}`);
          }
        }
        at = src.indexOf(name, at + name.length);
      }
    }
    if (src.includes("bulkUpsertAgentSurfaceBindingsThunk(") && !src.includes("agentVersionId:")) {
      missing.push("bulk payload has no agentVersionId");
    }
    expect(missing).toEqual([]);
  });
});
