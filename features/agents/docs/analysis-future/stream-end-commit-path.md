Now I have the complete picture. Here's the full trace of all three paths.

---

## 1. The Commit Path: `activeRequests` → `instanceConversationHistory`

The commit happens at the end of `processStream()` in `process-stream.ts`. After the NDJSON stream loop finishes:

**Step 1 — Finalize accumulated text** (lines 751-752):

```766:782:features/agents/redux/execution-system/thunks/process-stream.ts
  const finalState = getState();
  const finalRequest = finalState.activeRequests.byRequestId[requestId];
  const completedText = finalRequest?.accumulatedText ?? "";
  const finalConversationId =
    finalRequest?.serverConversationId ?? streamServerConversationId ?? null;
  const finalErrorMessage =
    finalRequest?.status === "error"
      ? (finalRequest.errorMessage ?? null)
      : null;

  // Snapshot content blocks from the active request so they persist on the
  // committed turn even after the active request is eventually cleaned up.
  const finalContentBlocks = finalRequest
    ? finalRequest.contentBlockOrder
        .map((id) => finalRequest.contentBlocks[id])
        .filter(Boolean)
    : [];
```

Before reading `accumulatedText`, two actions fire to join the chunk arrays:

```751:752:features/agents/redux/execution-system/thunks/process-stream.ts
  dispatch(finalizeAccumulatedText({ requestId }));
  dispatch(finalizeAccumulatedReasoning({ requestId }));
```

`finalizeAccumulatedText` (in `active-requests.slice.ts` lines 193-202) joins `textChunks` into `accumulatedText`:

```193:202:features/agents/redux/execution-system/active-requests/active-requests.slice.ts
    finalizeAccumulatedText(
      state,
      action: PayloadAction<{ requestId: string }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request && request.textChunks.length > 0) {
        request.accumulatedText = request.textChunks.join("");
      }
    },
```

**Step 2 — Snapshot content blocks** (lines 778-782 above): The code walks `contentBlockOrder` (which preserves emission order) and maps each `blockId` to the full `ContentBlockPayload` from `contentBlocks`. This is how **timeline-ordered blocks** become the flat array on the committed turn.

**Step 3 — Dispatch `commitAssistantTurn`** (lines 784-798):

```784:798:features/agents/redux/execution-system/thunks/process-stream.ts
  dispatch(
    commitAssistantTurn({
      conversationId,
      requestId,
      content: completedText,
      serverConversationId: finalConversationId,
      ...(finalContentBlocks.length > 0 && {
        contentBlocks: finalContentBlocks,
      }),
      ...(tokenUsage && { tokenUsage }),
      ...(finishReason && { finishReason }),
      ...(completionStats && { completionStats }),
      ...(finalErrorMessage && { errorMessage: finalErrorMessage }),
    }),
  );
```

**Step 4 — The reducer** in `instance-conversation-history.slice.ts` (lines 227-273):

```227:273:features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.slice.ts
    commitAssistantTurn(
      state,
      action: PayloadAction<{
        conversationId: string;
        requestId: string;
        content: string;
        serverConversationId: string | null;
        contentBlocks?: ContentBlockPayload[];
        tokenUsage?: TokenUsage;
        finishReason?: string;
        completionStats?: CompletionStats;
        errorMessage?: string;
      }>,
    ) {
      const {
        conversationId,
        requestId,
        content,
        serverConversationId,
        contentBlocks,
        tokenUsage,
        finishReason,
        completionStats,
        errorMessage,
      } = action.payload;

      const entry = state.byConversationId[conversationId];
      if (!entry) return;

      if (serverConversationId && entry.mode === "agent") {
        entry.mode = "conversation";
      }

      entry.turns.push({
        turnId: newTurnId(),
        role: "assistant",
        content,
        timestamp: new Date().toISOString(),
        requestId,
        conversationId: serverConversationId,
        ...(contentBlocks && contentBlocks.length > 0 && { contentBlocks }),
        ...(tokenUsage && { tokenUsage }),
        ...(finishReason && { finishReason }),
        ...(completionStats && { completionStats }),
        ...(errorMessage && { errorMessage }),
      });
    },
```

**Key takeaway:** Timeline entries are NOT directly stored on the committed turn. Instead, the `contentBlockOrder` array in `activeRequests` (which grows as `content_block` and `data` events arrive during the stream loop — pushed by `upsertContentBlock` at lines 335-353 of the slice) is mapped at commit time into the `contentBlocks` array on the `ConversationTurn`. The timeline itself remains only in `activeRequests` for debug/analytics.

---

## 2. The Rendering Path: `instanceConversationHistory` → `BlockRenderer`

**Layer 1 — `SmartAgentMessageList` / `AgentConversationDisplay`** reads turns from Redux:

