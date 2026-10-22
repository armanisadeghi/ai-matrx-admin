/**
 * Surface manifest — My memory (`/memory/my-memory`, `matrx-user/my-memory`).
 *
 * The person's memory files (`users.user_memory`): small text files their
 * agents read and write in every sandbox. Emitter + handlers:
 * `features/memory/components/MemoryManager.tsx` when mounted with `asSurface`
 * (the page; the Settings tab renders the same editor without this surface).
 *
 * Writes go through the editor's own saves (`upsertMemory`, `deleteMemory`).
 * Removing a file moves it to Trash; it can be restored from /memory/trash.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const MY_MEMORY_SURFACE_NAME = "matrx-user/my-memory" as const;

/** The editor's own path rule (`MemoryManager`): letters, digits, `.`, `_`, `-`, `/`; no leading slash, no `..`. */
const PATH_RE = /^[A-Za-z0-9._/-]+$/;
export const MEMORY_FILE_MAX_CHARS = 100_000;

const groups: SurfaceValueGroup[] = [
  { key: "memory_files", label: "Memory files", sortOrder: 100, description: "Every memory file the person has." },
  { key: "memory_editor", label: "Open file", sortOrder: 200, description: "The file open in the editor." },
];

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  group: string,
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("load_status", "Load status", "string", "memory_files", 100, '"loading", "loaded" or "failed" (the list could not be read).', {
    alwaysAvailable: true,
    typicalCharCount: 8,
  }),
  v("memory_file_count", "Files", "number", "memory_files", 110, "How many memory files the person has."),
  v("memory_files", "Memory files", "array", "memory_files", 120, "Every file: { path, chars, updated_at }. Contents are not listed; the open file's text is open_file_content.", {
    typicalCharCount: 600,
  }),
  v("open_file_path", "Open file", "string", "memory_editor", 200, "The path of the file open in the editor. Empty when none is open."),
  v("open_file_content", "Open file text", "string", "memory_editor", 210, "The editor's current text for the open file, including unsaved edits.", {
    typicalCharCount: 1500,
    inlineUpTo: 6000,
  }),
  v("is_new_file", "New file", "boolean", "memory_editor", 220, "True while the editor holds a new, unsaved file."),
  v("unsaved_changes", "Unsaved changes", "boolean", "memory_editor", 230, "True when the editor's text differs from the saved file."),
];

const fileShape =
  '{ "path": string (letters, digits, ".", "_", "-", "/"; no leading "/" or ".."; e.g. "preferences.md"), "content": string }';

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "open_file_content",
    label: "Open file text",
    description:
      "Replaces the text in the editor for the open file. NOTHING is saved: the person presses Save. Value: a plain string. Refused when no file is open.",
    valueType: "string",
    patchable: true,
    approvalComparison: "text-replacement",
    updatesValue: "open_file_content",
    mode: "draft",
    applyPolicy: "ask",
    group: "memory_editor",
    sortOrder: 300,
  },
  {
    name: "create_memory_files",
    label: "Add memory files",
    description: `Adds new memory files. SAVED after the person approves. Value: a JSON ARRAY of 1-25 objects, each ${fileShape}. Refused (nothing saved): a path already in memory_files, an invalid path, a path twice in the list, content over ${MEMORY_FILE_MAX_CHARS} characters.`,
    valueType: "array",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "memory_files",
    group: "memory_files",
    sortOrder: 310,
  },
  {
    name: "update_memory_files",
    label: "Rewrite memory files",
    description: `Replaces the whole text of existing memory files. SAVED after the person approves. Value: a JSON ARRAY of 1-25 objects, each ${fileShape}; "content" REPLACES the file, so include everything to keep. Refused (nothing saved): a path not in memory_files, a path twice, content over ${MEMORY_FILE_MAX_CHARS} characters.`,
    valueType: "array",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "memory_files",
    group: "memory_files",
    sortOrder: 320,
  },
  {
    name: "delete_memory_files",
    label: "Move memory files to Trash",
    description:
      'Moves memory files to Trash: agents stop reading them in new sandboxes; the person can restore them from Trash. Value: a JSON ARRAY of 1-25 paths (or { "path" } objects) from memory_files. Refused (nothing moved): an unknown path or a path twice.',
    valueType: "array",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "memory_files",
    group: "memory_files",
    sortOrder: 330,
  },
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: MY_MEMORY_SURFACE_NAME,
  situation:
    "They are managing the memory files their agents read in every sandbox: {memory_file_count|no} files, open: {open_file_path|none}.",
  inheritsFrom: "matrx-default/knowledge",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "My memory",
  description: "The person's memory files: notes their agents read and write in every sandbox.",
  urlPattern: "/memory/my-memory",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const myMemoryManifest = declared;

export function createMyMemoryScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}

// ── Pure parsers for the list targets (also run again at apply time) ─────────

export interface MemoryFileWrite {
  path: string;
  content: string;
}

export function validMemoryPath(path: string): boolean {
  return PATH_RE.test(path) && !path.startsWith("/") && !path.includes("..");
}

function asList(value: unknown): unknown[] {
  const list =
    value !== null && typeof value === "object" && !Array.isArray(value) && Array.isArray((value as { files?: unknown }).files)
      ? (value as { files: unknown[] }).files
      : value;
  if (!Array.isArray(list)) throw new Error("Send a JSON array.");
  if (!list.length) throw new Error("Send at least one item.");
  if (list.length > 25) throw new Error("At most 25 items per write.");
  return list;
}

function refuseRepeatedPaths(paths: string[]): void {
  const seen = new Set<string>();
  for (const p of paths) {
    if (seen.has(p)) throw new Error(`"${p}" is listed twice. Nothing was changed.`);
    seen.add(p);
  }
}

export function parseMemoryFileWrites(
  value: unknown,
  existingPaths: readonly string[],
  mode: "create" | "update",
): MemoryFileWrite[] {
  const items = asList(value).map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) throw new Error(`Item ${index + 1} must be an object.`);
    const { path, content } = item as Record<string, unknown>;
    if (typeof path !== "string" || !validMemoryPath(path.trim())) {
      throw new Error(`Item ${index + 1}: "path" must be a relative file path like "preferences.md".`);
    }
    if (typeof content !== "string") throw new Error(`Item ${index + 1}: "content" must be a string.`);
    if (content.length > MEMORY_FILE_MAX_CHARS) throw new Error(`Item ${index + 1}: content is over ${MEMORY_FILE_MAX_CHARS} characters.`);
    const p = path.trim();
    const exists = existingPaths.includes(p);
    if (mode === "create" && exists) throw new Error(`"${p}" already exists: use update_memory_files.`);
    if (mode === "update" && !exists) throw new Error(`"${p}" is not in memory_files: use create_memory_files.`);
    return { path: p, content };
  });
  refuseRepeatedPaths(items.map((i) => i.path));
  return items;
}

export function parseMemoryFileDeletes(value: unknown, existingPaths: readonly string[]): string[] {
  const paths = asList(value).map((item, index) => {
    const p = typeof item === "string" ? item : (item as { path?: unknown } | null)?.path;
    if (typeof p !== "string" || !existingPaths.includes(p.trim())) {
      throw new Error(`Item ${index + 1} is not a path in memory_files.`);
    }
    return p.trim();
  });
  refuseRepeatedPaths(paths);
  return paths;
}
