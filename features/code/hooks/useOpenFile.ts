"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useCodeWorkspace } from "../CodeWorkspaceProvider";
import { openTab } from "../redux";
import { languageFromFilename } from "../styles/file-icon";

/**
 * Returns a callback that opens a file from the active filesystem adapter
 * into a new (or existing) editor tab.
 */
export function useOpenFile() {
  const dispatch = useAppDispatch();
  const { filesystem } = useCodeWorkspace();

  return useCallback(
    async (path: string) => {
      const name = path.split("/").pop() ?? path;
      const content = await filesystem.readFile(path);
      const id = `${filesystem.id}:${path}`;
      dispatch(
        openTab({
          id,
          path,
          name,
          language: languageFromFilename(name),
          content,
          pristineContent: content,
        }),
      );
    },
    [dispatch, filesystem],
  );
}
