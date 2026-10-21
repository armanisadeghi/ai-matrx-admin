/**
 * Does an `@ai-matrx/<pkg>[/subpath]` specifier resolve against the INSTALLED package?
 * A bare package is real when its directory exists; a subpath is real only when the
 * package.json `exports` map ships it (exact key, or a `*` pattern key that matches).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function resolvesInstalledAiMatrxSpecifier(
  spec: string,
  repoRoot: string,
): boolean {
  const m = /^@ai-matrx\/([^/]+)(?:\/(.+))?$/.exec(spec);
  if (!m) return false;
  const pkgDir = join(repoRoot, "node_modules", "@ai-matrx", m[1]);
  if (!existsSync(pkgDir)) return false;
  if (!m[2]) return true;
  let exportsMap: Record<string, unknown> | undefined;
  try {
    const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
    exportsMap = typeof pkg.exports === "object" ? pkg.exports : undefined;
  } catch {
    return false;
  }
  if (!exportsMap) return false;
  const sub = `./${m[2]}`;
  for (const key of Object.keys(exportsMap)) {
    if (key === sub) return true;
    const star = key.indexOf("*");
    if (star === -1) continue;
    const head = key.slice(0, star);
    const tail = key.slice(star + 1);
    if (
      sub.length >= head.length + tail.length &&
      sub.startsWith(head) &&
      sub.endsWith(tail)
    )
      return true;
  }
  return false;
}
