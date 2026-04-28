"use client";

/**
 * useApplyAIPatchesToActiveTab
 *
 * Watches the agent stream for `conversationId` and, when a turn completes,
 * extracts SEARCH/REPLACE blocks from the final assistant text and stages
 * each one against whichever open editor tab it cleanly matches.
 *
 * Why per-tab matching, not per-file path:
 *   The agent does not always quote the file path in a structured way.
 *   The SEARCH text is, however, required to be unique inside the file —
 *   so we can locate the target tab by trying to apply each block to
 *   each open tab's buffer and accepting only unambiguous matches.
 *   This also handles the realistic case where the agent edits multiple
 *   open files in one turn.
 *
 * Dedup contract:
 *   The slice keys staged work by (conversationId, requestId, tabId), so
 *   re-renders, hot-reloads, or multiple consumers mounting this hook on
 *   the same surface won't double-stage. Stream-completion fires the
 *   stage call exactly once per request → tab pairing.
 *
 * UX contract:
 *   This hook only stages — it does NOT mutate tab content. Tabs that
 *   own a pending patch automatically swap from `<MonacoEditor>` to
 *   `<TabDiffView>` (Cursor-style: the file's own tab becomes the diff).
 *   Acceptance flows through the existing `updateTabContent` → save
 *   pipeline so cloud, library, sandbox, and mock filesystems all work
 *   without a special case.
 */

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectAccumulatedText,
  selectRequestStatus,
} from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";
import {
  selectIsExecuting,
  selectLatestRequestId,
} from "@/features/agents/redux/execution-system/selectors/aggregate.selectors";
import { parseCodeEdits } from "@/features/code-editor/agent-code-editor/utils/parseCodeEdits";
import { applyCodeEdits } from "@/features/code-editor/agent-code-editor/utils/applyCodeEdits";
import { selectCodeTabs, type CodeTabsState } from "../redux/tabsSlice";
import { stagePatches } from "../redux/codePatchesSlice";
import { isPreviewTab } from "../types";

interface UseApplyAIPatchesToActiveTabOptions {
  /** Conversation whose stream we observe. Pass `null` to disable. */
  conversationId: string | null | undefined;
}

interface BlockMatch {
  tabId: string;
  blockIndex: number;
  search: string;
  replace: string;
}

/**
 * Try to apply `edits` against every open tab. A tab "matches" when the
 * `applyCodeEdits` run succeeds against its buffer with at least one
 * applied edit and zero errors. We stage matched blocks per-tab.
 *
 * If a single block lands cleanly in two tabs, we conservatively skip
 * staging that block — ambiguity should never overwrite the wrong file.
 */
function locateBlocksAcrossTabs(
  tabs: CodeTabsState,
  edits: { id: string; search: string; replace: string }[],
): BlockMatch[] {
  const results: BlockMatch[] = [];
  // Try each block independently against each tab so that a single AI
  // response can target multiple files at once.
  edits.forEach((edit, blockIndex) => {
    const winners: string[] = [];
    for (const tabId of Object.keys(tabs.byId)) {
      const tab = tabs.byId[tabId];
      // Preview tabs (binary / cloud-file) have no editable buffer.
      if (isPreviewTab(tab.kind)) continue;
      const result = applyCodeEdits(tab.content, [edit]);
      if (result.success && result.appliedEdits === 1) {
        winners.push(tabId);
      }
    }
    if (winners.length === 1) {
      results.push({
        tabId: winners[0],
        blockIndex,
        search: edit.search,
        replace: edit.replace,
      });
    }
    // 0 winners → block targets a file that isn't open. Nothing to do
    // client-side; the agent's tool-call path (sandbox FS or server) is
    // the source of truth in that case, and the file-watcher will pick
    // the change up later.
    // 2+ winners → ambiguous. Skip rather than risk a wrong write.
  });
  return results;
}

export function useApplyAIPatchesToActiveTab({
  conversationId,
}: UseApplyAIPatchesToActiveTabOptions): void {
  const dispatch = useAppDispatch();
  const store = useAppStore();

  const safeConversationId = conversationId ?? "__none__";
  const isExecuting = useAppSelector(selectIsExecuting(safeConversationId));
  const requestId = useAppSelector(selectLatestRequestId(safeConversationId));
  const requestStatus = useAppSelector(
    requestId ? selectRequestStatus(requestId) : () => undefined,
  );
  const streamingText = useAppSelector(
    requestId ? selectAccumulatedText(requestId) : () => "",
  );

  // Latest-value refs so the stream-end effect reads the final text
  // without being a dependency on every token.
  const streamingTextRef = useRef(streamingText);
  streamingTextRef.current = streamingText;

  // Track which (conversationId, requestId) pairs we've handled at the
  // hook layer so we don't re-run the parser if the slice's seenKey
  // mechanism is bypassed by a remount.
  const handledRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!conversationId || !requestId) return;
    if (isExecuting) return;
    if (requestStatus !== "complete") return;

    const handledKey = `${conversationId}::${requestId}`;
    if (handledRef.current.has(handledKey)) return;
    handledRef.current.add(handledKey);

    const finalText = streamingTextRef.current;
    if (!finalText || finalText.length === 0) return;

    const parsed = parseCodeEdits(finalText);
    if (!parsed.success || parsed.edits.length === 0) return;

    // Read tabs at stream-end time — not via subscription — so the
    // matcher sees the freshest buffers and the effect doesn't refire
    // when the user types during the next turn.
    const state = store.getState() as { codeTabs: CodeTabsState };
    const tabs = selectCodeTabs(state);

    const matches = locateBlocksAcrossTabs(tabs, parsed.edits);

    // Group matches by tabId so we make one dispatch per tab. The slice
    // keys dedupe by (conversation, request, tab) — multiple blocks
    // landing on the same tab share one stage key.
    const byTab = new Map<
      string,
      Array<{ search: string; replace: string; blockIndex: number }>
    >();
    for (const match of matches) {
      const list = byTab.get(match.tabId) ?? [];
      list.push({
        search: match.search,
        replace: match.replace,
        blockIndex: match.blockIndex,
      });
      byTab.set(match.tabId, list);
    }

    for (const [tabId, patches] of byTab.entries()) {
      dispatch(
        stagePatches({
          tabId,
          conversationId,
          requestId,
          patches,
        }),
      );
    }
  }, [conversationId, requestId, requestStatus, isExecuting, dispatch, store]);
}