```63:64:features/agents/components/run/AgentConversationDisplay.tsx
  const turns = useAppSelector(selectConversationTurns(conversationId));
  const phase = useAppSelector(selectStreamPhase(conversationId));
```

The selector (line 12-16 of `instance-conversation-history.selectors.ts`) is a direct lookup:

```12:16:features/agents/redux/execution-system/instance-conversation-history/instance-conversation-history.selectors.ts
export const selectConversationTurns =
  (conversationId: string) =>
  (state: RootState): ConversationTurn[] =>
    state.instanceConversationHistory.byConversationId[conversationId]?.turns ??
    EMPTY_TURNS;
```

Each committed assistant turn gets rendered as `<AgentAssistantMessage>` with `turnId` set and `isStreamActive=false`.

**Layer 2 — `AgentAssistantMessage`** resolves data using an ID-only design (lines 69-95):

```69:95:features/agents/components/run/AgentAssistantMessage.tsx
  const requestText = useAppSelector(
    requestId ? selectAccumulatedText(requestId) : () => "",
  );
  // ...
  const activeRequestBlocks = useAppSelector(
    requestId ? selectAllContentBlocks(requestId) : () => EMPTY_BLOCKS,
  );

  const turn = useAppSelector(
    turnId ? selectTurnByTurnId(conversationId, turnId) : () => undefined,
  );

  const content = requestText || turn?.content || "";
  // ...
  const mergedBlocks =
    activeRequestBlocks.length > 0
      ? activeRequestBlocks
      : (turn?.contentBlocks ?? EMPTY_BLOCKS);

  const serverProcessedBlocks =
    mergedBlocks.length > 0 ? mergedBlocks : undefined;
```

For committed turns (where `turnId` is set), `turn.content` provides the text and `turn.contentBlocks` provides the `ContentBlockPayload[]`. If the `activeRequest` still exists in the store, it takes priority.

**Layer 3 — Props passed to `MarkdownStream`** (lines 206-221):

```206:221:features/agents/components/run/AgentAssistantMessage.tsx
        <MarkdownStream
          requestId={requestId}
          content={content}
          type="message"
          role="assistant"
          isStreamActive={isStreamActive}
          hideCopyButton={true}
          allowFullScreenEditor={false}
          className={markdownClassName}
          serverProcessedBlocks={serverProcessedBlocks}
          onContentChange={
            canMarkdownSink ? handleAssistantMarkdownChange : undefined
          }
          applyLocalEdits={!canMarkdownSink}
        />
```

`content` = the full text string and `serverProcessedBlocks` = the `ContentBlockPayload[]` (audio, images, search results, etc.).

**Layer 4 — `MarkdownStream` → `MarkdownStreamImpl` → `StreamAwareChatMarkdown` → `EnhancedChatMarkdownInternal`**

`MarkdownStreamImpl` (line 41-48) passes through to `StreamAwareChatMarkdown`. Since committed turns have no `events` prop, `StreamAwareChatMarkdown` takes the **legacy mode** path (line 404-410):

```404:410:components/mardown-display/chat-markdown/StreamAwareChatMarkdown.tsx
  return (
    <EnhancedChatMarkdownInternal
      {...restProps}
      content={processedContent}
      serverProcessedBlocks={effectiveServerBlocks}
    />
  );
```

**Layer 5 — `EnhancedChatMarkdownInternal` — the key `useMemo`** (lines 296-372):

```296:372:components/mardown-display/chat-markdown/EnhancedChatMarkdown.tsx
  const { blocks, blockError } = useMemo(() => {
    if (isWaitingForContent) return { blocks: [], blockError: false };

    // New protocol: server already processed the blocks — convert to ContentBlock shape.
    if (useServerBlocks && serverProcessedBlocks) {
      const supplementaryBlocks: ContentBlock[] = serverProcessedBlocks.map(
        (sb) => ({
          type: sb.type as ContentBlock["type"],
          content: sb.content ?? "",
          serverData: sb.data ?? undefined,
          metadata: sb.metadata,
          language: (sb.data as any)?.language,
          src: (sb.data as any)?.src,
          alt: (sb.data as any)?.alt,
        }),
      );

      // If there's also text content, parse it normally and append supplementary blocks
      if (currentContent.trim()) {
        try {
          const textBlocks = splitContentIntoBlocksV2(currentContent);
          const parsed = Array.isArray(textBlocks) ? textBlocks : [];
          return {
            blocks: [...parsed, ...supplementaryBlocks],
            blockError: false,
          };
        } catch {
          return {
            blocks: [
              { type: "text" as const, content: currentContent, startLine: 0, endLine: 0 },
              ...supplementaryBlocks,
            ],
            blockError: false,
          };
        }
      }

      return { blocks: supplementaryBlocks, blockError: false };
    }

    // Legacy: client-side parsing
    try {
      const result = splitContentIntoBlocksV2(currentContent);
      return { blocks: Array.isArray(result) ? result : [], blockError: false };
    } catch (error) {
      // ...fallback...
    }
  }, [currentContent, isWaitingForContent, useV2Parser, useServerBlocks, serverProcessedBlocks]);
```

