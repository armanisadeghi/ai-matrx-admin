# matrx-extend Connection — Frontend

**Status:** Channel does **not exist yet**. This doc captures the Phase 0
scaffold so future agents know where the bridge will live, what substrates
it will use, and which pieces of pre-existing code look like a bridge but
are NOT one. The real bridge ships in **Phase 2** of the four-repo
cross-integration plan owned by matrx-extend.

This is the matrx-frontend-side reference. The master doc lives in the
extension repo — see [§ Pointer to master](#pointer-to-master) at the
bottom.

---

## TL;DR

- matrx-frontend is the Next.js 16 admin / no-code-builder UI at
  `aimatrx.com` (and `mymatrx.com`). matrx-extend is the Chrome
  extension (the agent harness).
- Today there is **zero** runtime channel between them. Two pre-existing
  scaffolding fragments mention `chrome-extension` but are dead refs
  (see [§ Surface area](#surface-area)).
- Phase 2 will add **two substrates** that share one envelope:
  `chrome.runtime.onMessageExternal` (same machine) and Supabase
  Broadcast (cross machine). A single `FRONTEND_RPC` envelope rides on
  both.
- Auth is the same Supabase project (`txzxabzwovsujtloxrus`) on both
  sides — JWTs are reusable, no new identity surface to design.
- The window-panels deep-link (`?panels=<typeKey>:<instanceId>`) is the
  intended public entry point when the extension wants to drive the
  UI directly without a custom RPC.

---

## Role

matrx-frontend is the Next.js 16 (App Router) admin and no-code-builder
UI at `aimatrx.com`. It hosts conversation/agent management, the
window-panels overlay system, settings, dashboards, and every authoring
surface for the platform. It already speaks Supabase, exposes headless
API routes, and has a robust realtime substrate.

matrx-extend is a Chrome extension that runs alongside the user's
browsing session and needs to coordinate with this app for cross-surface
workflows — opening a panel from the extension, appending a message to
a conversation hosted here, or signaling that the user has captured a
page that the admin UI should react to.

The integration channel **does not exist yet**. This doc describes
where it will live and what it will plug into. **Phase 0 is scaffold
only — no runtime bridge code in this repo at this stage.**

---

## Surface area

Concrete files in this repo that the extension bridge will touch when
Phase 2 lands:

| Path | Role |
|---|---|
| [`lib/supabase/messaging.ts`](../lib/supabase/messaging.ts) | Broadcast / Postgres Changes / Presence substrate. Already used by conversation, typing, and presence channels. Adding a `matrx-extension-bridge:<userId>` channel slots in here. |
| [`features/window-panels/`](../features/window-panels/) | Overlay registry + URL deep-link substrate. The extension uses `?panels=<typeKey>:<instanceId>` to open a specific panel without a bespoke RPC. |
| [`features/window-panels/registry/windowRegistry.ts`](../features/window-panels/registry/windowRegistry.ts) | Per-window deep-link declarations (`urlSync.key`). |
| [`features/window-panels/url-sync/initUrlHydration.ts`](../features/window-panels/url-sync/initUrlHydration.ts) | Where each `?panels=...` key gets a hydrator. |
| [`app/api/agent/feedback/route.ts`](../app/api/agent/feedback/route.ts) | Reference Bearer-`AGENT_API_KEY` route — pattern the extension's headless calls will follow. |
| [`app/api/mcp/[transport]/route.ts`](../app/api/mcp/[transport]/route.ts) | Reference dual-auth route (Bearer or `?token=`). |
| `app/api/extension/append-message/route.ts` | **Planned (Phase 2 task C1.d).** Headless conversation message-append endpoint. Does not exist today. |
| `wxt.config.ts` (in matrx-extend, NOT this repo) | `externally_connectable.matches` whitelist. Listed here as a cross-repo reference because the whitelist must include this app's origins. |

### Pre-existing dead references (do **not** treat as a bridge)

Two fragments mention `chrome-extension` but neither is a working
bridge. Avoid building on them or touching them in unrelated PRs:

- [`features/tool-registry/surfaces/data/surface-candidates.ts:24`](../features/tool-registry/surfaces/data/surface-candidates.ts) —
  `client_name: "chrome-extension"` is in the type union but no surface
  declares it. Dead reference.
- [`utils/errorContext.ts:10`](../utils/errorContext.ts) — defensive
  stack-frame filter that strips `chrome-extension://` URLs from
  reported stack traces. Harmless, but creates the illusion of a
  bridge where none exists.

The real bridge ships in Phase 2; both of these can stay.

---

## Substrates

Two substrates, one envelope. Both planned for Phase 2.

### 1. `chrome.runtime.onMessageExternal` — same-machine RPC

Direct page-to-extension messaging when the user has both surfaces
open on the same machine. The extension whitelists this app's origins
in its `wxt.config.ts` `externally_connectable.matches`:

```
https://*-armani-sadeghis-projects.vercel.app/*
https://*.aimatrx.com/*
https://*.mymatrx.com/*
http://localhost/*
http://127.0.0.1/*
```

A page in this app calls `chrome.runtime.sendMessage(extensionId, ...)`
and the extension's service worker handles it. Round-trip latency is
sub-millisecond. **Failure mode is silent** — if the page origin is not
in the whitelist, `sendMessage` returns nothing and no error is
thrown. Verify with the extension's SW console.

### 2. Supabase Broadcast — cross-machine signaling

When the user has the extension on one device and this app open on
another (laptop + phone, two laptops, etc.), `onMessageExternal` won't
reach. Broadcast over a per-user channel does:

- Channel: `matrx-extension-bridge:<userId>`
- Substrate: `lib/supabase/messaging.ts` (already wired for
  conversation/typing/presence — adding one more channel is a few
  lines).
- Same envelope as substrate 1 — see below.

### Shared envelope: `FRONTEND_RPC`

```ts
type FrontendRpc<TPayload = unknown> = {
  channel: "FRONTEND_RPC";
  action: string;       // dot-namespaced, e.g. "panel.open" / "conversation.appendMessage"
  payload: TPayload;
  requestId: string;    // UUID — replies match by this
};
```

The substrate-agnostic envelope means a handler doesn't care whether
it arrived via `onMessageExternal` or Broadcast. Replies are published
back over the same substrate and matched on `requestId`.

---

## Auth model

Both sides authenticate against the same Supabase project
(`txzxabzwovsujtloxrus`). JWTs are reusable across the boundary.

**Three auth modes, in priority order:**

1. **Supabase session cookie** (browser session for this app's
   origin). Wins when present. Server-side routes read it via
   `createClient()` from `utils/supabase/server.ts` exactly as
   today.
2. **Bearer token** (`Authorization: Bearer <token>`). Used when the
   extension calls headless API routes from a service worker context
   that doesn't carry cookies. Pattern: see
   `app/api/agent/feedback/route.ts` (single Bearer against
   `AGENT_API_KEY`) and `app/api/mcp/[transport]/route.ts` (Bearer or
   `?token=`).
3. **No auth** (rejected — every Phase 2 endpoint requires one of the
   above).

`app/api/dev-login/route.ts` is localhost-only and disabled in
production; it exists for the dev workflow, not for the extension.

---

## Adding a command — inbound (extension → matrx-frontend)

When the extension needs to drive something in this app, the model is:

1. **Define the action** in the `FRONTEND_RPC` envelope —
   `{ channel: "FRONTEND_RPC", action, payload, requestId }`. Use a
   dot-namespaced action name (`conversation.appendMessage`,
   `panel.open`, `task.create`).
2. **Pick the route** the SW-side handler will dispatch into:
   - **Existing API route** — the handler does
     `fetch("/api/...", { method, body })` against an existing
     authenticated route. Reuse where possible.
   - **Redux dispatch** — the handler imports a thunk and dispatches
     it (only valid when running in a page context, not a SW; useful
     for the cross-machine Broadcast substrate where the receiver is
     a tab in this app).
   - **Supabase write** — direct Supabase client call when the action
     is purely a DB mutation that's already covered by an RLS policy.
3. **Reply on the same substrate** — publish back over Broadcast or
   `sendResponse(...)` for `onMessageExternal`. Match on `requestId`.
4. **For UI-bound actions, prefer the deep-link** — instead of writing
   a custom RPC to "open the messages panel for conversation X", emit
   `?panels=messages:<conversationId>` and let the existing
   `initUrlHydration.ts` machinery do the work. The
   `urlSync.key`-driven hydrators are already the public surface
   for this.

**Concrete shape (Phase 2 reference, not yet implemented):**

```ts
// extension SW
chrome.runtime.sendMessage(
  extensionId,
  {
    channel: "FRONTEND_RPC",
    action: "conversation.appendMessage",
    payload: { conversationId, role: "user", content: "..." },
    requestId: crypto.randomUUID(),
  },
  (reply) => { /* match reply.requestId */ },
);
```

```ts
// matrx-frontend planned route
// app/api/extension/append-message/route.ts
export async function POST(req: NextRequest) {
  const auth = await authorizeExtensionRequest(req); // cookie OR Bearer
  if (!auth.ok) return new Response("Unauthorized", { status: 401 });
  const body = await req.json();
  // append to conversation, return updated message ID
}
```

---

## Calling the extension — outbound (matrx-frontend → extension)

Three pathways, picked by who is running where:

### A. From a tab in this app, same machine as the extension

```ts
// In a Client Component or page handler:
declare const EXTENSION_ID: string; // from env or discovery
chrome.runtime.sendMessage(
  EXTENSION_ID,
  {
    channel: "FRONTEND_RPC",
    action: "browser.captureCurrentTab",
    payload: { reason: "...", since: Date.now() },
    requestId: crypto.randomUUID(),
  },
  (reply) => { /* reply.payload */ },
);
```

`chrome.runtime` is undefined when the extension isn't installed —
guard with `typeof chrome !== "undefined" && chrome.runtime`.

### B. From a server route, or when the extension is on a different
device

Publish to the user's Broadcast channel:

```ts
import { getMessagingClient } from "@/lib/supabase/messaging";
const client = getMessagingClient();
const channel = client.channel(`matrx-extension-bridge:${userId}`);
await channel.send({
  type: "broadcast",
  event: "FRONTEND_RPC",
  payload: { channel: "FRONTEND_RPC", action, payload, requestId },
});
// Wait for reply on the same channel, matched by requestId.
```

### C. From a server route — fire-and-forget (no reply needed)

Same as B but skip the reply-wait. Useful for "the user just did X,
the extension may want to know" notifications where the extension has
no reply obligation.

---

## Pointer to master

The four-repo cross-integration plan and the canonical envelope spec
live in the matrx-extend repo:

- `/Users/armanisadeghi/code/matrx-extend/.claude/worktrees/exciting-moser-4b984f/docs/CROSS_REPO_INTEGRATION.md`

When details in this doc and the master diverge, the master wins.
Update both in the same PR.

---

## Pointer to local skill

For agent-facing how-to (when to use, file index, failure modes),
see [`./.claude/skills/connect-matrx-extend/SKILL.md`](../.claude/skills/connect-matrx-extend/SKILL.md).
