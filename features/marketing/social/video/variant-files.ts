/**
 * Which finished file belongs to which variant. The server lists a project's finished files without saying which
 * variant made them, so the studio remembers (per project, on this device) what it saw render, and the Finished
 * list names each download from that. A file it never saw render still gets its own name (never the same as another).
 */

import { downloadName } from "./estimate";

const KEY = (projectId: string) => `video-variant-files:${projectId}`;

export type VariantFileMap = Record<string, string>;

export function readVariantFiles(projectId: string, storage: Pick<Storage, "getItem"> | null = safeStorage()): VariantFileMap {
  try {
    const raw = storage?.getItem(KEY(projectId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as VariantFileMap) : {};
  } catch {
    return {};
  }
}

export function rememberVariantFile(projectId: string, fileId: string, label: string, storage: Pick<Storage, "getItem" | "setItem"> | null = safeStorage()): void {
  if (!fileId || !label) return;
  try {
    storage?.setItem(KEY(projectId), JSON.stringify({ ...readVariantFiles(projectId, storage), [fileId]: label }));
  } catch {
    // Storage full or blocked: the download falls back to a unique name.
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The download name of one row of the Finished list: the variant's label when known, else the version, always made
 * unique among `taken` by the file's own id so two downloads never share a name.
 */
export function finishedDownloadName(projectName: string, row: { fileId: string; version: number | null }, labels: VariantFileMap, taken: Set<string>): string {
  const label = labels[row.fileId];
  const base = label ? `${projectName} ${label}` : `${projectName}${row.version !== null ? ` v${row.version}` : ""}`;
  let name = downloadName(base);
  if (taken.has(name)) name = downloadName(`${base} ${row.fileId.slice(0, 6)}`);
  taken.add(name);
  return name;
}
