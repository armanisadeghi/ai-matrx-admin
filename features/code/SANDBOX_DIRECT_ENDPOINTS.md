# Sandbox Orchestrator — Direct Browser Access (Requirements for the Python Team)

**Owner:** matrx-admin (`features/code/`)
**Counterpart:** sandbox orchestrator (FastAPI / Coolify, repo TBD by Python team)
**Status:** Spec draft — 2026‑04‑26
**Drives:** removal of long-running paths from Vercel; alignment with the Matrx Engineering Constitution ("clients hit Python endpoints directly — requests never route through Next.js to reach Python").

---

## 1. Why this exists

Today every sandbox request from the browser goes through Next.js routes under `app/api/sandbox/**`. Those routes do three things:

1. Authenticate the caller against Supabase (`createClient` → `auth.getUser`).
2. Look up the `sandbox_instances` row, enforce `user_id` ownership, and read its persisted `tier` to pick `EC2_URL` vs `HOSTED_URL`.
3. Forward the request to the right orchestrator with the corresponding `X-API-Key` (server-only secret).

That works fine for short JSON calls (FS read/write, status, extend, …). It is fundamentally broken for everything else:

| Capability | Current path | Why Vercel breaks it |
|---|---|---|
| Streaming exec (SSE) — `git clone`, `pnpm install`, builds | `POST /api/sandbox/[id]/exec/stream` | Pro plan caps Serverless Functions at **300s**. `next build` cold cache, large test matrices, and long deploys exceed this routinely. |
| Real PTY terminal (WebSocket) | `GET /api/sandbox/[id]/pty` (upgrade) | Vercel Functions **cannot act as a WebSocket server** at all (https://vercel.com/docs/limits#websockets). The route currently returns 426 and the client falls back to buffered SSE — i.e. no real PTY in production. |
| File watcher (WebSocket) | `GET /api/sandbox/[id]/fs/watch` | Same — no WS upgrade on Vercel. |
| Bulk file upload / download (large bodies) | `…/fs/upload`, `…/fs/download` | Bound by function memory + duration; large transfers fail or stall. |

These are not Vercel-fixable. The only correct architecture is:

- **Short, JSON-only requests** continue to flow through Next.js (auth + tier routing + ownership check).
- **Long-running and bidirectional** requests go from the browser **directly** to the orchestrator, with the orchestrator validating a short-lived access token issued by Next.js for that specific sandbox.

This is the same pattern Supabase Realtime uses (Supabase JWT minted server-side, Realtime gateway validates it), the same pattern S3 presigned URLs use, and the same pattern our existing `POST /api/sandbox/[id]/access` already implements for SSH.

---

## 2. Authentication model — short-lived sandbox access tokens

The orchestrator does **not** call Supabase directly to validate users (we want exactly one authority on user→sandbox ownership: the Next.js layer that already owns the `sandbox_instances` table). Instead:

1. The browser asks Next.js for an access token: `POST /api/sandbox/[id]/access?scope=exec`.
2. Next.js validates the Supabase user, looks up the row, confirms ownership, picks the tier, and asks the **orchestrator** to mint a token bound to the upstream `sandbox_id`, the requested scopes, and a short TTL.
3. Next.js returns the token plus the direct orchestrator URL (`https://orchestrator.dev.codematrx.com` for hosted, etc.) to the browser.
4. The browser opens SSE / WebSocket / large HTTP requests **directly** against the orchestrator, presenting the token as `Authorization: Bearer <token>`.
5. The orchestrator validates the token signature, checks expiry + scope + sandbox-id binding, and serves the request.

The orchestrator already exposes a similar endpoint for SSH credential issuance (`POST /sandboxes/{id}/access`). We are extending the same shape to cover browser access.

### 2.1 Token contract

The token MUST be a signed structured token (recommended: JWS / JWT with HS256 using a per-orchestrator HMAC secret, or PASETO v4.local). The token MUST encode:

| Claim | Type | Required | Notes |
|---|---|---|---|
| `iss` | string | ✓ | `matrx-sandbox-orchestrator` |
| `sub` | string (UUID) | ✓ | Upstream `sandbox_id` |
| `scopes` | array<string> | ✓ | Subset of: `exec.run`, `exec.stream`, `pty`, `fs.read`, `fs.write`, `fs.watch`, `git`, `ports.read`. |
| `tier` | `"ec2"` \| `"hosted"` | ✓ | Echoed back so the browser can sanity-check. |
| `iat` | number | ✓ | Unix seconds. |
| `exp` | number | ✓ | Unix seconds. **Default TTL: 300s. Hard maximum: 900s.** |
| `actor` | object | ✓ | `{ user_id: string, email?: string }` — sourced from Next.js, used for orchestrator audit logs only. |
| `jti` | string | ✓ | Random; used for one-shot tokens (see §2.3). |

Tokens are bound to a **single sandbox**. There is no global "user token" — every long-lived connection corresponds to exactly one sandbox.

### 2.2 New / extended endpoint on the orchestrator

```
POST /sandboxes/{sandbox_id}/access-tokens
Headers:
  X-API-Key: <orchestrator master key>           # current admin auth
  Content-Type: application/json
Body:
  {
    "scopes": ["exec.stream", "pty"],
    "ttl_seconds": 300,           # optional, default 300, hard cap 900
    "actor": { "user_id": "uuid", "email": "arman@…" },
    "single_use": false           # if true, token is invalidated after first connect
  }
Response 200:
  {
    "token": "eyJhbGciOi…",
    "expires_at": "2026-04-26T08:30:00Z",
    "direct_url": "https://orchestrator.dev.codematrx.com",
    "ws_base":    "wss://orchestrator.dev.codematrx.com",
    "tier": "hosted",
    "sandbox_id": "<uuid>"
  }
```

This is admin-authenticated (`X-API-Key`) and only Next.js calls it. The browser never sees `X-API-Key`.

> **Migration note.** The existing SSH `POST /sandboxes/{id}/access` endpoint should stay as-is for SSH credential issuance. The new browser-access endpoint is intentionally separate to avoid coupling SSH key lifetime to web token lifetime.

### 2.3 One-shot vs reusable tokens

For SSE/HTTP we want **reusable** tokens (caller may retry, drop and reopen). For PTY/WS we recommend **single-use** tokens to make replay attacks meaningless: the orchestrator marks `jti` as consumed on first WS upgrade and rejects subsequent connections with the same `jti`. The `single_use` flag in §2.2 controls this.

### 2.4 CORS

The orchestrator MUST send `Access-Control-Allow-Origin` for the matrx-admin domains (configurable list, env var `MATRX_CORS_ALLOWED_ORIGINS`). Default list:

```
https://www.aimatrx.com
https://aimatrx.com
https://*.aimatrx.com
http://localhost:3000
http://localhost:3001
```

Required preflight:
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Authorization, Content-Type, X-PTY-Cols, X-PTY-Rows`
- `Access-Control-Allow-Credentials: false` (we are bearer-token, not cookie-based — keep it that way to avoid CSRF surface)
- `Access-Control-Expose-Headers: X-Sandbox-Id, X-Tier`

---

## 3. Endpoints that move to direct browser → orchestrator

Each endpoint below is the **direct** form. The orchestrator MUST accept either `Authorization: Bearer <access-token>` (browser) or `X-API-Key: <master>` (Next.js + ops tools). When a bearer token is used, the orchestrator MUST reject if `scopes` don't include the operation, if `sub` doesn't match the path's `{sandbox_id}`, or if `exp` is past.

### 3.1 Streaming exec (SSE) — replaces `/api/sandbox/[id]/exec/stream`

```
POST {direct_url}/sandboxes/{sandbox_id}/exec/stream
Authorization: Bearer <token with scope exec.stream>
Body (JSON):
  {
    "command": "pnpm install",
    "cwd": "/workspace",
    "env": { "TERM": "xterm-256color", "COLUMNS": "120", "LINES": "40" },
    "stdin": null,
    "timeout_seconds": 1800
  }
Response: text/event-stream
  event: stdout
  data: <chunk>

  event: stderr
  data: <chunk>

  event: exit
  data: { "code": 0, "signal": null }
```

- **No 300s cap.** Default timeout 30 minutes; configurable per-request up to 2 hours. Long builds work natively.
- Closing the SSE connection cancels the upstream process (same semantics we already have through the Vercel proxy — keep it).

### 3.2 PTY WebSocket — replaces (still-broken) `/api/sandbox/[id]/pty`

```
GET {ws_base}/sandboxes/{sandbox_id}/pty?cols=120&rows=40&cwd=/workspace
Sec-WebSocket-Protocol: matrx.sandbox.pty.v1, bearer.<token>
```

- The token rides in a subprotocol slot because browsers cannot set arbitrary headers on `new WebSocket(url, …)`. Format: the second subprotocol entry is `bearer.<base64url(token)>`. Orchestrator parses, validates, and selects the first acceptable subprotocol (`matrx.sandbox.pty.v1`) on success.
- Wire format is unchanged from today (text JSON frames):
  - client → server: `{type:"input"|"resize"|"signal"|"ping", …}`
  - server → client: `{type:"output"|"exit"|"error"|"pong", …}`
- TLS is required (`wss://`). No fallback to `ws://` over the public internet.

### 3.3 File watcher WebSocket — net-new direct path

```
GET {ws_base}/sandboxes/{sandbox_id}/fs/watch?path=/workspace
Sec-WebSocket-Protocol: matrx.sandbox.fs-watch.v1, bearer.<token>
```

- Server pushes `{type:"created"|"modified"|"deleted"|"moved", path, …}` events.
- Client may send `{type:"subscribe", path}` / `{type:"unsubscribe", path}` to adjust the watch set without reconnecting.

### 3.4 Bulk file transfer — direct (or kept on Next, see §3.5)

We currently proxy `…/fs/upload` (multipart) and `…/fs/download` through Next. With access tokens, the browser can `PUT` / `GET` directly to the orchestrator and bypass Vercel's body-size and duration limits. Same auth scheme (`Authorization: Bearer <…>` with scope `fs.write` / `fs.read`).

### 3.5 What stays on Next.js

The following are short, JSON, ownership-bound, and cheap to proxy. They keep the current shape so we don't have to ship a token round-trip just to read a directory listing.

- `GET /api/sandbox` (list user's sandboxes)
- `POST /api/sandbox` (create)
- `GET / DELETE /api/sandbox/[id]` (status / soft-delete)
- `POST /api/sandbox/[id]/extend` (TTL bump)
- `POST /api/sandbox/[id]/heartbeat` (in-flight keepalive)
- `GET / POST / PATCH / DELETE /api/sandbox/[id]/fs/[...path]` for **single-file** ops where buffered round-trip < 30s
- `POST /api/sandbox/[id]/exec` (one-shot buffered exec, used for tiny commands like `pwd`, `git status`)
- `POST /api/sandbox/[id]/credentials` and `…/credentials/workspace` (sets credentials inside the container; tiny payload)
- `POST /api/sandbox/[id]/access` (SSH credential issuance — already exists)
- `POST /api/sandbox/[id]/access?scope=…` ← **new**, mints the browser tokens described in §2

---

## 4. Concrete deliverables for the Python team

### 4.1 Code changes

1. **HMAC token issuance + validation middleware** that accepts `Authorization: Bearer <token>` on the SSE/WS routes. Master key path (`X-API-Key`) keeps working unchanged.
2. **`POST /sandboxes/{id}/access-tokens`** as specified in §2.2, admin-authenticated.
3. **CORS configuration** as specified in §2.4. Default to a strict allow-list, env-driven.
4. **Confirm SSE timeouts**: `/sandboxes/{id}/exec/stream` should not impose any timeout shorter than the request body's `timeout_seconds`. Hosting/runtime timeouts (uvicorn, Coolify reverse proxy) must be ≥ the configured maximum (recommend 2h ceiling).
5. **WebSocket subprotocol parsing** for `bearer.<token>` in PTY + fs-watch routes (as in §3.2 / §3.3). Reject the upgrade with 4401 close code on auth failure (browsers can read close codes; HTTP 401 on a successful upgrade is undefined).
6. **`Access-Control-Expose-Headers: X-Sandbox-Id, X-Tier`** on every response so the browser can verify the orchestrator agrees with the token claims (defense in depth — catches tier-routing mistakes early).
7. **Audit log** for every bearer-token request: `(jti, sub, actor.user_id, scope, route, status)`. We already log on the master-key path; reuse the same sink.

### 4.2 Tests / acceptance criteria

| Scenario | Expected |
|---|---|
| `pnpm install` on a fresh sandbox via SSE | Streams output continuously for ≥ 8 minutes without disconnect; final `exit` event delivered. |
| `git clone` of a 500MB repo via SSE | Streams progress lines; completes; `exit code 0` event. |
| Open PTY via WS, type `vim file && :q!` | Cursor moves correctly; bytes flow both ways; `cols`/`rows` resize works. |
| Token replay | A `single_use:true` token used twice → second connection rejected with WS close code `4401`. |
| Expired token | TTL +1s elapsed → `401 Unauthorized` on REST, `4401` close on WS. |
| Wrong sandbox | Token for sandbox A used to dial sandbox B → `403 Forbidden`. |
| CORS | Preflight from `https://www.aimatrx.com` succeeds; preflight from `https://attacker.example` fails. |
| Master key still works | `X-API-Key` request to `/exec/stream` (no Bearer) → succeeds (Next.js fallback continues to function). |

### 4.3 Documentation

- Update `/api-surface` to include the new `/access-tokens` route.
- Add a short README section on the token model (how Next mints, how the orchestrator validates, what the scopes mean).
- Note in the orchestrator's CHANGELOG: this is **additive** — no existing routes change shape; the `Authorization: Bearer` path is opt-in.

---

## 5. matrx-admin side of the migration (planned, not blocking the Python team)

Once §4 ships:

1. New helper: `useSandboxAccessToken(sandboxId, scopes)` — hits `POST /api/sandbox/[id]/access?scope=…`, caches the token in memory for `(exp - 30s)`, refreshes lazily.
2. `SandboxProcessAdapter.stream()` switches from `/api/sandbox/[id]/exec/stream` to `${direct_url}/sandboxes/<sandbox_id>/exec/stream` with the bearer token. Old proxy route stays as fallback for one release.
3. PTY: `openPty()` no longer relies on the Vercel WS upgrade; it dials `wss://…` directly with the `bearer.<token>` subprotocol. The 426 fallback path can finally be deleted.
4. File watcher and bulk transfer move next; same pattern.
5. After two releases without falling back to the Vercel proxies, delete the proxy routes (`/api/sandbox/[id]/exec/stream`, `/api/sandbox/[id]/pty`, `…/fs/watch`).

The Vercel `maxDuration = 300` ceiling becomes irrelevant — the only routes that go through Vercel after the migration are short-JSON CRUD that completes in < 5s.

---

## 6. Out of scope

- Replacing the Supabase ownership check with an orchestrator-side check. We deliberately keep the `sandbox_instances` table authoritative on Next.js — orchestrator only knows tokens.
- Changing the orchestrator's existing `X-API-Key` master path. Token-based auth is additive.
- Switching to a different transport (gRPC-Web, etc.). HTTP/SSE + WS is sufficient and well-supported in browsers.
- A general-purpose user JWT minted directly by Supabase. We prefer scoped, short-lived, single-sandbox tokens — the blast radius of a leaked token is one sandbox for at most 15 minutes.
