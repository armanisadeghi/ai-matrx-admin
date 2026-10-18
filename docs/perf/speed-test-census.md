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

NOT MEASURED: the signed-in browser DB calls (admin and member). The shared preview could not serve a
signed-in `/speed-test` after the restart: `preview:ready` was still loading after 870 s, and both dev-logins
in the census timed out at 180 s. Rerun: `node scripts/speed-test-census.mjs --as admin,member`.

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
