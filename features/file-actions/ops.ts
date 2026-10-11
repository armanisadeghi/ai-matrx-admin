/**
 * The ONE implementation of each file operation (copy, move, trash, restore,
 * download). Lists and editors call these; neither re-implements them. Every
 * failure is said (toast.error) and returned as `false`/`null` — never silent.
 */

import { toast } from "@/lib/toast";
import { isServiceFailure } from "@/features/data-tables/types";
import type { FileKindAdapter } from "./types";

type Adapter = FileKindAdapter<{ id: string; user_id: string }>;

function fail(adapter: Pick<Adapter, "noun">, what: string, error: string): void {
  toast.error(`Could not ${what} this ${adapter.noun}`, { description: error });
}

export async function restoreRecord(adapter: Adapter, id: string, name: string): Promise<boolean> {
  const res = await adapter.restore(id);
  if (isServiceFailure(res)) {
    fail(adapter, "restore", res.error);
    return false;
  }
  toast.success(`Restored "${name}"`);
  return true;
}

/** Trash with an Undo toast. `onRestored` runs only when the restore really succeeded. */
export async function trashRecord(
  adapter: Adapter,
  id: string,
  name: string,
  hooks: { onTrashed?: () => void; onRestored?: () => void } = {},
): Promise<boolean> {
  const res = await adapter.trash(id);
  if (isServiceFailure(res)) {
    fail(adapter, "move to trash", res.error);
    return false;
  }
  toast.success(`Moved "${name}" to trash`, {
    action: {
      label: "Undo",
      onClick: () => void restoreRecord(adapter, id, name).then((ok) => ok && hooks.onRestored?.()),
    },
  });
  hooks.onTrashed?.();
  return true;
}

/** Returns the new record's id, or null after saying why not. */
export async function copyRecord(
  adapter: Adapter,
  id: string,
  name: string,
  onOpen?: (newId: string) => void,
): Promise<string | null> {
  const res = await adapter.copy(id, `Copy of ${name}`);
  if (isServiceFailure(res)) {
    fail(adapter, "copy", res.error);
    return null;
  }
  toast.success("Copy created", {
    ...(onOpen ? { action: { label: "Open", onClick: () => onOpen(res.data.id) } } : {}),
  });
  return res.data.id;
}

export async function moveRecord(
  adapter: Adapter,
  id: string,
  projectId: string | null,
  projectName: string | null,
): Promise<boolean> {
  const res = await adapter.move(id, projectId);
  if (isServiceFailure(res)) {
    fail(adapter, "move", res.error);
    return false;
  }
  toast.success(projectId ? `Moved to ${projectName ?? "the project"}` : "Removed from its project");
  return true;
}

export async function renameRecord(adapter: Adapter, id: string, name: string): Promise<boolean> {
  const res = await adapter.rename(id, name);
  if (isServiceFailure(res)) {
    fail(adapter, "rename", res.error);
    return false;
  }
  return true;
}

/** Runs one download; a thrown reason is reported, never swallowed. */
export async function runDownload(
  adapter: Pick<Adapter, "noun">,
  download: { label: string; run: () => Promise<void> },
): Promise<void> {
  try {
    await download.run();
  } catch (err) {
    fail(adapter, `download (${download.label})`, err instanceof Error ? err.message : String(err));
  }
}
