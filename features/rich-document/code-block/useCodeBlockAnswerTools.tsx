"use client";

// features/rich-document/code-block/useCodeBlockAnswerTools.tsx
//
// The code-block host half of RC-B9: resolves the registry's `code-block-*`
// actions for one block (Open in code editor · Apply to <file> · Run · Chart)
// into CodeBlock's existing `extraMenuItems` slot, and renders what those
// actions produce UNDER the block (run output, CSV chart). CodeBlock itself is
// untouched — the wrapper that already injects "Add to conversation context"
// mounts this.
//
// The registry bridge loads after the stream settles (never in an answer's
// first paint); until then the block shows its own built-in menu.

import React, { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import type { MenuItem } from "@/components/official/AdvancedMenu";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { TableChartPanel } from "@ai-matrx/rich-content/display/blocks/chart/TableChart";
import { parseDelimitedTable } from "@ai-matrx/rich-content/display/blocks/chart/table-chart";
import type { CodeRunState } from "./code-block-context";
// The run output under a code block is the package's panel (one copy for every host).
import { CodeRunOutput } from "@ai-matrx/rich-content/code-block/CodeRunOutput";

type Bridge = typeof import("./code-block-registry-bridge");

/** The tools chunk failed to load and the person was told (once per page). */
let answerToolsFailureAnnounced = false;

export function useCodeBlockAnswerTools(args: {
  code: string;
  language: string;
  conversationId?: string | null;
  messageId?: string | null;
  isStreamActive?: boolean;
}): { items: MenuItem[]; panel: React.ReactNode } {
  const { code, language, conversationId, messageId, isStreamActive } = args;
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const isAuthenticated = useAppSelector((s) => Boolean(s.userAuth?.id));
  const organizationId = useAppSelector(selectOrganizationId);
  // Visibility inputs — re-resolve when a file tab opens or a sandbox binds.
  useAppSelector((s) => (s as unknown as { codeTabs?: { activeId: string | null } }).codeTabs?.activeId ?? null);
  useAppSelector((s) =>
    conversationId ? (s.conversations.byConversationId[conversationId]?.sandboxBinding?.rowId ?? null) : null,
  );

  const [bridge, setBridge] = useState<Bridge | null>(null);
  const [run, setRun] = useState<CodeRunState | null>(null);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    if (isStreamActive || bridge) return;
    let live = true;
    import("./code-block-registry-bridge")
      .then((m) => {
        if (live) setBridge(m);
      })
      .catch((err: unknown) => {
        console.error("[code-block] answer tools failed to load", err);
        // Every code block on the page shares this chunk: say it once, not per block.
        if (!answerToolsFailureAnnounced) {
          answerToolsFailureAnnounced = true;
          toast.error("Code block tools (run, chart, copy for AI) couldn't load — reload the page to get them back.");
        }
      });
    return () => {
      live = false;
    };
  }, [isStreamActive, bridge]);

  const items =
    bridge && !isStreamActive
      ? bridge.resolveCodeBlockMenuItems(
          bridge.codeBlockContext({
            facts: {
              code,
              language,
              conversationId: conversationId ?? null,
              messageId: messageId ?? null,
              onRunResult: setRun,
              onToggleChart: () => setShowChart((v) => !v),
            },
            dispatch,
            getState: store.getState,
            isAuthenticated,
            organizationId,
          }),
        )
      : [];

  const table = showChart ? parseDelimitedTable(code) : null;

  const panel = (
    <>
      {table && <TableChartPanel table={table} onClose={() => setShowChart(false)} />}
      {run && <CodeRunOutput state={run} onClose={() => setRun(null)} />}
    </>
  );
  return { items, panel };
}
