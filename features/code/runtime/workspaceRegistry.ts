import type { AppStore } from "@/lib/redux/store";
import type { FilesystemAdapter } from "../adapters/FilesystemAdapter";
import type { ProcessAdapter } from "../adapters/ProcessAdapter";

/**
 * Module-level handle to an active `<CodeWorkspace>` instance. Lets non-React
 * call-sites (agent tools, server-action consumers, keyboard shortcut
 * handlers) drive the same filesystem + process adapters the UI is using —
 * including pushing lines into the Redux-backed terminal log so users can
 * see what the agent is doing.
 */
export interface WorkspaceRuntimeHandle {
  /** Stable workspace id. `"default"` for the single-instance route. */
  id: string;
  filesystem: FilesystemAdapter;
  process: ProcessAdapter;
  /** App Redux store — used to dispatch terminal lines / open files. */
  store: AppStore;
}

type Listener = (handle: WorkspaceRuntimeHandle | null) => void;

const handles = new Map<string, WorkspaceRuntimeHandle>();
const listeners = new Map<string, Set<Listener>>();

export const DEFAULT_WORKSPACE_ID = "default";

/** Register (or replace) a workspace handle. Returns an unregister function. */
export function registerWorkspace(handle: WorkspaceRuntimeHandle): () => void {
  handles.set(handle.id, handle);
  const subs = listeners.get(handle.id);
  if (subs) subs.forEach((fn) => fn(handle));
  return () => {
    if (handles.get(handle.id) === handle) {
      handles.delete(handle.id);
      const s = listeners.get(handle.id);
      if (s) s.forEach((fn) => fn(null));
    }
  };
}

/** Lookup a registered workspace. Throws if none found. */
export function getWorkspace(
  id: string = DEFAULT_WORKSPACE_ID,
): WorkspaceRuntimeHandle {
  const handle = handles.get(id);
  if (!handle) {
    throw new Error(
      `[code/runtime] No workspace registered for id "${id}". Mount a <CodeWorkspace workspaceId="${id}" /> first.`,
    );
  }
  return handle;
}

/** Non-throwing lookup. */
export function tryGetWorkspace(
  id: string = DEFAULT_WORKSPACE_ID,
): WorkspaceRuntimeHandle | null {
  return handles.get(id) ?? null;
}

export function listWorkspaceIds(): string[] {
  return Array.from(handles.keys());
}

/** Subscribe to a specific workspace id (also fires with `null` on unregister). */
export function subscribeWorkspace(
  id: string,
  fn: Listener,
): () => void {
  let subs = listeners.get(id);
  if (!subs) {
    subs = new Set();
    listeners.set(id, subs);
  }
  subs.add(fn);
  fn(handles.get(id) ?? null);
  return () => {
    subs!.delete(fn);
    if (subs!.size === 0) listeners.delete(id);
  };
}
