# Speed-test census — the empty-route baseline

What a route costs before it does anything. Every module with its own `layout.tsx` has an empty
`/<module>/speed-test` page (76 under `(core)`), plus `/speed-test` and `/administration/speed-test`.
Each renders `lib/perf/SpeedTestPage.tsx` only (shell + one heading, noindex, fetches nothing,
hidden from route discovery via `utils/route-discovery/scan-fs.ts`). `speed-test` is reserved as a
marketing brand key (`features/marketing/lib/keys.ts`). The SQL twin
(`migrations/marketing_brand_site_url_slugs.sql`) is a ledgered one-time backfill, so it cannot be
edited; `topical-maps` is already missing from it as well.

## Running it

    node scripts/speed-test-census.mjs                     # shared preview: admin, member, signed out; every route
    node scripts/speed-test-census.mjs --as admin,member --out <file.md> --json <file.json> /speed-test /marketing/speed-test
    node scripts/speed-test-census.mjs --base https://www.aimatrx.com   # live, signed out only

Run `pnpm preview:ready /speed-test` first. Sign-in goes through `scripts/dev-login.sh`, one nonce per
identity. Dev-server timings are inflated, so on localhost count the requests; take timings from live.

## Results — 2026-10-18

### Live, signed out (www.aimatrx.com, all 78 routes)

Full per-route tables: `docs/perf/speed-test-census-live-2026-10-18.md`.

- **The empty `(core)` page, signed out, makes 0 DB calls** on 72 of 78 routes. It still ships
  **249 JS files / 13.5 MB decoded (4.3 MB on the wire)** for one heading. That is the shell, not the page.
- **TTFB 0.3–4.6 s** on the same empty page (`/voice` 4.2 s, `/education` 4.6 s, `/presentations` 3.9 s,
  `/reports` 3.9 s, `/messages` 3.5 s), while `/chat` was 0.36 s. That spread is the cold-route Lambda, not
  work. The 103 Early Hints response comes about 400 ms before the real first byte (e.g. `/speed-test` 103 at 253 ms, real 641 ms).
- 11 module layouts redirect a signed-out visitor to `/login`. On those routes only 90 files / 4.9 MB load:
  administration, dashboard, detail, hr, launchpad, masterwork, projects, scraper, tasks.
- **Module layouts that fetch on an empty page (signed out):**
  - `/spaces`: rpc `space_sidebar` (+ CORS preflight) → **401**, then the client navigates to `/login`.
  - `/user-settings`: table `taxonomy_node` ×2 (+ preflight ×2) → **401** (duplicate), plus about 30 RSC
    prefetches of every settings sub-route (each ×2).
  - `/images`: about 23 RSC prefetches of every images sub-route, **each fetched twice** (43 Next requests on an empty page).
  - Smaller prefetch fans: 11 Next requests on agent-connections, artifacts, cms, context-items, esign, maps,
    organizations, schedules, surfaces, work; 9 on data, documents, marketing, messages, messenger, notes, sandbox,
    scopes, search, workbooks, staff. On Vercel each prefetch is its own proxy Lambda (CLAUDE.md, proxy.ts).
- JS outliers over the 13.5 MB shell: `/spaces` 17.1 MB, `/user-settings` 16.3 MB, `/notes` 15.8 MB,
  `/marketing` 14.4 MB. The extra code is in the module layout itself, since the page is empty.

### Why each request on the empty `/speed-test` exists

Format: call · what asked for it · needed for first paint? · proposal.

Browser, signed out (live, measured):
1. `GET /speed-test` document · navigation · yes · keep.
2. `POST /api/set-theme` (after settle) · the theme sync in the shell · no · fold into the one lazy
   after-paint function, or delete: the theme is already in the cookie/HTML for this load.
3. `POST /api/diagnostics/client-error` (after settle) · something on the EMPTY page threw a client error ·
   no · find the throw and delete it. An empty page must report zero errors.
4. `POST /api/acquisition/first-touch` (after settle) · acquisition first-touch tracking · no · fold
   into the one lazy after-paint function (signed out only).

Server, signed in (from `app/(core)/layout.tsx`; the browser cannot see these):
5. `getClaims` · proxy + layout identity · yes · keep (local JWT check, no network).
6. `auth.getSession` · layout, for the access token in Redux · yes · keep (cookie read).
7. `admin.admins` read (`getAdminStatus`) · admin level for the shell · yes for admins' chrome · fold
   into `iam.core_boot_seed` (one round trip instead of two).
8. rpc `user_usage_state` · usage-gate seed · no (only needed when an AI call starts) · move it into
   the one lazy after-paint function, or into `core_boot_seed`.
9. rpc `iam.core_boot_seed` · org/boot seed · yes · keep as THE one boot read.
10. rpc `knob_snapshot_delta` · feature-knob seed · partly · fold into `core_boot_seed`.

