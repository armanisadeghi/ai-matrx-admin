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

## Status (2026-10-17, paused for a machine restart)

- DONE: the pages, the reserved key, the discovery skip and the census script are all pushed.
  `pnpm type-check` shows no errors in these files. The script's one smoke run worked end to end,
  but the walk cap answered 503, so it recorded no data.
- NO CENSUS RESULTS YET. The shared preview was blocked for about 45 minutes in a row: an auth
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
