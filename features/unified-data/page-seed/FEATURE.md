# FEATURE.md — `unified-data/page-seed`

**Status:** `active`
**Tier:** `2`
**Last updated:** `2026-10-08`

---

## Purpose

A table page (`/data/<table>`, `/data/<table>/r/<record>`) starts its first reads on the server as the
signed-in person, while the browser is still loading the app. With the person's knob
`data/server_rows` on, the grid's first page is drawn in the server's HTML too.

---

## Entry points

- `app/(core)/data/[tableId]/page.tsx`, `app/(core)/data/[tableId]/r/[recordId]/page.tsx` — call `readTablePage`.
- `tablePageSeed.server.ts` — `readTablePage(tableId, recordId, { rows, forceOn })` → `{ gate, seed }`; neither rejects.
- `PrimedTablePages.tsx` — primes the page's stores from `seed`; with the gate on, wraps the page in `RecordsSeedProvider`.
- `primeTablePage.ts` — browser half: the server's answers go into the stores the page's own reads fill.

## Knobs

| Knob | Default | Meaning |
|---|---|---|
| `data/server_rows` | ON (platform, 2026-10-08) | draw the grid's first page in the server's HTML when the server's seed wins the race |
| `data/server_rows_cap_ms` | 1200 | the longest the page waits for the server's reads, counted from the request's start; past it gate = off, seed = null, the browser asks at once |
| `data/server_rows_budget_ms` | 8000 | retired by SSR-ROWS-3 (no reader); archiving it is a platform-admin act, still to do |

Both live knobs reach the server inside `custom.table_page_bundle`'s `server_rows` part (`serverRowsOf`, `@ai-matrx/records-ui/first-page`), so deciding costs no extra read.

## How the reads run (SSR-ROWS-3)

Session (`getClaimsUser`) and `custom.where_id_opens` start together. `custom.table_page_bundle` (and on a record page `custom.record_page_bundle`) start the moment the organization is known; the grid's first page starts the moment the bundle names the view and sort. These steps cannot overlap further: both bundle doors and `read_records_page` take the organization from `where_id_opens`, and the page's `p_sort` needs the table's `default_sort` and the sort field's type from the bundle. One clock from the request's start resolves the gate and the seed at the cap.

Guards: `__tests__/server-rows-are-off-unless-the-knob-says-on.test.ts` (a 4 s store gives no seed at exactly 1.2 s; a hung store is off at the cap; a warm store gives its seed; session and where start within 50 ms of each other; the bundle never waits on the session).

## Production measurement and decision (SSR-ROWS-3, 2026-10-08)

`pnpm perf:data --pages --base https://www.aimatrx.com`, live commit `a4d564e424`, admin@admin.com, the Deliverables table, knob on and off by the person's override, runs interleaved on/off. Grid "rows visible" in ms (server HTML rows in brackets):

| Run | cold ON | cold OFF | warm ON | warm OFF |
|---|---|---|---|---|
| 1 | 1432 (532) | 2073 (0) | **8350 (0)** | 2171 (0) |
| 2 | 1666 (532) | 2148 (0) | 1535 (532) | 2619 (0) |
| 3 | 1751 (532) | 1875 (0) | 896 (532) | 1908 (0) |

Rule: flip the platform default ON only if cold-ON ≤ cold-OFF + 300 ms on every run AND warm-ON ≤ 2.5 s.
Cold: met on all three runs (ON beat OFF by 124–641 ms). Warm: **not met**. Run 1 warm-ON took 8350 ms.
Its server sent no rows (the seed missed the cap), and the app's first store call came at 6718 ms. The
same run's `/data` cold load (no page seed involved) also started at 6412 ms. That points to an
app-wide hydration stall, not the seed, but the rule does not allow exceptions.

Coordinator ruling: run 1's stall did not count, so three more warm ON/OFF pairs were run, alternating
(the harness also records cold; flip only if every warm ON is ≤ 2.5 s and ≤ its paired OFF):

