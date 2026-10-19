import { peekHandle, registerHandleEntry, unregisterHandleEntry } from "@ai-matrx/summon/open";
import type { AppStore } from "@/lib/redux/store";
import type { FilesystemAdapter } from "../adapters/FilesystemAdapter";
import type { ProcessAdapter } from "../adapters/ProcessAdapter";

/**
 * Handle to an active `<CodeWorkspace>` instance. Lets non-React call-sites (agent tools,
 * server-action consumers, keyboard shortcut handlers) drive the same filesystem + process
 * adapters the UI is using — including pushing lines into the Redux-backed terminal log so users
 * can see what the agent is doing.
 *
 * Stored in summon's ONE handle registry (`@ai-matrx/summon/open` light entries: an object handle
 * under a fixed id), not a module Map of its own (adversarial review 2026-10-18, D-5).
 */
export interface WorkspaceRuntimeHandle {
  /** Stable workspace id. `"default"` for the single-instance route. */
  id: string;
  filesystem: FilesystemAdapter;
  process: ProcessAdapter;
  /** App Redux store — used to dispatch terminal lines / open files. */
  store: AppStore;
}

export const DEFAULT_WORKSPACE_ID = "default";

/** The handle-registry group every workspace joins (list it with summon's `groupMembers`). */
export const WORKSPACE_HANDLE_GROUP = "code-workspaces";
const HANDLE_PREFIX = "code-workspace:";
const handleId = (workspaceId: string) => `${HANDLE_PREFIX}${workspaceId}`;

/** Workspace ids from the group's handle ids. */
export function workspaceIdsFromHandleIds(handleIds: readonly string[]): string[] {
  return handleIds.filter((id) => id.startsWith(HANDLE_PREFIX)).map((id) => id.slice(HANDLE_PREFIX.length));
}

/** Register (or replace) a workspace handle. Returns an unregister function. */
export function registerWorkspace(handle: WorkspaceRuntimeHandle): () => void {
  const id = registerHandleEntry(handle, { id: handleId(handle.id), groupId: WORKSPACE_HANDLE_GROUP });
  return () => {
    // a newer mount under the same workspace id replaced this one: leave it registered
    if (peekHandle<WorkspaceRuntimeHandle>(id) === handle) unregisterHandleEntry(id);
  };
}

/** Lookup a registered workspace. Throws if none found. */
export function getWorkspace(id: string = DEFAULT_WORKSPACE_ID): WorkspaceRuntimeHandle {
  const handle = tryGetWorkspace(id);
  if (!handle) {
    throw new Error(
      `[code/runtime] No workspace registered for id "${id}". Mount a <CodeWorkspace workspaceId="${id}" /> first.`,
    );
  }
  return handle;
}

/** Non-throwing lookup. */
export function tryGetWorkspace(id: string = DEFAULT_WORKSPACE_ID): WorkspaceRuntimeHandle | null {
  return peekHandle<WorkspaceRuntimeHandle>(handleId(id)) ?? null;
}