NOT MEASURED (retried 2026-10-18 after the walk-cap burst change, still blocked): the census host got parked at `/__dev-walk` — it was on a different host than the hold, and is now run with `MATRX_PREVIEW_SESSION=speed-test-census`, and the script presses Resume itself. Then the preview restarted (fresh server, holds dropped), and signed-in `/speed-test` was still loading after 895 s with both dev-logins failing (503 / 180 s timeout). Original note: NOT MEASURED: the signed-in browser DB calls (admin and member). The shared preview could not serve a
signed-in `/speed-test` after the restart: `preview:ready` was still loading after 870 s, and both dev-logins
in the census timed out at 180 s. Rerun: `MATRX_PREVIEW_SESSION=speed-test-census pnpm preview:ready /speed-test --hold 120 && MATRX_PREVIEW_SESSION=speed-test-census node scripts/speed-test-census.mjs --as admin,member /speed-test /chat/speed-test /notes/speed-test /marketing/speed-test /agents/speed-test /files/speed-test /administration/speed-test` (the census host MUST match the held session's host).

## Status (2026-10-17, paused for a machine restart)

- DONE: the pages, the reserved key, the discovery skip and the census script are all pushed.
  `pnpm type-check` shows no errors in these files. The script's one smoke run worked end to end,
  but the walk cap answered 503, so it recorded no data.
- (superseded 2026-10-18: live signed-out results above.) Earlier: The shared preview was blocked for about 45 minutes in a row: an auth
  rate limit (dev-login 429), a package module error (500), a build error from another lane's
  uncommitted spaces files (`features/spaces/store/sample.ts` missing from the checkout), and all
  4 walk-cap slots held by other lanes. `preview:ready` finally reported READY just as the pause was called.
- PENDING:
  1. After the restart: `pnpm preview:ready /speed-test`, then
     `node scripts/speed-test-census.mjs --as admin,member --out <mktemp>/census.md --json <mktemp>/census.json`
     (78 routes × 2 identities; the first pass compiles each route).
  2. Paste the summary table and the per-route tables here.
  3. Group every DB call on `/speed-test` by why it exists (call · what asked for it · needed for first paint · proposal).
     Server-side reads the browser cannot see, taken from the code (`app/(core)/layout.tsx`):
     getClaims (local, no network) · getSession (cookie) · `admin.admins` read (getAdminStatus) ·
     rpc `user_usage_state` · rpc `iam.core_boot_seed` · rpc `knob_snapshot_delta`.
  4. `check:route-metadata` flags `/speed-test` (no favicon entry) and `/administration/speed-test`
     (no letter). These were left on purpose: the shared favicon registry would add bytes to every route.

## Shell calls on the empty signed-in page — before/after (2026-10-18, shell-calls lane)

Measured on the shared preview (`MATRX_PREVIEW_SESSION=speed-test-census`, dev server: timings inflated,
counts are what matter), `/speed-test` and `/chat/speed-test`, admin + member, 5 s idle after settle.
`--caller-frames <n>` (new flag) shows the deeper initiator stack; it is how each opener below was found.

| route | who | DB before settle | DB after settle |
|---|---|---|---|
| /speed-test | admin | 1 → **0** | 8 → 7 (requests incl. preflights) |
| /speed-test | member | 1 → **0** | 8 → 7 |
| /chat/speed-test | admin | 3 → 2 | 12 → 11 |
| /chat/speed-test | member | 3 → 2 | 10 → 9 |

`/chat` before-settle rows left are `route_seed` (chat layout lane) and the chat realtime opener (`onRealtimeManagerChange`), not shell.

Empty `/speed-test`, every call, BEFORE → AFTER (preflights folded):

| call | before | after | why / what changed |
|---|---|---|---|
| realtime WebSocket | before settle | after settle | Opened at boot by `PreferencesLiveSync` (`useChannel` on the person's `user_preferences` row). Now joins on `useLateIdleReady`, the same tier `PlatformDirectiveSubscriber` already used, so the one socket opens after settle. Kept: directives (refresh required, settings changed) and cross-tab preference edits need it. |
| `/.well-known/jwks.json` | after | **gone** | The dev surface-row guard called raw `getClaimsUser(supabase)`, which fetched JWKS. It now uses `getClientClaimsUserCached` (pinned signing keys, no fetch). |
| `/api/person/timezone` | after | **gone, route deleted** | It duplicated `PersonTimeZoneCapture`, which already writes the browser's `Intl` zone straight to the person's `user_preferences.display.timeZone` (the field `record_person_timezone` and the SMS gate read), only when it differs while following the device. The sign-in POST and the SMS-enrolment POST are both removed. |
| `user_surface_state` | after (×1) | after (×1) | Kept: the summon persistence boot read (`OverlayServices` → `loadAll`) restores the windows a person left open (and seeds a new tab from their workspace). One read, deduped, minimum fields (`surface_key,state,version`). Making it lazy would need a "nothing saved" marker that breaks cross-device restore. |
| `ui_surface ?name=eq.matrx-user/canvas` | after | after, **dev only** | `SurfaceRowGuard` returns at once when `NODE_ENV === "production"` and is now also not mounted in production; on dev it waits for the late tier. Never runs in a production build. |
| rpc `shell_counts` | after | after | Kept: THE one lazy after-paint function (late tier, ~6 s after idle). Nothing else was left to fold into it: timezone needed no call at all. |
| `/api/acquisition/first-touch` | after | after | Unchanged: already once per browser ever (`acquisition.first-touch-filed.browser` in localStorage, checked before the late tier). The census shows it because every census run is a brand-new browser. |

Remaining on empty `/speed-test` in production after settle: socket, `user_surface_state`, `shell_counts`,
and first-touch on a browser's first visit only. That is one over the ≤2 target: `user_surface_state` is the
window-restore read. Observed once (admin run): a second WebSocket 1.4 s after the first with no app frames
(looks like a reconnect); not reproduced for member.

Guard: `app/__tests__/empty-page-shell-calls.test.ts` (fails 3/4 on the pre-change tree via
`SHELL_CALLS_ROOT=<old tree>`, passes 4/4 now).

## Notes and Chat module layouts (2026-10-18, page speed lane)

Shared preview, signed in, `scripts/speed-test-census.mjs`. DB = DB calls before / after settle (preflights included). Dev timings are inflated; counts and JS files are the point.

| Route | Who | Before DB | After DB | Before JS files | After JS files |
|---|---|---|---|---|---|
| `/notes/speed-test` | admin | 9 / 25 | 0 / 7 (same as `/speed-test`) | 257 | 256 (see open item) |
| `/notes/speed-test` | member | not measured clean (see note) | 0 / 7 | 244 (mid-change) | 219 (`/speed-test`: 217) |
| `/notes` | admin | 9 / 25 | 4 / 26 | 256 | 259 |
| `/notes` | member | not measured clean | 4 / 26 | 244 | 247 |
| `/chat/speed-test` | admin | 3 / 12 | 2 / 11 | 231 | 231 (`/speed-test`: 229) |
| `/chat/speed-test` | member | 3 / 10 | 2 / 9 | 219 | 219 (`/speed-test`: 217) |
| `/chat/new` | admin | 3 / 14 | 2 / 13 | 250 | 249 |
| `/chat/new` | member | 3 / 12 | 2 / 11 | 238 | 238 |

Note: the member "before" notes rows were taken while the first fixes were hot-reloading into the shared preview, so they are not a clean baseline. The admin rows and all chat rows are clean. Chat code was not changed; its one-call drop is run-to-run variation in the shell's own calls.

What the notes layout dragged in, and where it went:
1. **The whole notes workspace on every page under `/notes`.** `NotesRouteBody` rendered `NotesView` (list, assists, realtime) under every segment, hiding the page in a `display:none` div, so `/notes/speed-test` ran the full workspace. Now static segments (`speed-test`) and `/diff` are their own pages, and `NotesView` is split at that route condition (`next/dynamic`, SSR on), so its code loads only where it renders. Member JS on the empty page: 244 → 219 files.
2. **`notes ?select=id … limit=1000` (~570–930 ms).** This came from `NotesAssistStrip` → `fetchAllNoteScopes`, which re-read every visible note id before reading scope tags. The ids now come from the notes already in the store, and the strip's sweep waits for the list and for idle time. The id read is gone on every caller (sidebar scope grouping, Notes window, agent write refresh).
3. **`rpc get_notes_shared_with_me`.** No longer read on route entry. The "Shared with me" header is always shown once the list is in. Opening it reads the list, and so does opening a note someone else owns. Focus, realtime catch-up and Refresh re-read it only once it has been opened (`fetchSharedNotesList({ ifIdle | ifLoaded })`).
4. **`rpc list_my_presentable_assists`.** Kept: the canonical `AssistStrip` renders those chips on `/notes`.

Chat layout: it awaits nothing (a sync server layout). On the empty page its reads are `route_seed` (sent by `ChatRouteSeedStart`) and the sidebar history's child-status reads (`conversation`, `user_request`). Both feed the chat sidebar menu, which the route-menu registry renders on every `/chat/*` page. `ChatPasteOffer`'s import graph (data-sources, unified-data) is already in every route through `providers/chatUiRegistrationBase.ts`, so moving it out of the layout would save nothing. The ~19 s first paint is the first compile of the `/chat` segment (and of `/chat/new`'s page), not anything the layout awaits. Warm, `/chat/speed-test` paints in 0.5–1 s.

Guard: `features/notes/__tests__/notes-layout-reads-on-demand.test.tsx` (7 tests; 5 failed before the change, all pass after).

Open: admin `/notes/speed-test` still loads 256 JS files against member's 219, with no notes reads. Its after-settle calls are the shell's (DM summary, `ues_list`, `knob_index`, `user_surface_state` writes), which points at admin surface state restored after a walk. Not traced. Shared notes that RLS also returns in the owner list now show in Recent until "Shared with me" is opened. Before, they moved to that section as soon as the page loaded.

## 2026-10-18 — load-contract fixes from the adversarial review (engaged-late everywhere)

Census `--as admin,member --caller-frames 12 /speed-test /notes /chat/new /marketing/speed-test` on the shared preview (session `fixes`). DB before / after settle, untouched; WS = realtime socket opened on the untouched page.

| route | admin before fix | admin after | member after | WS after (admin / member) |
|---|---|---|---|---|
| /speed-test | 0 / 7, WS at +8.2 s | 0 / 24 | 0 / 4 | none / none |
| /notes | 4 / 26 (jwks + assists before settle), WS | 2 / 30 | 2 / 10 | none / none |
| /chat/new | (500 during the before run) | 2 / 29 | 2 / 6 | 1 / none |
| /marketing/speed-test | (500 during the before run) | 0 / 24 | 0 / 4 | none / none |

- The admin "after" counts went UP because of shared-account state: the admin seat restores a saved "Agent Info Editor" window (`definition?id=eq.agent-settings-window`, `agx_*`, `model_offering`, `ues_get_bulk`, `user_surface_state` writes) on every route. Member has no such window: 4 after-settle calls on an untouched page (layout + `shell_counts`).
- Realtime: `PreferencesLiveSync`, `PlatformDirectiveSubscriber`, `ExtensionBridgeSubscriber` and the notes channel (`features/notes/redux/realtimeMiddleware.ts`) now join on the engaged-late tier. Untouched pages open no socket, except admin `/chat/new`: `watchSidebarChildren` in `@ai-matrx/chat` (package code, owned by the chat lane — not changed here).
- Also moved to engaged-late: the inbox approvals badge (`useInbox`), the org cap reminder (`useOrganizationCap` `deferToIdle`), the /notes assist strip (its scope read, assists list and every emit), and the dev-only surface-row guard. "Needs you" was already engaged-late (its producer gates on `useHasEngaged` + the settled shell count); only the comment was stale.
- `ui_surface ?name=eq.matrx-user/canvas` comes ONLY from `features/surfaces/dev/surface-row-guard.ts`, which returns early in production. It is a dev artifact. It now waits for engagement too.
- Preferences: one re-read when the channel first connects (closes the join gap). The own-save version is noted BEFORE the update request (its echo can beat the response) and given back if the guarded update did not land. Tab-focus revalidation (`revalidateOnFocusAfterMs`) is unchanged.
- /notes: `jwks.json` is gone (the raw `getClaimsUser` in `awaitCurrentNotesUser` — fetchNotesList — plus two save-path siblings now use `getClientClaimsUserCached`, which verifies against the pinned keys). `my_organizations_by_ids` is read only for the organization grouping. "Shared with me", opened before its read lands, holds placeholder rows (the count it had last time, at least one) so arriving rows replace them instead of pushing the sections below.
- /notes route reads, untouched: before the fix `shown_to_context`, notes, `assoc_for_sources` ×2, `my_organizations_by_ids`, `home_names`, `context_scopes` and the five assists calls. After: `shown_to_context` (before settle), notes, one `assoc_for_sources`, `home_names`. Still 4, not the 1–2 target. The list still lands after the settle mark (dev). The 8-row list skeleton holds its place, and CLS is 0.
- Scope tree: projects are read with `projects.in_my_organizations` (migration `20261018200000_in_my_organizations_projects.sql`, applied + ledgered). A project's organization past page 1 gets its row by id (`iam.my_organizations_by_ids`). Live parity as test@test.com (12 organizations; at `p_limit 10` all 11 projects sit on page 1, so it was forced to `p_limit 2`): first-page reader 8 of 11, server scope 11. "V-19 Receipt Check" is a project in an organization past page 2. `my_organizations_by_ids` answers those organizations.

Guards: `lib/boot/__tests__/engaged-late-load-contract.test.ts`. 11/11 fail on the parent sources (`LOAD_CONTRACT_ROOT=<tip export>`) and 11/11 pass after. `features/organizations/service/__tests__/org-scoped-readers-ask-the-server.test.ts` gained the projects reader and the scope-tree boot read: 17 pass.