| Run | cold ON | cold OFF | warm ON | warm OFF |
|---|---|---|---|---|
| 4 | 3501 (0) | 1890 (0) | 1113 (532) | 1892 (0) |
| 5 | 1300 (532) | 1607 (0) | 1390 (532) | 1883 (0) |
| 6 | 1248 (532) | 3168 (0) | **3353 (0)** | 1977 (0) |

Run 6 warm ON took 3353 ms. That is over 2.5 s and slower than its pair, and nothing else stalled
(first store call at 851 ms; that run's `/data` loads took 537–596 ms). The same happened on run 4 cold
ON (3501 ms vs 1890 ms). **When the server misses the cap, the page is ~1.2–1.6 s slower than OFF**:
the browser only starts asking at the cap, and its reads then take as long as they do with the knob
off. A load whose seed lands is ~0.5–0.8 s faster than OFF. So "a cap that never costs anything" does
not hold. A miss costs about the cap itself, and misses happen on production.

**Decision (at that point): platform default stays OFF.**

## Item 3 finished: the browser never waits (SSR-ROWS-3, 2026-10-08)

`PrimedTablePage` asks the browser's own first reads the moment it renders in the browser
(`clientTableSeed.ts`), outside the boundary the server's rows stream into, and draws the page from
whichever seed lands first. When the server's seed wins, the page stays drawn from it
(`settled`). When the browser's wins, the pending server boundary is client-rendered and the
server's later seed is ignored. Until one lands, the route's own `TableRouteSkeleton` shows. Each
of the browser's doors is answered by whichever comes first: its own call, or the same door and
arguments in the server's streamed seed (`racingDataSource`), so a door the server already answered
is never asked again. The first build of the race skipped that step and knob-off loads got ~1 s
slower (2.7–3.0 s), from three serial browser reads.

Production, live `814eb7174f`, same harness and table, ON/OFF alternating:

| Run | cold ON | cold OFF | warm ON | warm OFF |
|---|---|---|---|---|
| 7 | **7039 (0)** | 2530 (0) | 1608 (532) | 1955 (0) |
| 8 | 1269 (532) | 2152 (0) | 1142 (532) | 2022 (0) |
| 9 | 1890 (532) | 2565 (0) | 1229 (532) | 1883 (0) |

Rule: flip ON only if every ON ≤ its paired OFF + 300 ms. Run 7 cold breaks it. That load was the
first one after the deploy went live. The page's first store call came at 5032 ms, and the same
run's `/data` cold load (no page seed involved) first read at 6487 ms, so it was an app-wide cold
start. Every other comparison passes, with ON 0.3–0.9 s faster than OFF.
**Ruling (coordinator, 2026-10-08):** run 7 was a stall right after a deploy and does not count.
**`data/server_rows` is ON for the platform**, set through `platform.feature_knob_set`. The knob's
`basis` records the ruling and these pairs (campaign `ssr_rows_3b_server_rows_on_basis.sql`). The
test accounts' per-person ON overrides were removed, so the platform default is what applies.

The record page (`PrimedRecordPage`) races the same way: the server's seed for that record against
the browser's own (`askClientTableSeed` with `recordId`, the record's bundle). Until one lands it
shows `RecordRouteSkeleton`, the same component its `loading.tsx` draws.

## After the flip: a plain member was slower (SSR-ROWS-3, 2026-10-08)

test@test.com, no override, live `6c4a1ef1b1`, Deliverables. Default ON vs a per-person OFF override,
rows visible in ms, no server rows in any load:

| Pair | cold ON | cold OFF | warm ON | warm OFF |
|---|---|---|---|---|
| 1 | 4106 | 3225 | 8061 (stall: first store call 5217) | 2978 |
| 2 | 8380 (stall: first store call 5209) | 3797 | 3910 | 3059 |
| 3 | 5760 | 3167 | 3582 | 2827 |

Cause, from a network probe: with the knob ON the server also asks the rows, its seed misses the
cap, and the capped seed threw away the `where` + bundle answers that had already landed. The
browser then asked where → bundle → page in series (bundle at ~1.1 s, page at ~1.6 s). With the
knob OFF it took the bundle from the server and asked the page at ~0.85 s.
Fix (`f6a8ef7be4`): `readTablePage` also returns `opening`, the server's where + bundle streamed the
moment they land and never capped. The browser's reads take each door from the opening, the full
seed or the network, whichever comes first. **Not yet measured on production:** the release train
had not shipped since `6c4a1ef1b1` when this was written.

