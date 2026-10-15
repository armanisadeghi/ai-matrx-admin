/**
 * Pure source reader for the web app's `ai-matrx` app_config reads (kept free of git/fs so a unit
 * test can import it; scripts/config-attestation/lib.ts re-exports it).
 */
import type { DynamicRead, SourceFile } from "../settings-guards/lib";

/**
 * App-config reads: `readAppConfigKey("credential_maintenance")` and `readAppFlag("name")`
 * and `useAppFlag("name")` (key `flags.name`) — the only doors code has to the `ai-matrx` row
 * (lib/config-attestation/appConfig.ts). A computed argument is listed, never guessed.
 */
export function appConfigReads(files: SourceFile[]): {
  keys: Map<string, Set<string>>;
  dynamic: DynamicRead[];
} {
  const keys = new Map<string, Set<string>>();
  const dynamic: DynamicRead[] = [];
  const re = /\b(readAppConfigKey|readAppFlag|useAppFlag)\s*(?:<[^>()]*>)?\s*\(\s*([^,)]+?)\s*[,)]/g;
  for (const f of files) {
    if (!/(?:readApp(?:ConfigKey|Flag)|useAppFlag)/.test(f.text) || /(?:lib\/config-attestation\/appConfig\.ts|components\/config-attestation\/useAppFlag\.ts)$/.test(f.rel)) continue;
    re.lastIndex = 0;
    for (let m = re.exec(f.text); m; m = re.exec(f.text)) {
      const before = f.text.slice(Math.max(0, m.index - 24), m.index);
      if (/\bfunction\s+$/.test(before)) continue;
      const lit = /^["']([\w.]+)["']$/.exec(m[2].trim());
      const line = f.text.slice(0, m.index).split("\n").length;
      if (!lit) {
        dynamic.push({ file: f.rel, line, fn: m[1], raw: m[2].trim(), why: "app-config key is computed at run time" });
        continue;
      }
      const key = m[1] !== "readAppConfigKey" ? `flags.${lit[1]}` : lit[1];
      keys.set(key, (keys.get(key) ?? new Set()).add(f.rel));
    }
  }
  return { keys, dynamic };
}

