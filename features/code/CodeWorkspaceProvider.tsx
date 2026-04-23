"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { FilesystemAdapter, ProcessAdapter } from "./adapters";
import { MockFilesystemAdapter, MockProcessAdapter } from "./adapters";
import { DEFAULT_WORKSPACE_ID, registerWorkspace } from "./runtime";

/** What consumers of the workspace context can read + mutate. */
export interface CodeWorkspaceContextValue {
  /** Stable workspace id — used by agent tools to target this instance. */
  workspaceId: string;
  filesystem: FilesystemAdapter;
  process: ProcessAdapter;
  /** Swap the active adapter at runtime — used by the Sandboxes view. */
  setFilesystem: (adapter: FilesystemAdapter) => void;
  setProcess: (adapter: ProcessAdapter) => void;
}

const CodeWorkspaceContext = createContext<CodeWorkspaceContextValue | null>(
  null,
);

export interface CodeWorkspaceProviderProps {
  /** Stable workspace id. Defaults to `"default"` — override if you need to
   *  host multiple workspaces in the same page and target them independently
   *  from agent tools. */
  workspaceId?: string;
  /** Initial filesystem adapter. Defaults to the MockFilesystemAdapter. */
  initialFilesystem?: FilesystemAdapter;
  /** Initial process adapter. Defaults to a mock echo adapter. */
  initialProcess?: ProcessAdapter;
  children: React.ReactNode;
}

export const CodeWorkspaceProvider: React.FC<CodeWorkspaceProviderProps> = ({
  workspaceId = DEFAULT_WORKSPACE_ID,
  initialFilesystem,
  initialProcess,
  children,
}) => {
  const store = useAppStore();
  const [filesystem, setFilesystem] = useState<FilesystemAdapter>(
    () => initialFilesystem ?? new MockFilesystemAdapter(),
  );
  const [process, setProcess] = useState<ProcessAdapter>(
    () => initialProcess ?? new MockProcessAdapter(),
  );

  useEffect(() => {
    const unregister = registerWorkspace({
      id: workspaceId,
      filesystem,
      process,
      store,
    });
    return unregister;
  }, [workspaceId, filesystem, process, store]);

  const value = useMemo<CodeWorkspaceContextValue>(
    () => ({ workspaceId, filesystem, process, setFilesystem, setProcess }),
    [workspaceId, filesystem, process],
  );

  return (
    <CodeWorkspaceContext.Provider value={value}>
      {children}
    </CodeWorkspaceContext.Provider>
  );
};

export function useCodeWorkspace(): CodeWorkspaceContextValue {
  const ctx = useContext(CodeWorkspaceContext);
  if (!ctx) {
    throw new Error(
      "useCodeWorkspace must be used inside <CodeWorkspaceProvider>",
    );
  }
  return ctx;
}