## With the opening fix live: still slower for a member, so OFF (SSR-ROWS-3, 2026-10-08)

Live `9a262e1a00` (contains `f6a8ef7be4`), platform OFF (set back at 15:19 UTC), ON by a temporary
per-person override, fresh browser per run, Deliverables, rows visible in ms. All overrides cleared
afterwards.

| Who / pair | cold ON | cold OFF | warm ON | warm OFF |
|---|---|---|---|---|
| member 1 | 4611 | 3256 | 7412 (first store call 4264) | 2971 |
| member 2 | 3359 | 3626 | 3796 | 2867 |
| member 3 | 4550 | 3127 | 3335 | 2813 |
| admin 1 | 4419 | 2051 | 1714 | 1900 |
| admin 2 | 2005 | 2412 | 1044 | 2233 |
| admin 3 | 1692 | 4312 | 1401 | 3499 |

For admin, ON is faster in 5 of 6 comparisons (server rows land). For the member, ON is slower in 5 of
6 even with the uncapped opening: the member's server seed never carries rows, so ON only adds the
server's extra work and a later page. **Platform default stays OFF.** The member path needs its own
diagnosis (why the member's server seed has no rows on a table where admin's does) before ON can help
everyone.

## A store timeout is said, never waited out (AT-FIX-G4, 2026-10-19)

If the table's bundle (or the record's, or `table_facts`) answers a statement timeout (57014) during the browser's first reads, `askClientTableSeedHonestly` asks once more by itself; if the store still times out, `TableTimedOut` draws the shared timeout sentence and Try again inside the skeleton's own box (the skeleton stays mounted, still: zero layout shift). Try again re-asks. Guard: `__tests__/a-timed-out-table-page-says-so-in-its-own-box.test.tsx`. Live check: `scripts/airtable-walk/g4-timeout-walk.mjs`.

## The member's seed now lands; still OFF by the rule (SERVER-ROWS, 2026-10-20)

Cause of the member's missing rows, timed door by door as test@test.com (server-seed chain from a node client, Workspace table of 420 rows): `custom.my_levels` of the page's 100 ids took 2.2–4.3 s (admin asks none: an editor needs no per-row answer). It walked `custom.effective_level_many`, the ladder's halving per id. Fix (campaign `serverrows_a_a_pages_levels_are_read_the_way_the_page_reads_them.sql`, matrx-frontend `d08e268273`): records go through `custom.levels_of`, the set path the page read itself uses; same answer (1,397 ids over 150 member/admin pairs, 0 different), ~0.2–0.3 s. Guard: `scripts/campaign-tests/serverrows_a_…sql` (red before, green after). Member chain after: 1.25–1.95 s; admin 0.91–1.40 s.

Live, www.aimatrx.com, Brightline service jobs (420 rows), ON by a temporary per-person override (cleared after), fresh context per pair, rows visible in ms (server HTML rows):

| Who / pair | cold ON | cold OFF | warm ON | warm OFF |
|---|---|---|---|---|
| member 1 | 2646 (342) | 3118 | 1711 (342) | 2396 |
| member 2 | 1756 (342) | 3060 | 1563 (342) | 2431 |
| member 3 | **3432 (0)** | 2904 | 1503 (342) | 2267 |
| admin 1 | 1368 (342) | 2909 | **5346 (0)** (first store call 4036) | 2100 |
| admin 2 | 2347 (342) | 3010 | 1596 (342) | 2132 |
| admin 3 | 1376 (342) | 2769 | 1073 (342) | 2158 |

The member's seed now carries rows (5 of 6 ON loads), and every landed ON is 0.5–1.5 s faster. Two ON loads missed the cap and broke "every ON ≤ its paired OFF + 300 ms" (member 3 cold +528 ms, admin 1 warm +3246 ms, an app stall). **Platform default stays OFF.** What is left is the miss itself: a seed past the cap costs about the cap. The chain is where → bundle → page → (levels, headers, aggregates) in series, owned by the bundle and read lanes.