This is the critical merge point:
- `currentContent` (the text string from `turn.content`) is parsed by `splitContentIntoBlocksV2` into `ContentBlock[]` (text, code, table, reasoning, etc.)
- `serverProcessedBlocks` (from `turn.contentBlocks` / `ContentBlockPayload[]`) are converted to `ContentBlock[]` with their `serverData` preserved
- The two arrays are **concatenated**: `[...parsed, ...supplementaryBlocks]`

Then `processedBlocks` (lines 385-422) consolidates consecutive reasoning blocks, and the final render iterates (line 692):

```692:692:components/mardown-display/chat-markdown/EnhancedChatMarkdown.tsx
          {processedBlocks.map((block, index) => renderBlock(block, index))}
```

Each block goes through `SafeBlockRenderer` → `BlockRenderer`, which has a massive `switch` on `block.type` (starts at line 114 of `BlockRenderer.tsx`).

---

## 3. The Streaming Render Path

**There is no separate streaming component.** The same `AgentAssistantMessage` handles both streaming and committed turns. The difference is in the data resolution and the `isStreamActive` flag.

**How the streaming message enters the display list:**

In `AgentConversationDisplay` (lines 84-95):

```84:95:features/agents/components/run/AgentConversationDisplay.tsx
    if (isActive) {
      msgs.push({
        key: "__streaming__",
        role:
          phase === "connecting" || phase === "pre_token"
            ? "status"
            : "assistant",
        turnId: null,
        requestId: latestRequestId ?? null,
        isStreamActive: true,
      });
    }
```

This creates a synthetic `DisplayMessage` with `turnId: null`, `requestId` set to the active request, and `isStreamActive: true`. It's rendered as:

```128:138:features/agents/components/run/AgentConversationDisplay.tsx
        if (msg.role === "assistant") {
          return (
            <AgentAssistantMessage
              key={msg.key}
              conversationId={conversationId}
              requestId={msg.requestId ?? undefined}
              turnId={msg.turnId ?? undefined}
              isStreamActive={msg.isStreamActive}
              compact={compact}
            />
          );
        }
```

**How `AgentAssistantMessage` reads live text during streaming:**

Since `turnId` is null and `requestId` is set, the data resolution (lines 69-84) works like this:

```69:84:features/agents/components/run/AgentAssistantMessage.tsx
  const requestText = useAppSelector(
    requestId ? selectAccumulatedText(requestId) : () => "",
  );
  // ...
  const turn = useAppSelector(
    turnId ? selectTurnByTurnId(conversationId, turnId) : () => undefined,
  );

  const content = requestText || turn?.content || "";
```

- `requestText` reads from `selectAccumulatedText(requestId)` which **joins `textChunks` on every render** (lines 89-96 of `active-requests.selectors.ts`):

```89:96:features/agents/redux/execution-system/active-requests/active-requests.selectors.ts
export const selectAccumulatedText =
  (requestId: string) =>
  (state: RootState): string => {
    const request = state.activeRequests.byRequestId[requestId];
    if (!request) return "";
    if (request.textChunks.length > 0) return request.textChunks.join("");
    return request.accumulatedText || "";
  };
```

- `turn` is `undefined` (no turnId), so `content = requestText` — the live accumulated text.

- `activeRequestBlocks` reads live `contentBlocks` from the active request via `selectAllContentBlocks(requestId)`.

**The same `MarkdownStream` → `StreamAwareChatMarkdown` → `EnhancedChatMarkdownInternal` pipeline is used**, but with `isStreamActive={true}`. This flag:
1. Skips reasoning block consolidation (line 387: `if (isStreamActive) return blocks`)
2. Disables local edit overlay (line 276-279)
3. Gets passed down to `BlockRenderer` so individual blocks know they're in a live stream

**Summary**: There is no `AgentStreamDisplay` or `AgentActiveRequestMessage`. The system uses a **unified component tree** — `AgentAssistantMessage` handles both paths. The streaming message is distinguished by `turnId: null` + `requestId: <activeRequestId>` + `isStreamActive: true`. When the stream ends, `commitAssistantTurn` pushes a permanent turn into `instanceConversationHistory`, and the next render cycle replaces the `__streaming__` synthetic entry with the committed turn that now has `turnId` set.