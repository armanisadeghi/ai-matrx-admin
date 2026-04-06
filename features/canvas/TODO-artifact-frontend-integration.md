# TODO: Artifact Frontend Integration (matrx-admin)

> **Status:** Block parsing and rendering complete. Persistence and message-level integration needed.
> **Depends on:** Python server streaming pipeline (aidream) and Supabase RPC functions (already deployed).

---

## What's Already Done

- [x] `<artifact>` tag detection in `content-splitter-v2.ts` (attribute-bearing XML, like `<decision>`)
- [x] `ArtifactBlock` component: renders inline preview with "Open in Canvas" button
- [x] `BlockRenderer` routes `type: "artifact"` to `ArtifactBlock`
- [x] `BlockComponentRegistry` lazy-loads `ArtifactBlock`
- [x] Metadata extraction: `artifactId`, `artifactIndex`, `artifactType`, `artifactTitle`
- [x] Mid-line artifact detection (e.g., prose followed by `<artifact ...>` on same line)
- [x] Database migration: `canvas_items` has `source_message_id`, `artifact_index`, `version`, `parent_canvas_id`, `source_type`
- [x] RPC functions: `cx_canvas_upsert`, `cx_canvas_create_manual`, `cx_canvas_update_version`, `cx_canvas_get_by_message`, `cx_canvas_get_conversation_latest`, `cx_canvas_get_version_history`

---

## What Needs to Be Done

### 1. Persist Artifacts on Stream Completion

**When:** After a streaming response finishes and artifact blocks are finalized.

**Where to implement:** Create a new hook or extend the existing chat message save flow.

**Steps:**
1. After the assistant message is persisted to `cx_message`, iterate over any artifact blocks in the response.
2. For each artifact block, call `cx_canvas_upsert` via Supabase RPC:

```typescript
const { data } = await supabase.rpc('cx_canvas_upsert', {
  p_user_id: userId,
  p_message_id: messageId,       // the cx_message.id of the assistant message
  p_artifact_index: block.metadata.artifactIndex,
  p_type: block.metadata.artifactType,    // e.g., 'iframe', 'code', 'diagram'
  p_title: block.metadata.artifactTitle,
  p_content: {
    data: block.content,
    type: block.metadata.artifactType,
    metadata: {
      artifactId: block.metadata.artifactId,
    }
  },
  p_conversation_id: null,        // auto-resolved from message
  p_source_type: 'model_direct'
});
```

3. On success, update the Redux canvas item with the real `canvas_items.id` from the response.

**Key files to modify:**
- Look at where assistant messages are saved (likely in `features/cx-chat/` or `features/cx-conversation/`)
- The stream completion handler that currently saves messages to `cx_message`

---

### 2. Handle Artifact Updates Across Messages

**When:** The model reuses an artifact ID (e.g., `artifact_1`) in a later message within the same conversation.

**Logic:**
1. Before calling `cx_canvas_upsert`, check if `artifact_1` already exists in the conversation:
   ```typescript
   const existing = await supabase.rpc('cx_canvas_get_conversation_latest', {
     p_conversation_id: conversationId
   });
   const match = existing.find(item =>
     item.artifact_index === artifactIndex && item.source_message_id !== messageId
   );
   ```
2. If a match is found, call `cx_canvas_update_version` instead:
   ```typescript
   await supabase.rpc('cx_canvas_update_version', {
     p_user_id: userId,
     p_original_canvas_id: match.id,
     p_new_message_id: messageId,
     p_artifact_index: artifactIndex,
     p_type: artifactType,
     p_title: artifactTitle,
     p_content: { data: content, type: artifactType }
   });
   ```
3. This creates a version chain — the new row has `parent_canvas_id` pointing to the root.

---

### 3. Render Persisted Artifacts in Message History

**When:** Loading a conversation that has existing messages with artifacts.

**Current behavior:** Messages are rendered from `cx_message.content`, which contains the raw `<artifact>` tags. The parser will detect them and render `ArtifactBlock`.

**Better approach (post-save):** After artifacts are persisted, you could:
1. Fetch artifacts for a message: `cx_canvas_get_by_message({ p_message_id })`
2. Replace the raw `<artifact>` tags with the persisted canvas item IDs
3. This avoids re-parsing on every render

**For now:** The parser-based approach works fine. Optimize later if needed.

---

### 4. Conversation Canvas Sidebar Panel

**Where:** The existing `CanvasSideSheet` already renders in the layout.

**What to add:**
1. When a conversation is active, fetch latest artifacts:
   ```typescript
   const artifacts = await supabase.rpc('cx_canvas_get_conversation_latest', {
     p_conversation_id: conversationId
   });
   ```
2. Show one entry per artifact (latest version only) in the sidebar.
3. Clicking an artifact opens it in the canvas panel.
4. Add a "History" button that calls `cx_canvas_get_version_history` to show all versions.

**Key files:**
- `features/canvas/core/CanvasSideSheetInner.tsx`
- `features/canvas/core/CanvasNavigation.tsx`

---

### 5. Temporary React Keys

**Before persistence:** Use `${messageId}:${artifactIndex}` as a temporary React key for artifact blocks.

**After persistence:** Replace with the real `canvas_items.id` UUID returned by the RPC.

This is handled naturally if you update Redux state after the RPC call succeeds.

---

### 6. Testing Checklist

- [ ] Stream a response containing `<artifact id="artifact_1" type="iframe" title="Test">...</artifact>` — verify it renders as `ArtifactBlock`
- [ ] Click "Open" button — verify canvas side panel opens with correct content
- [ ] Verify multi-artifact messages: `artifact_1` and `artifact_2` in the same response
- [ ] Verify mid-line artifacts: prose followed by `<artifact>` on the same line
- [ ] Verify artifact persistence: check `canvas_items` table after stream completes
- [ ] Verify version updates: send a second message referencing same `artifact_1`
- [ ] Verify conversation panel: sidebar shows latest artifacts for current conversation
- [ ] Verify page reload: artifacts load correctly from persisted data

---

## File Reference

| File | Purpose |
|------|---------|
| `components/mardown-display/markdown-classification/processors/utils/content-splitter-v2.ts` | Parser: detects `<artifact>` tags |
| `components/mardown-display/blocks/artifact/ArtifactBlock.tsx` | Inline artifact renderer |
| `components/mardown-display/chat-markdown/block-registry/BlockRenderer.tsx` | Routes `artifact` type to component |
| `components/mardown-display/chat-markdown/block-registry/BlockComponentRegistry.tsx` | Lazy-loads ArtifactBlock |
| `features/canvas/hooks/useCanvas.ts` | Hook for opening canvas (`open()`) |
| `features/canvas/redux/canvasSlice.ts` | Canvas state management |
| `features/canvas/core/CanvasRenderer.tsx` | Renders canvas content by type |
| `features/canvas/TODO-canvas-artifact-integration.md` | Original spec with all RPC signatures |
