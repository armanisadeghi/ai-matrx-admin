# Message CRUD Playbook

How the agent system persists message edits, forks, and interactive-artifact
state. All three flow through the same pipe: the authoritative DB row is
`cx_message`, every write goes through a thunk that updates Redux
optimistically + round-trips via the relevant Supabase RPC + flips the
conversation's cache-bypass flag for the next outbound AI call.

## Four operations

| Operation | Thunk | RPC | Invoked from |
|---|---|---|---|
| Save a whole message (edit in full-screen editor) | `editMessage` | `cx_message_edit` | `saveFullContent` on `useMessageActions` + menu "Edit content" |
| Patch one block's state (quiz answers, form fields, artifact edits) | `editMessage` with the updated content blocks | `cx_message_edit` | `useMessageBlockPersistence.patchBlock` |
| Fork at this message ("Submit from here") | `forkConversation` | `cx_fork_conversation` | `forkAtThisMessage` on `useMessageActions` + menu "Fork at this message" |
| Edit + resubmit | `forkConversation` + `launchConversation` | `cx_fork_conversation` + usual launch | `editAndResubmit` on `useMessageActions` + menu "Edit & resubmit" |

Auxiliary:
- Soft-delete whole conversation: `softDeleteConversation` / `cx_soft_delete_conversation`.
- Invalidate server agent cache out-of-band: `invalidateConversationCache`.

## Two hooks

### `useMessageBlockPersistence(conversationId, messageId, blockType?, blockId?, indexHint?)`

For any stateful render block (quiz, flashcard, form, editable table, code
sandbox). Returns `{ blockState, patchBlock }`.

```ts
const { blockState, patchBlock } = useMessageBlockPersistence({
  conversationId, messageId,
  blockType: "quiz",
  indexHint: blockIndex,
});

// rehydrate on mount from the persisted block
useEffect(() => {
  if (blockState?._matrxState) setLocalState(blockState._matrxState.quizState);
}, [blockState?._matrxBlockId]);

// persist on change (debounced in the caller)
useEffect(() => {
  const t = setTimeout(() => void patchBlock({ _matrxState: { quizState } }), 750);
  return () => clearTimeout(t);
}, [quizState, patchBlock]);
```

The hook:
- reads `cx_message.content` (the `CxContentBlock[]` JSON).
- locates the block by `_matrxBlockId` (preferred) or by `(blockType + indexHint)`.
- merges the patch into the target block, minting a UUID for `_matrxBlockId` on first write.
- dispatches `editMessage` which calls `cx_message_edit` and flips cache-bypass.

Side effect: the agent's next-turn history now reflects the current block state. Want the model to "see" how the user did on the quiz? It already does — the answers are inside the message content it's re-shown.

### `useMessageActions(conversationId, messageId, position?, surfaceKey?, buildInvocationForResubmit?, onNavigateToFork?)`

Returns `{ saveFullContent, forkAtThisMessage, editAndResubmit, deleteConversation }`. Use this from a menu or toolbar, NOT from inside a leaf block.

## Identifying blocks

Render blocks stamped with `_matrxBlockId` persist cleanly. Blocks without
it fall back to `(blockType + indexHint)` — fine for the FIRST write, but
risky when the same message has multiple blocks of the same type. The hook
mints a stable UUID on first `patchBlock` call and writes it back, so
subsequent round-trips use the stable id.

Agents that author artifacts with a model-provided `id` field can stamp
`_matrxBlockId` directly from the model output — skip the client mint. All
existing behavior stays correct: `_matrxBlockId` + `_matrxBlockType` +
`_matrxState` are namespaced so they never collide with server-side block
fields.

## Re-render safety

Every CRUD path respects the re-render contract documented in
`features/agents/redux/execution-system/messages/RE-RENDER-CONTRACT.md`.
Key rules:

- `editMessage` patches `content` (and `status` on the owning message) via
  `updateMessageRecord` — Immer's structural sharing keeps OTHER messages
  in the transcript reference-stable. Only the edited message's body
  re-renders.
- Block-level `patchBlock` replaces ONE entry in the content array. The
  array reference changes, but if consumers subscribe through the narrow
  `selectMessageContent(cid, mid)` selector, only that one message's
  subscribers re-run — not every renderer in the transcript.

## Menu wiring

The canonical message-action menu (`features/cx-conversation/actions/messageActionRegistry.ts`)
exposes these CRUD items under the "Edit" category:

- **Edit content** — opens full-screen editor; `onSave` wraps text as a
  `CxContentBlock[]` with one text block and calls `editMessage`.
- **Fork at this message** — dispatches a thunk-in-action that reads the
  message's `position` from state, then calls `forkConversation`.
- **Edit & resubmit** — opens full-screen editor; `onSave` forks at
  `position - 1` and applies the edit to the current message on the fork's
  head. (The follow-up turn launch is surface-specific; use
  `useMessageActions.editAndResubmit` if you need the full flow.)

## Cache-bust guarantee

`editMessage`, `forkConversation`, `softDeleteConversation` all call
`markCacheBypass({ conversation: true })` on success. The next outbound
AI request (via `executeInstance` or `executeChatInstance`) consumes that
flag through `consumePendingCacheBypass` and ships `cache_bypass` on the
payload. The server's agent cache rebuilds from the DB — never stale.

If the user edits then navigates away (no follow-up turn), call
`invalidateConversationCache({ conversationId })` directly. It hits
`POST /cx/conversations/{id}/invalidate-cache` and clears the pending
bypass flag.

## Artifact dedupe (HTML preview, flashcard decks, diagrams, etc.)

`registerArtifactThunk` is idempotent on the natural key
`(user_id, message_id, artifact_type, external_system)`. Duplicate
creation is prevented at two layers:

- **Client-side:** the thunk short-circuits if a matching artifact is
  already in Redux and the caller isn't pushing fresh mutable fields
  (`externalId`, `externalUrl`, `title`, `description`, `thumbnailUrl`).
- **Server-side:** `POST /api/artifacts { action: "create" }` looks up
  the natural key first; if an artifact exists it applies any provided
  updates and returns the single row, otherwise it inserts a new one.

Effect: opening the HTML preview overlay repeatedly (or double-clicking
"Generate Page" before the artifact fetch settles) produces exactly one
`cx_artifact` row per message — regardless of client-side races.

## The block persistence pattern (checklist for new stateful blocks)

1. Accept `conversationId?: string`, `messageId?: string`, `blockIndex?: number` in the block's props.
2. Thread them from `BlockRenderer` (already done for `MultipleChoiceQuiz`; copy the pattern).
3. Call `useMessageBlockPersistence({ conversationId, messageId, blockType: "...", indexHint: blockIndex })`.
4. Rehydrate local state from `blockState._matrxState` in a mount-only effect.
5. Debounce writes on state change (150–750ms depending on how hot the changes are). Do NOT write every keystroke — 50 writes/sec would swamp the RPC.
6. Use `_matrxState` for arbitrary state (serialize anything JSON-safe). Keep the block's OWN fields (the server-authored shape) untouched.

## Out-of-scope (future work)

- **Full undo/redo on message edits.** `cx_message_edit` archives the
  prior content into `content_history` automatically; a client-side undo
  stack can read from there. Not wired to a menu today.
- **Per-sub-block ids for renderers that split one block into many parts**
  (e.g. a quiz renderer that treats each question as a sub-block). Today
  one quiz → one `_matrxBlockId`; that's sufficient because the serialized
  `_matrxState` carries the full quiz state.
