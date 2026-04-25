"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useCodeWorkspace } from "../CodeWorkspaceProvider";
import {
  appendLine,
  appendLines,
  pushHistory,
  selectTerminalExecuting,
  setExecuting,
} from "../redux/terminalSlice";

/**
 * Drives a single "terminal tab" session against the workspace's ProcessAdapter.
 * Append-only: we never mutate past lines.
 */
export function useTerminalSession() {
  const dispatch = useAppDispatch();
  const { process } = useCodeWorkspace();
  const executing = useAppSelector(selectTerminalExecuting);

  const run = useCallback(
    async (command: string) => {
      const trimmed = command.trim();
      if (!trimmed) return;
      dispatch(pushHistory(trimmed));
      dispatch(
        appendLine({
          type: "command",
          text: trimmed,
          tab: "terminal",
          cwd: process.cwd,
        }),
      );
      dispatch(setExecuting(true));
      try {
        const result = await process.exec(trimmed);
        const out = [
          ...(result.stdout
            ? [
                {
                  type: "stdout" as const,
                  text: result.stdout,
                  tab: "terminal" as const,
                },
              ]
            : []),
          ...(result.stderr
            ? [
                {
                  type: "stderr" as const,
                  text: result.stderr,
                  tab: "terminal" as const,
                },
              ]
            : []),
          {
            type: "info" as const,
            text: `Exit ${result.exitCode}`,
            exitCode: result.exitCode,
            cwd: result.cwd,
            tab: "terminal" as const,
          },
        ];
        if (out.length) dispatch(appendLines(out));
      } catch (err) {
        dispatch(
          appendLine({
            type: "stderr",
            text: err instanceof Error ? err.message : String(err),
            tab: "terminal",
          }),
        );
      } finally {
        dispatch(setExecuting(false));
      }
    },
    [dispatch, process],
  );

  return { run, executing, cwd: process.cwd, isReady: process.isReady };
}
