import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// A minified client chunk never contains Turbopack's raw import-binding name:
// every `__TURBOPACK__imported__module__<id>__` is renamed to a short local.
// One left in is a binding the bundler never declared — reading it throws
// ReferenceError at runtime. 2026-10-14 live: Next 16.4.0-canary.39 shipped
// motion/react with `"VisualElement",()=>__TURBOPACK__imported__module__60386__.F`,
// and every stored component importing motion crashed. The compile runtime now
// contains such an export (@ai-matrx/code-runtime readModuleExports); this
// names each one at build time. It reports, it does not block the release:
// the leaked export is usually never read, and holding the train on a
// bundler defect would ship nothing.
const leaked = /__TURBOPACK__imported__module__(\d+)__/g;

/** Every leaked binding in one chunk's text, with the export it serves when visible. */
export function inspectChunkText(file, text) {
  const findings = [];
  for (const match of text.matchAll(leaked)) {
    const before = text.slice(Math.max(0, match.index - 80), match.index);
    const exportName = before.match(/"([^"]+)",\(\)=>$/)?.[1] ?? null;
    findings.push({ file, moduleId: match[1], exportName });
  }
  return findings;
}

export function inspectBuild(distDir) {
  const root = resolve(distDir, "static");
  const files = readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => join(entry.parentPath, entry.name));
  if (!files.length) throw new Error(`No client chunks under ${root}; compile the application before checking.`);
  return { scanned: files.length, findings: files.flatMap((file) => inspectChunkText(relative(distDir, file), readFileSync(file, "utf8"))) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { scanned, findings } = inspectBuild(process.env.NEXT_DISTDIR || ".next");
    if (!findings.length) {
      console.log(`[turbopack-bindings] ${scanned} client chunks, no unbound import bindings.`);
    } else {
      for (const f of findings) {
        console.error(
          `[turbopack-bindings] UNBOUND ${f.file}: module ${f.moduleId}` +
            (f.exportName ? ` serves export "${f.exportName}"` : "") +
            " through a binding the bundler never declared; reading it throws ReferenceError.",
        );
      }
      console.error(`[turbopack-bindings] ${findings.length} unbound binding(s) in ${scanned} client chunks — a Turbopack codegen defect; see the comment at the top of this script.`);
    }
  } catch (error) {
    console.error(`[turbopack-bindings] ${error.message}`);
    process.exitCode = 1;
  }
}
