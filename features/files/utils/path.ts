/**
 * features/files/utils/path.ts
 *
 * Logical path helpers. Cloud-files paths are forward-slash strings like
 * "reports/2026/q1.json". Never use string-concat at callsites — go through
 * these helpers so trailing/leading slashes stay consistent.
 */

export function normalizePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
}

export function splitPath(path: string): string[] {
  const p = normalizePath(path);
  return p.length === 0 ? [] : p.split("/");
}

export function joinPath(...parts: Array<string | null | undefined>): string {
  return normalizePath(parts.filter(Boolean).join("/"));
}

export function parentPath(path: string): string {
  const parts = splitPath(path);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

export function basename(path: string): string {
  const parts = splitPath(path);
  return parts.length ? parts[parts.length - 1] : "";
}

export function extname(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx <= 0) return "";
  return filename.slice(idx + 1).toLowerCase();
}

export function stemname(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx <= 0) return filename;
  return filename.slice(0, idx);
}

/**
 * Replace the final segment of a path with `newName`. Preserves any
 * surrounding slashes. Used by rename flows.
 */
export function replaceBasename(path: string, newName: string): string {
  const parts = splitPath(path);
  if (!parts.length) return newName;
  parts[parts.length - 1] = newName;
  return parts.join("/");
}

/**
 * Ancestors of a path, ordered root → target (exclusive of target).
 * For "a/b/c" returns ["", "a", "a/b"].
 */
export function ancestorPaths(path: string): string[] {
  const parts = splitPath(path);
  const out: string[] = [""];
  for (let i = 0; i < parts.length - 1; i++) {
    out.push(parts.slice(0, i + 1).join("/"));
  }
  return out;
}
