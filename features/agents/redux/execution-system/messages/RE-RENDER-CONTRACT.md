# `messages/` — re-render contract

Message-body components do expensive work: markdown parsing, renderBlock
compilation, tool-call visualizations, LaTeX, copy-to-clipboard wiring,
image loaders, etc. The stream commit path fires many small status updates
per assistant turn (one `reserveMessage` + several `record_update` events +
one `updateMessageRecord` at `completion`). Any one of those patches, if
consumed through the wrong selector, would re-render every message body in
the transcript. That's a UX problem — a 0.5s content flash during a 2s
turn is still perceptible.

## The contract

**Do not** subscribe to the full record when you only need a specific field:

```tsx
// ❌ BAD — rerenders on every status patch
const message = useAppSelector(selectMessageById(cid, mid));
<MessageBody content={message?.content} />
```

**Do** subscribe to the narrow field you actually render:

```tsx
// ✅ GOOD — only rerenders when content itself changes
const content  = useAppSelector(selectMessageContent(cid, mid));
const status   = useAppSelector(selectMessageStatus(cid, mid));
<MessageBody content={content} />
<StatusDot status={status} />
```

## Why this works

- The slice uses Immer (`createSlice`). `Object.assign(entry.byId[id], patch)`
  produces structural sharing: fields not in `patch` keep their object
  references. So `content` stays referentially equal across a `status`-only
  patch.
- `useAppSelector` uses `===` by default. If the selector returns the same
  reference, the subscribing component does NOT re-render.
- Narrow selectors return a single field, so they only trip on patches
  that touch that field.

## Narrow selectors available

See `messages.selectors.ts`:

- `selectMessageContent(cid, mid)` — `CxContentBlock[]` Json (heavy render)
- `selectMessageStatus(cid, mid)` — server status string
- `selectMessageClientStatus(cid, mid)` — client-side rollup status
- `selectMessageRole(cid, mid)`
- `selectMessagePosition(cid, mid)`
- `selectMessageAgentId(cid, mid)`
- `selectMessageMetadata(cid, mid)`
- `selectMessageContentHistoryRecord(cid, mid)`
- `selectOrderedMessageIds(cid)` — stable id list for the list parent

## Live stream timing (for reference)

For a single assistant turn the slice receives, in order:

1. `reserveMessage({ id: M1, status: "reserved", content: [] })`
   — creates a new entry. Only mounts a new list child; no existing bodies
   rerender.
2. `updateMessageRecord({ id: M1, patch: { status: "streaming" } })`
   — status-only patch. Content reference unchanged; only `StatusDot`
   subscribers rerun.
3. `updateMessageRecord({ id: M1, patch: { status: "active" } })` — same.
4. `updateMessageRecord({ id: M1, patch: { content: [...], status: "active", _clientStatus: "complete" } })`
   — content patch. Body rerenders ONCE with final content. Expected.

During the entire stream, other messages in the transcript never touch
their content field, so their bodies stay mounted without a re-render.

## Gotchas

- **Array/object equality on empty arrays.** If you return `[]` from a
  selector with `?? []`, each call returns a fresh `[]`. Always return
  module-level constants (`const EMPTY: Foo[] = []`) or use `createSelector`.
- **Don't compose narrow selectors into objects in a hook.** `{ content, status }`
  is a new object every render. Either use multiple `useAppSelector` calls
  or build a `createSelector` that memoizes the composite.
- **The bridge selector `selectDisplayMessages`** currently projects from
  `turns[]`. Once Phase 6 flips it to `byId + orderedIds`, it will need to
  be `createSelector`-memoized on `byId` identity, not on individual field
  patches — otherwise every status event will rebuild the display list.
