"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import type { FilesystemAdapter, ProcessAdapter } from "./adapters";
import { MockFilesystemAdapter, MockProcessAdapter } from "./adapters";

/** What consumers of the workspace context can read + mutate. */
export interface CodeWorkspaceContextValue {
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
  /** Initial filesystem adapter. Defaults to the MockFilesystemAdapter. */
  initialFilesystem?: FilesystemAdapter;
  /** Initial process adapter. Defaults to a mock echo adapter. */
  initialProcess?: ProcessAdapter;
  children: React.ReactNode;
}

export const CodeWorkspaceProvider: React.FC<CodeWorkspaceProviderProps> = ({
  initialFilesystem,
  initialProcess,
  children,
}) => {
  const [filesystem, setFilesystem] = useState<FilesystemAdapter>(
    () => initialFilesystem ?? new MockFilesystemAdapter(),
  );
  const [process, setProcess] = useState<ProcessAdapter>(
    () => initialProcess ?? new MockProcessAdapter(),
  );

  const value = useMemo<CodeWorkspaceContextValue>(
    () => ({ filesystem, process, setFilesystem, setProcess }),
    [filesystem, process],
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
