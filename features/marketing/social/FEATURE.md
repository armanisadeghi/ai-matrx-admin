---
type: Feature
title: "Social Intelligence UI (marketing/social)"
description: "The Socials section at /marketing/[brandId]/socials: data layer, standards components, Accounts, account detail, post detail (SI-07a), Outliers + watchlists, KPIs + goals + benchmark, the Analytics social panel and the agency roll-up (SI-07b1 / SI-08)."
tags: [marketing, social, ui]
timestamp: 2026-10-09
---

# features/marketing/social

Product truth: `common-docs/systems/marketing/social/` (VISION, UI-SPEC = the blueprint, SCHEMA, PLAN §4/§9).
Server contract: `aidream/aidream/services/social/FEATURE.md`. Built by lane SI-07a; SI-07b (Studio, Swipe, Outliers)
and SI-07c (Ads, KPIs) fill the other tabs and **build on the modules listed here — never a second copy**.

## Routes (`app/(core)/marketing/[brandId]/socials/`)

| Route | Renders |
|---|---|
| `/socials` | redirect to `/socials/accounts` (temporary redirect, never a cached 308) |
| `/socials/accounts` | `AccountsTab` (live) |
| `/socials/outliers` | `OutliersTab` (live, SI-07b1) |
| `/socials/kpis` | `KpisTab` (live, SI-08) |
| `/socials/{studio,swipe,ads}` | `SocialsTabPlaceholder` — a registry row each (`marketing.social.<tab>`), announced through `announceComingSoon`; replace the page body, keep the route |
| `/socials/[platform]/[accountId]` | `AccountDetail`. `accountId` is the **shared profile id** (`social.social_profile.id`), not the tracked-account id, so an untracked profile also opens |
| `/socials/post/[postId]` | `PostDetailPage` (same body as the drawer) |

`layout.tsx` mounts `SocialsShell`: ONE header row via `RecordPageHeader` (tab strip in the mode slot, `Track account`
as the primary action) and the header-offset scroll body. Tabs are route segments. A tab's page renders only its body.

## Module map — import these, do not re-derive

Data layer
- `@/features/marketing/social/types` — row aliases off `types/database.types.ts` (`SocialProfileRow`, `SocialPostRow`,
  `PostStatRow`, `TrackedAccountRow`, `SwipeCollectionRow`, `SocialAdRow`, `WatchlistHitRow`…), `SOCIAL_PLATFORMS`,
  `TRACKED_ROLES`, `SOCIALS_TABS`, the server shapes (`IngestPostResult`, `TrackAccountInput`…) and the view models
  `PostCardModel`, `AccountRow`, `OutlierInput`.
- `@/features/marketing/social/service` — direct Supabase reads/edits under RLS (`readAccountRows`, `readProfilePosts`,
  `readPostDetail`, `readPostMetricSnapshots`, `readPostTranscript`, `readPostAnalysis`, `readSwipeCollections`,
  `readProfileSnapshots`, `updateTrackedAccount`, `setTrackedRole`). `readAllRows` on every unbounded list.
- `@/features/marketing/social/server` — typed client for aidream `/social` via `lib/python-client`
  (`ingestPost`, `ingestProfile`, `trackAccount`, `untrackAccount`, `refreshProfile`, `getTranscript`, `analyzePost`,
  `listPostMedia`, `fetchPlaybackUrl`, `createCollection`, `addToCollection`, `socialErrorCode`, `socialErrorMessage`).
  Every call names the **brand's** organization. `ads/search`, `outliers`, `save-link`, `capabilities` are documented
  server doors NOT yet wrapped — SI-07b/c add them here, same `CallOptions`.
- `@/features/marketing/social/stream` — the NDJSON contract as pure functions (`consumeSocialEvents`, `progressOf`,
  `SocialStreamError`). In-stream `error` events surface as `SocialStreamError` (carries `code`).
- `@/features/marketing/social/hooks` — TanStack Query hooks + `socialKeys` (`useAccountRows`, `useProfilePosts`,
  `usePostDetail`, `usePostMetrics`, `usePostTranscript`, `usePostAnalysis`, `useSwipeCollections`,
  `useInvalidateSocial`). A mutation calls `useInvalidateSocial()`.
- `@/features/marketing/social/mappers` — pure row→view-model rules (unit-tested): `toPostCardModel`, `buildAccountRows`,
  `judgeFollowerGrowth`, `filterAndSortPosts`, `postMetricSeries`, `availableMetrics`, `relativeAge`, `num`, `currentFollowers`. `outlier.ts` owns `profileBaseline` / `median` — the only place a creator's median views and engagement are computed (account page, Accounts table, KPI benchmark).
- `@/features/marketing/social/outlier` — THE tier thresholds + text (`outlierBadgeModel`, `formatMultiplier`,
  `formatCompact`, `formatPercentile`, `OUTLIER_TIER_THRESHOLDS`). One source; change a threshold here only.
- `@/features/marketing/social/link` — pasted-link helpers (`detectPlatform`, `looksLikePostUrl`, `handleFromInput`).

Standards components (`@/features/marketing/social/components/…`)
- `OutlierBadge` — `<OutlierBadge input={post.outlier} />` or `model=`. Handles tiers, `~` young posts, "11+ posts" no baseline.
- `SocialPostCard` — `<SocialPostCard post={PostCardModel} onOpen onSave compact />`. Thumbnail aspect reserved; platform
  mark; outlier badge; hook line; `⋯` menu. Does NOT use `card-and-grid` `Card` (an icon-launcher card, nothing to reuse).
- `PostDrawer` + `PostDetailBody` (in `PostDetail`) — `<PostDrawer post={card|null} onClose />` opens the right drawer from
  any card; `PostDetailBody` is the shared body.
- `MetricChart` (+ `seriesToCsv`, `contiguousRunSplit`) — one hand-drawn SVG chart for post metrics and account followers.
- `ProviderFallbackNotice` (+ `hasFallback`, `providerName`) — `via <provider>` chip with the reason as tooltip.
- `PlatformMark` (+ `platformLabel`) — wraps the existing `PropertyKindMark`, which already carries every social platform
  glyph on its brand color (no extension was needed).
- `SocialsContext` / `useSocials()` — `{brandId, brandSeg, organizationId, openTrack}` for any tab body.
- `TrackAccountDialog`, `AccountsTab`, `AccountDetail`, `SocialsShell`, `SocialsTabPlaceholder`.

## Outliers, KPIs, roll-ups (SI-07b1 / SI-08)

- `outliers.ts` (pure, tested) — `OutlierFilter`, `applyOutlierFilter`, `sortOutliers`, watchlist (de)serialization, hit resolution.
  A watchlist = `platform.saved_view` (surface `social.outliers`, `subject_id` = brand, written ONLY through the
  `saved_view_save` / `saved_view_archive` doors, read through `saved_view_list_lanes`). Its hits are **computed on view**:
  the filter applied to the brand's posts; a match with no `social.watchlist_hit` row is implicitly `new`; Mark seen /
  Dismiss / Restore upsert the row (`setHitStates`). Opening a post marks it seen. Dismissed hide behind a switch.
  **Alerts are a disabled control** (`OUTLIER_ALERTS_ENABLED = false`): no schedule, no auto-notification until approved.
- `OutliersTab` — one filter row (watchlist, platform, role, window 7/30/90d, min multiple, format, sort), Cards
  (`SocialPostCard`, with `extraActions` Why it worked / Dismiss and a new dot) or Table (`MatrxDataTable`), `PostDrawer`.
  "Why it worked" opens the drawer on its Breakdown tab (`initialTab`), which answers honestly while the agent is unbuilt.
  Platform and role pickers choose one or all (a stored multi-value watchlist shows "Several").
- `kpi.ts` (pure, tested) — goals in `social.kpi_goal`. UI metrics: followers, avg views (`views`), posts per week (`posts`),
  engagement rate (percent), outlier count (`custom` + label `Outlier count`; the table's CHECK has no such metric).
  `measureGoal` states each metric's rule; scope = the goal's account, else platform, else every `own` account.
  `goalProgress`: achieved / on track / behind / not enough history / no data / paused; cumulative goals (followers from the stored baseline,
  outlier count) are On track only when their pace so far projects to the target by the deadline (`KPI_MIN_PACE_DAYS` = 2: sooner reads "Not enough history"); level metrics are on track from 80% of target.
- `KpisTab` — goal tiles with progress + pace marker and pause/remove, Trend (a `MetricChart` per own account with the
  follower-growth judge), Benchmark (`MatrxDataTable`: followers, 30d growth, posts/week, median views, engagement,
  outlier rate; own rows first), Own channel (`BrandChannelPanel` for the owned YouTube channel; other platforms show
  "Coming with platform approvals").
- `readBrandSocialData` (service) — ONE direct read of the brand's accounts, 400 days of posts with stats (role attached)
  and follower snapshots; `useBrandSocialData` feeds Outliers, KPIs and the Analytics panel.
- `SocialAnalyticsPanel` — on the brand Analytics page beside `BrandChannelPanel` (tiles: tracked accounts, own
  followers, outliers 30d, goals on track; link to KPIs). `SocialReportsSection` — on `/marketing/reports`: cross-brand
  table of tracked accounts and recent (30d, 3x+) outliers; never filtered by the active organization.
- Not built: AI actions (Explain change, Suggest goals, Summarize feed), Patterns right rail, Content (by hook type)
  view, Compare = Competitors overlay lines, Share snapshot link, CSV export on KPIs, `account_insight_daily` for
  non-YouTube platforms (no writer yet), saved-view editing (a watchlist is created and removed, not edited in place).

## Kinds, tiles, Studio (SI-07c)

- `kind-models.ts`: rows -> the registered kinds (`socialPostKind`, `socialProfileKind`, `outlierRowKind`, `adCreativeKind`, `swipeCollectionKind`, `postTranscriptKind`) and kind -> card (`postCardModelFromKind`). `tile-data.ts`: ad, swipe collection and brand-outlier reads for the Board tiles. `link.ts` `classifySocialLink`: post vs profile for a pasted line.
- The six distilled kinds have one canonical component each (`components/mardown-display/blocks/social-kinds/social-kind-blocks.tsx`, reusing `SocialPostCard`, `OutlierBadge`, `PlatformMark`); compiled mirrors in `features/content-ir/kinds/social-kinds.ts`; `kind_component` rows landed and the kinds activated through `content_ir.set_kind_activation`. Placeholders (`post_breakdown`, `hook_set`, ...) stay inactive.
- Board tiles and their surfaces: `features/board/FEATURE.md` § Social tiles. Studio boards: `studio/studio-boards.ts` (`settings.brand_id`), `components/StudioTab.tsx`.

## Polish rules (SOC-POLISH-B, 2026-10-09)

- **A post's address and author come from the stored post.** `link.ts` `canonicalPostUrl` / `mappers.ts` `postAddress`: where the stored address names another account than the post's author (TikTok, X) it is rebuilt from the author and post id; the pasted link is only a way in. Cards, kinds and the Board tile all read it through `postAddress`. Server mirror: `ingest.py` `canonical_post_url` (SCHEMA.md A5).
- **A refused read speaks in a person's words.** `failure.ts` `describeSocialFailure` (title, one reason, `canRetry`, `canCapture`); `socialErrorMessage` no longer carries vendor or cache wording. Every surface that shows a refusal uses it, with `gated/RefusedReadOffer` / `GatedCaptureOffer` for the capture ways.
- **A brand's post panel belongs to that brand's pages** (`panelScope.ts`, used by `SocialPostWindow`): it closes on another brand, /board or any non-brand page, and a restored `?panels=` link on another page does not open it. A panel opened outside a brand follows the person.
- **A brand's accounts become profile tiles** through `board-accounts.ts` (own first, stored-only for the Studio starter) and `studio/studio-starter.ts`; the Add menu's "From this brand's accounts" picker is in `features/board/items/social-items.tsx`.

## Close rules (SOC-CLOSE-1, 2026-10-09)

- **A row click opens what the row is, never raw fields.** Every `MatrxDataTable` here spreads `socialRowOpen(...)` (`row-open.ts`: generic side panel + row window off, `onRowOpen` = the account page, the post panel, or `components/AccountSummary` for an account with no page). Guard: `__tests__/row-open-rule.test.ts` counts tables vs rules per component file.
- **`SocialImage` asks the element, not only the event** (`imageSettled`): a cached image can finish before `onLoad` is heard or before the source effect re-arms "loading".
- **A raw YouTube channel id is never a name or handle** (`accountLabels(name, handle, platform)`, `formatSocialHandle`): the stored name, else "YouTube channel".
- **Overview card and Accounts show the same numbers** for a row (readings show even when not tracked); the person-owner chip is hidden on a person brand (`showOwnerChip`).

## Decisions and edges

- **Reads direct, compute through the server.** No Next.js API routes. Plain edits (role) are Layer B row updates under RLS.
- **Which tracked accounts a brand shows:** the brand organization's rows with `brand_id = this brand` OR `brand_id is null`
  (an organization-wide account belongs to every brand until assigned). Own properties (`web.property`, social kinds) list
  as `Own` rows with status "Not tracked" until a tracked account matches platform + handle.
- **Account detail shows no breakdown tab yet** (UI-SPEC lists Posts · Outliers · Growth · Breakdown): it needs post
  analyses to exist, and the breakdown agent is not built. Post detail's Breakdown tab shows the honest
  "Breakdown agent not built yet" state on the server's 409 `social_agent_not_built`.
- **Not built (open for later lanes):** comments tab and "Mine comments", Download, inline hover preview, transcript
  timestamp sync to the player, watchlists, saved views (`TableSavedViews`) on the accounts table, drill-down by
  platform/format, bulk row actions, Accounts "Cards" view, account Pause and `Profile summary`.
- **Playback:** the door's bytes are fetched with auth into a blob URL on Play (a `<video>` cannot send the bearer token),
  revoked on unmount. Large videos load fully before playing.
- **Thumbnails** on list cards are the provider URLs (they expire; ruling in REGISTER) — an expired one falls back to the
  platform mark. Opening a post once lands stored media.
- Money-bearing clicks (refresh, fetch media, transcript, remove) go through `confirm()` naming the cost.

## Tests

`__tests__/outliers.feed.test.ts` (filter, watchlist serialization, hits), `kpi.test.ts` (current-vs-target math, pace,
benchmark), `__tests__/classify-social-link.test.ts` (pasted-line classification), `__tests__/outlier.test.ts` (tiers, text, badge states), `mappers.test.ts` (growth judge, account roll-ups, filters,
series), `link.test.ts`, `stream.test.ts` (the NDJSON contract). Run: `pnpm test features/marketing/social`.

## Swipe file and Ads (SI-07b2)

- **Swipe file** (`SwipeFileTab`): collections rail (create, rename, archive = `deleted_at`, "Show archived" + Restore), masonry of
  saved posts (`SocialPostCard`) and ads (`AdCard`), filters (type, platform, format, tag, date saved, search), `SwipeItemSheet`
  (note, tags, copy/remove per collection, move, `Open post details` -> `PostDrawer`), `Save link` (ingest stream, then add), bulk
  add-to-collection and bulk transcribe (estimate + confirm first). Pure rules: `swipe.ts`.
- **Where note and tags live:** on the membership edge (`platform.associations.metadata = {note, tags[]}`), written by the server's
  `PUT /social/collections/{id}/items/{type}/{id}`. Not `platform.tag`: a post/ad is shared Layer A, so a person cannot file a tag
  under it (`file_under_tag` needs editor on the item). Per collection, so a many-collection item has one pair each.
- **Ads** (`AdsTab`): Search (Meta/TikTok/Google/LinkedIn by keyword or advertiser; shows the provider's effective country from
  `effective_params`, cost, fallback chip; save to swipe file; track advertiser) and Tracked (a `platform.saved_view`, surface
  `social.advertisers`, definition `{library, advertiser, advertiserPlatformId, lastLookAt}`; ads first seen after `lastLookAt`
  are marked New, `Mark seen` moves the look; `Look again` = one confirmed search; format mix + landing-page ranking). No schedules.
  Pure rules: `ads.ts`.
- **Operations:** `SocialProviderCard` on `/marketing/operations/connections` (status + platform coverage from `GET /social/capabilities`,
  credits from the new `GET /social/credits`). Spend this month reads "Not recorded by the server yet": the social server writes no
  provider spend to a ledger. No Capabilities entry: that page is the SEO capabilities catalogue.
- **Open:** `Add to board` (the board has no tile that holds a specific saved post/ad; add to the bulk bar when board-tiles lands);
  Meta video ads show a label tile (the normalizer keeps only the video file, no poster); Share link, Table view, Suggest tags/Brief.
- Tests: `swipe.test.ts`, `ads.test.ts`, `providerCard.test.ts` (jest).

## Player, watchlist memory, goals (SI-FIX-SOCIALS-2)

- `PostMedia` (PostDetail): YouTube = official embed, never "Fetch"; other platforms use the authenticated playback door for archived media. Saved images/videos render in source order in `SavedPostGallery` (the provider thumbnail is not a slide), with keyboard/arrow controls and authenticated video playback/download. Frame sized by the real aspect ratio; the drawer is a fixed width.
- Outliers: the last watchlist is kept in the URL (`?watchlist=`) and per brand in this browser; posts have "Save to swipe file" (card menu and table row action).
- KPIs: goals are editable (`GoalDialog`, `updateKpiGoal`); with no tracked own accounts the empty state offers "Track own accounts" (`useTrackOwn`, shared with the Accounts tab).
- Swipe: both save dialogs carry the note + tags editor (`NoteTagsFields`, shared with the item sheet).

## Brand social accounts — ONE list (contract for the UI, 2026-10-09)

A brand's social account = ONE `web.property` row (non-website kind). Tracking hangs off it via
`social.tracked_account.property_id`. Every surface that shows "the brand's socials" — Overview presence card,
Brand Home, Socials → Accounts (own), brands-list count, Research subject — reads the RPCs below. Never re-merge
`web.property` + `tracked_account` in the client (the old `mappers.ts` own-property merge is superseded by this read).

**Read the list** — `supabase.schema("social").rpc("brand_social_accounts", { p_brand_id })` (SECURITY INVOKER: the
caller's RLS on every source table applies). One row per account, ordered company before person, tracked first, then
platform, handle:

| Field | Type | Meaning |
|---|---|---|
| `row_key` | text | Stable React key: the property id, or `tracked:<id>` for an own/client tracked account with no property yet |
| `property_id` | uuid \| null | The `web.property` (null only on a `tracked:` row) |
| `platform` | text | Property kind (instagram, tiktok, youtube, linkedin, facebook, x, threads, pinterest, reddit, snapchat, other) |
| `handle`, `url`, `display_name`, `property_status` | text | From the property (`handle` filled by the shared rule) |
| `owner_kind` | `company` \| `person` | Whose account: the brand's, or a named person's (founder/spokesperson). Group by it; KPIs and Research default to `company` |
| `owner_party_id`, `owner_name` | uuid, text \| null | The person (`crm.party`) when named |
| `trackable` | boolean | Server can track this platform (computed in SQL `social.brand_social_accounts`, mirrored by `TRACKABLE_PLATFORMS` in `types.ts` — change both; false: snapchat, other — say why, no button). Pinterest tracks an account's pins (outlier multiple in saves); Reddit tracks a subreddit (multiple in upvotes); Threads multiple in likes (`outlierMetric(platform)`) |
| `tracked_account_id`, `tracked_role`, `tracked_status`, `tracked_label` | | Null = not tracked. Role is `own`/`client`; status `active`/`paused` |
| `profile_id`, `profile_handle`, `profile_display_name`, `profile_url`, `avatar_url`, `is_verified` | | The shared `social.social_profile` when tracked. Avatar via the existing avatar door (provider URL is a hint) |
| `followers`, `followers_observed_at` | bigint, timestamptz | Latest snapshot (falls back to the profile count) |
| `followers_30d_ago` | bigint \| null | Latest snapshot at or before 30 days ago; growth = `followers / followers_30d_ago - 1`; null = not enough history (say so) |
| `posts_tracked`, `last_post_at` | bigint, timestamptz | Posts in the cache for the profile |
| `best_multiple_30d`, `best_post_id_30d` | numeric, uuid \| null | Highest outlier multiple among posts of the last 30 days |
| `last_refreshed_at` | timestamptz | Profile's last refresh |

Row click → `/marketing/[brandId]/socials/[platform]/[tracked_account_id]` when tracked; external icon → `url`.

**Built (2026-10-09):** `readBrandSocialAccounts` / `useBrandSocialAccounts` + `brandSocialRowToAccountRow` (mappers) are the one read. The Overview
"Social profiles" card (`components/brands/BrandSocialProfilesCard.tsx`) renders them; Socials → Accounts (`readAccountRows`) is that same list plus
the competitor / inspiration accounts; the brands list counts via `readBrandSocialCounts`. Confirming a discovered social profile writes the property
with `handle` from `classifySocialLink` and invalidates `["marketing","social","brand-accounts"|"brand-counts"]`.

**One identity per account (A3):** `propertyIdentity` (link.ts) = `web.property_identity` in the DB; unique index `property_social_identity_unique` forbids a second live row per (brand, kind, owner_kind, identity). Create paths (`createProperty`, `confirmDiscoveredProperty`, server `link_brand_property`) find-or-create. The person chip (`PersonOwnerChip`) shows the linked person or offers "Link person".

**Read counts** — `supabase.schema("social").rpc("brand_social_counts", { p_brand_ids: string[] })` →
`{ brand_id, accounts, tracked, company_accounts, person_accounts }[]` (brands with zero accounts are absent → 0). The
brands list "Socials" column shows `tracked/accounts`; same source as the list.

**Write paths**
- Track (own/client) — `POST /social/tracked` with `brand_id` (and `property_id` when the row has one). The server
  finds-or-creates and links the property and returns `property_id`, `property_created`. A Track dialog with role
  Own and only a handle now lands on the brand's list. Competitor/inspiration never create a property.
- Untrack — `DELETE /social/tracked/{id}`: the property stays on the list as "Not tracked".
- Add/edit property in the UI: write `handle` from `classifySocialLink(url)?.handle` (`link.ts`) — the same rule the
  server uses (`profile_handle_cases.json` case table, identical in both repos, both test suites run it). Owner:
  update `owner_kind` (`company`|`person`) and `owner_party_id` (person only; DB CHECK refuses a party on a company row).

**Swipe tab is brand-scoped (SOC-FIX-E, 2026-10-09).** Collections carry an optional `brand_id`. The Swipe tab
defaults to "This brand" (collections linked to the brand); "All collections" shows every one, including unlinked.
Each collection's menu has Link to / Unlink from this brand (`setCollectionBrand`). Rules: `collectionsForBrandScope`.

**Change Log: F9a independent-test fixes 2026-10-10 (Accounts, account pages, connect).** (1) Every Accounts row name opens its route (tracked by profile id, untracked by property id) and the KPI Benchmark names and Trend titles link through `brandAccountHref`; verified by clicking each row on the preview and on the released bundle. (2) A raw channel id is never a name: `mappers.ts` `accountName` is the one sentence name (confirms, toasts) and `SocialAccountInput`/`account-lookup.ts` show "YouTube channel" for a bare id; "Track all own" always names its cost in points (`useSocialSpend().pointsText`). (3) Connect: the inline hub block is gone. The toolbar has ONE `ConnectAccountMenu` listing Facebook, Instagram, Threads, LinkedIn, Pinterest, X, YouTube and TikTok with Connect / Connected / Approved testers / Coming soon (skeleton while the configuration loads, never "unavailable" first); `useStartConnection` is the one door for the menu and a row's Connect (hub OAuth, X start, TikTok authorize, YouTube = the Google connect window opened in place). The full hub is `ManageConnectionsDialog` ("Manage connections"), which also opens on the way back from a provider's consent (`CONNECTION_RETURN_PARAMS`). X app availability joins `connection-state.ts` (`xAvailable`). (4) Accounts columns: Followers, Posts, Best, Last post and one Status badge (not tracked, non-own role, else connection) lead; Role and Connection are hidden columns (still filter/edit); 30d growth is last. Below `md` rows are `AccountCard`s via the table's own `mobileCards`. (5) The Not tracked page shows the cached public profile (avatar, followers, bio, up to six recent posts; free reads, `findCachedAccount`) and one line on what tracking adds, with Track and its points. (6) `AccountInsights` shows the four private tiles only when the network is connected; otherwise one row "Connect <network> to see private stats" with Connect.

**Change Log: F9b independent-test fixes 2026-10-10 (post window, KPIs, Add brand, brands list).** Post window: Metrics shows the figures as `KpiTile`s plus one "Tracking since <day>" line until a metric has readings on two days (`MetricChart` itself draws a tile, not a dot, for under a day of readings; charts are drawn at their shown width with 12px labels, up to four non-repeating x labels, times when the span is under two days); dates go through `mappers.ts` `formatDay` (locale, month named, never 10/9/2026); the left column under the thumbnail carries the caption and tags on the non-Overview tabs; Get transcript / Run breakdown / Refresh name their points (`cost.ts` `pointsText`), and `usePostActions.transcript` asks only above the warn tier like every other spend. A post card's `...` menu inside a brand adds Open account / Save to swipe file / Get transcript / Run breakdown (`PostCardMenuItems.tsx`, the same `usePostActions` the window and the agent run). Panels: `socialPostWindow` is `closesOnNavigation` (a post belongs to the page that opened it; brand scope in `panelScope.ts` stays), and Track account closes post panels on a phone so one never sits over it. KPIs: pace logic above; own-channel panel shows channel name and handle only (no connected-account emails) and no explanatory prose. Add brand (Website): logo, favicon and social image sit behind More options; Look up is off while the field reads "Not an account address". Brands list: status badge 12px, `matrx-touch-targets`. Left: design-system `.matrx-control` buttons keep `min-height: 0 !important` (tap-lock layer), so page:look still measures them under 44px inside `matrx-touch-targets`.

**Change Log: F4 quality sweep 2026-10-09.** Every account name and avatar opens an account route, tracked or not: Accounts, KPIs (goal scope, growth cards, benchmark table) and Own accounts link through `property-account-href.ts` `brandAccountHref` (an account with no stored profile opens the Not tracked page at `/socials/<platform>/<propertyId>`). Competitor account links used the tracked-account id as the route id (the route takes the profile id) - now `profileId`. No `MatrxDataTable` under `features/marketing` may keep the default raw-fields record window: 20 files that did now spread `NO_RAW_ROW_WINDOW`, and `__tests__/row-open-rule.test.ts` fails any table that says neither `detail`, `window` nor a spread rule. `LoadingSurface` and the plain "Loading..." paragraphs are `RegionSkeleton` (the label is the aria-label). Left: `SuspenseLoader` message loaders inside the topical-map panel and Search Console sections still show spinner + text.

**Change Log: page-pass 2026-10-09 (Studio, type: single-record board, sharp after Miro/FigJam).** Studio title menu has one "New board" (the brand-linked one; `hideNewBoard` on `PresetBoard`/`BoardPage`); the "Add your accounts" offer re-reads every 4 s while shown so adding an account tile from the Add menu removes it; a pasted post link that is not stored yet draws a link face (platform mark + address) instead of a blank grey card at far zoom; the template preview names tile kinds ("Social post", "Write-up"), not registry keys.

**Change Log: page-pass 2026-10-09 (Accounts, account page, post page/panel; types: list, single record).** A post card's @creator and the Outliers table's Creator cell link to the account's route (`account-href.ts` `accountHref`, the one place every account link is built; the guard in `__tests__/row-open-rule.test.ts` scans every Socials `.tsx` for a table without `socialRowOpen` and pins the route). Agent surfaces: Accounts list = `matrx-user/marketing-social-accounts` (new; read values + XML bundle), account page = `matrx-user/social-profile`, post page and post panel = `matrx-user/social-post` (same values and four actions as the board tiles; the actions are `components/usePostActions.ts`, shared with the tile). Route map: aidream `route-to-surface.ts` (chat package publish owed). No write targets yet: Track/Refresh spend plan credits, role change and Stop tracking have no agent twin.

**Change Log: page-pass 2026-10-09 (Outliers, KPIs, Swipe file, Ad library; type: list; posture sharp after Linear).** Each tab is its own agent surface (`matrx-user/marketing-social-outliers|kpis|swipe|ads`, `features/surfaces/manifests/marketing-social-tabs.manifest.ts`; values from what is on screen, XML bundles for the lists; view/filter tools are `ui`, save watchlist / remove watchlist / new collection / ad search are `entity`); route map in aidream `route-to-surface.ts` (chat package publish owed). Outliers empty state names why (no posts / already at the widest filter) and offers Widen window only when it changes something; KPIs has one New goal button and no bare dash badge; swipe cards drop the no-baseline "11+ posts" badge and open from the title; ad formats read as words (DCO = Dynamic creative); loading is a skeleton; the tabs carry `matrx-touch-targets`; 12px text. Left: goal create/edit/pause/remove, swipe save-link/rename/archive/notes, ad Track/Look again/Stop have no agent twin yet (credit spend or derived fields); Tracked advertisers is organization-wide, not per brand.

**Change Log: F5 connected accounts 2026-10-09 (Accounts, KPIs Own channel, account page).** Own account rows carry their connection state (`connection-state.ts` `judgeConnection`: connected / needs reconnect / approved testers only / not offered yet / not connected; facts from `users.integration_connections` + the hub's `loadSocialConfigs`, one hook `useConnectionStates`); the row action is Reconnect or Connect (hub networks go through `socialAuthorizeUrl`, X and TikTok open the hub panel, YouTube goes to the KPI Own channel). The hub panel on Accounts now lists Pinterest, LinkedIn, Snapchat, Reddit and TikTok as well. An own account tracked in the organization with no brand or property (what a connected-account attach leaves behind) lists as an own row flagged `unassigned` with **Add to brand** (`/social/tracked` with `profile_id`: links or creates the `web.property`, sets `brand_id`). Private insights: ONE reader `insights.ts` (`readOwnInsightDays` -> `currentInsightDays` newest-observation-wins -> `summarizeInsights`, 30-day window; levels take the newest value, flows add up) behind `useOwnInsights`; KPIs Own channel is `OwnInsightsTable` (columns only for figures some provider sent) and the account page has `AccountInsights`; a NULL figure is "Not available", never 0 (tested in `__tests__/insights.test.ts`). Per-post connected metrics are NOT written to `social.post_metric_snapshot`: that table is the shared public cache and the Pinterest adapter deliberately keeps pin analytics private (they sit in the attachment cache on the connection resource); a private per-post ledger would be a new Layer B table.

**Change Log: F3 agent writes 2026-10-09 (every Socials page, competitor directory, research Social tab).** Every person action on these pages has an agent write target, approved on a card, through the button's own save: KPIs `create_goals`/`update_goals`/`delete_goals` (`social-actions.ts` `saveKpiGoal`, shared with the goal dialog; `createKpiGoal` now returns the id); Outliers `update_outliers` (seen / dismissed / restore, selected watchlist); Swipe `create_swipe_links` (`saveLinkToSwipe`, shared with Save link), `update_swipe_collections` (rename / archive / restore), `update_swipe_items` (note, tags); Ad library `create_/update_/delete_tracked_advertisers` (Track via `trackAdvertiserFromAd`, Look again, mark seen, Stop); Accounts `create_accounts` (handle-or-link Track) and `update_accounts` (role, untrack, Track as Own, Refresh); competitor directory `create_competitors`/`update_competitors` (Add, Find socials, Track found; `competitors/competitor-agent-writes.ts`). Parsers: `agent-writes.ts` (every problem at once, before the card). Anything that spends calls `confirmSpend`/`confirmSocialSpendNow` after approval, so the points are named before the spend. Research `matrx-user/research` gets `social_loaded`/`social_profiles`/`social_posts` from `TopicSocial` (`useSurfaceScopeContribution`). Left: the pre-existing `entity` client tools (save/remove watchlist, new collection, ad search) still write without an approval card; no live agent run yet.

**Change Log: F1 quality sweep 2026-10-09.** The brand Overview "Social profiles" card takes `canEdit` (editor access on the brand): Add property, Track / Track all, edit and delete show only for editors; a viewer who cannot read tracking rows sees no "Not tracked" badge. `SocialImage` itself never calls `/api/image-proxy` (brand-library tiles do); the proxy answers 404 for dead links so a missing thumbnail falls to its designed fallback without a gateway error.

**Change Log: F7 own post metrics 2026-10-10 (account page, KPIs Own channel).** Per-post private figures of a connected account live in `social.own_post_metric` (Layer B, SCHEMA.md A6), never in the public `post_metric_snapshot`. ONE reader in `insights.ts` (`readOwnPostFigures` -> `currentOwnPostFigures` newest day wins -> `topOwnPosts`, a post without the figure is not ranked, never ranked as 0) behind `useOwnPostFigures`; `components/TopOwnPosts.tsx` (metric switcher, "Not available" for NULL) is on the account page (`AccountInsights`) and under each own account in `OwnInsightsTable`. Tested in `__tests__/insights.test.ts`. The Pinterest profile of admin@admin.com stores 0 pins and 0 boards, so its Top posts reads "Not available" until it pins something.

**Change Log: F10a Studio fixes 2026-10-10.** The profile tile's name, handle and picture open the account page like "Open account" (`OpenAccountTarget` in `social-tile-views.tsx`; plain text when the account has no page). Far-zoom faces: an account card shows its avatar with a platform mark on it, the follower figure and "<Platform> followers" at 12-15 screen px (sizes are `calc(Npx / var(--board-z))`, capped by the card), so two accounts of one handle on different platforms differ at a glance; a starter post tile with no link says "Paste a post link". The Studio title menu lists boards without the brand prefix (`shortBoardTitle`) and says "New board": the brand is named once. `SocialImage` asks for `hqdefault` when a stored YouTube thumbnail says `maxresdefault` (no 404 is ever requested; the step-down stays for a stub). Phone first view and the 5% camera are board-engine rules: see `features/board/FEATURE.md` § Zoom tiers.

**Change Log: F12 independent-test fixes 2026-10-10 (account page, KPIs Own channel, roll-up, Accounts).** Connected account with no private rows shows one line ("No private stats yet — they appear after the first sync"), never empty tiles; `TopOwnPosts` renders nothing until a figure exists. Connection wording: `testers_only` reads "Connect" (a person the server does not admit already reads "Coming soon"; no "testers" wording reaches a screen). The refresh/capture notice sits on ONE reserved line under the account header (`GatedCaptureOffer onNotice`), and a reused refresh reads "Up to date (refreshed in the last 12 hours)". Roll-up `/marketing/social` tables take `mobileCards` below `md`. Accounts: 30d sits beside Followers, Account column 160px minimum, so every column fits beside the open sidebar at 1280px. The empty space under a five-row table is the table's own content-height default (design-system `frameHeight="content"`: no tall empty box); the brand layout does not give the table a bounded region, so `fill` changes nothing here. KPIs Own channel / Check a video: no prose or sample keyword, thumbnail hint under the thumbnail (was a squeezed side column). Cost report header for a member: "All your organizations (N)". Research topic header keeps the topic name readable on a phone (intent badge hidden below `sm`). design-system: the `.matrx-touch-targets` floor no longer lifts `.matrx-control-segment`/`-tab` (they own their `::after` ring), so a selected capsule never outgrows its track.

**Change Log: F13 independent-test fixes 2026-10-10 (names, dates, phone, viewers).** (1) An account's name has one source: `accountLabels`/`accountName` (cached profile name, else the property's name, else the cleaned address); a LinkedIn slug loses its generated id (`linkedInAddress` in `lib/social-handle.ts`, also what `formatSocialHandle` returns for LinkedIn) and a YouTube channel id is never shown ("YouTube channel"); the Studio starter tiles, KPI benchmark/trend/goal scopes, Own channel table and post cards use it. (2) `postedLabel`/`postedTitle` (mappers.ts): relative inside a year, a readable date after, tooltip "March 5, 2014 · 12 years ago"; `lastPostLabel` follows. (3) Account page: post table columns have explicit widths (Likes/Posted visible at 1280), tiles with no data are absent. (4) Own channel: Pre-upload check lines are ≤60 chars; the stray account labels above Top posts moved into its heading and show only with the list. (5) Post window: title is one line with an ellipsis (`titleNode`); Metrics shows only what the header does not (Velocity, tracking since). (6) One status vocabulary: connection "Connect" became "Not connected"; the phone Accounts card shows the table's own Status chip. (7) `SocialsContext.canEdit` (`useAccess("web_brand")`): Track account, Connect, Track all, row writes and "Link person" show only at editor level; the topical-map "Start a map" is gated the same way. (8) Add brand "Look up" stays disabled until a platform is chosen; Research Social puts "Choose a brand to track in" in the Profiles header and profile names open the in-app account (brand topic) or the platform. (9) `scripts/page-look.mjs` phone view now emulates a coarse pointer so the design system's `::after` hit ring is counted.

**Change Log: F13 follow-up 2026-10-10 (phone tap targets).** Post-card "Post actions" and caption buttons and the KPI account links carry `matrx-tap-area` (44px ring); `InfoHint` (official) grows its hit ring to 44px on a coarse pointer; `page-look` also counts a control's own `::before` ring. Left: adjacent design-system buttons read 32px wide by 44 tall (the ring stops at the half-gap), and the Studio canvas toolbar (features/board).

**Change Log: page-pass 2026-10-10 (F15 verifier fixes), type workspace/list mix, posture sharp after Linear.** Every write or spend control now follows the brand editor check (`useCanEditSocial`: the section's `canEdit`, or `web_brand` access resolved from the brand id/segment in a floating post window): Track / Refresh / capture offers (`GatedCaptureOffer` returns nothing for a brand without edit), post Save / transcript / breakdown / refresh and card `...` items, Outliers watchlist and save, Swipe collection and link actions, Ads search / track / look again, KPI goals, Studio board creation and Add accounts, Competitors Add / Find socials. Competitors directory is one Followers column (platform mark + count per account) so Posts and Top 30d stay in view; website and in-flight status live in the name cell; Add says "Free" when no accounts are tracked. Post Metrics tab shows tiles/line only once readings span a day. KPIs empty line 25 chars. Connections spend rows use skeletons. Brand overview social icon links, section actions and Back buttons carry `matrx-tap-area`; icon row no longer collapses. Account page action row wraps (no cut labels). Shell segment is read from the address so Studio never draws a second header; phone boards frame content clear of the zoom HUD and assists bubble. One-row "No channel linked" state with its Connect action.

**Change Log: F16 viewer honesty 2026-10-11.** Tracking rows belong to the brand's organization, so a viewer who cannot edit is never told something false about them: Accounts shows a dash (not "Not tracked"), account pages drop the Not tracked badge, KPIs and Outliers say "Tracking is private to <brand>'s team" (`tracking-privacy.ts`), Studio says its boards are private, and the Swipe, Competitors and KPI goals empty states drop invitations to act. Connections' month line reads "all your organizations". The post window no longer requests the post's media list for a viewer the server would refuse (`PostMedia` `canLoadMedia`). Competitors row actions no longer trip the 3px tap-target guard. Phone Studio: the first view fits the first tile (never a frame or mark) between the side insets, and a restored view whose first tile sits under the floating chrome reopens on it (`firstTileOutsideClearArea` in `features/board/engine/camera-store.ts`). Left: the assists bubble can still overlap a tile corner at the bottom of the view; no repro of the Studio 404 (page:look as member: 0 failed requests).

**Change Log: captured posts 2026-10-11 (account page, post window; SCHEMA.md A7).** A capture from the organization's own browser no longer renders as a list at the top of the account page: its posts are `social.captured_post` rows read by `gated/capturedPosts.ts` (`readCapturedPosts`) and merged into the same grid and table by `mergeCapturedPosts` (Layer A first; captured posts it lacks are cards `captured:<row id>` with `fromBrowser` and a "From your browser" mark; dedupe by `post_id` or every identity in `postMatch`; multiples recomputed over the union). `postThumbnailDoor` / `listPostMedia` / `readPostDetail` route captured ids to the captured-post doors and row, so the post window opens with the stored image; snapshots/transcript/analysis read empty for them and the card menu offers only link actions. `CapturedFromBrowser` is one line ("281 posts from your browser · Oct 9" + Saved page). `enrichWithCaptures`/`capturedPostsMissingFrom`/`knownPostKeys` are gone. Tests: `gated/__tests__/capturedPosts.test.ts`.

**Change Log: G2 default post count 2026-10-11 (every account fetch).** The number of posts a fetch asks for is the feature knob `social.profile_posts_default` (platform 50, then the organization, then the person; 0 = All up to `social.profile_posts_max`; shown in the organization's configuration page and the person's Personal configuration, read live by `lib/scoped-config` `resolveSessionKnob`). `post-count.ts` has no built-in number and no localStorage: `usePostCount()` reads the resolved knob and a pick in any dialog is saved as the person's own override on the server (`setPostCountChoice` -> `setKnobOverride`, a refused save is a toast and does not stick). `rememberedMaxPosts()` is the one non-hook door. Paths now using it: Track account, Track all own, account page Refresh/Track, Accounts row refresh, board tiles, Add brand Look up (`person-brand-io.ts` no longer asks one page) and its Track, competitor Add/Track found (`brand-competitors.ts`). `server.ts` `pagesOrMax` sends neither pages nor max_posts when none is given and the server (`aidream/services/social/knobs.py` `default_posts_to_fetch`, used by ingest, refresh, tracking and the agent `fetch_profile`) resolves the same knob for the run's organization and person; `pages=1` is gone. `PostCountControl` states "N posts · points · your default · Change" (or "limited to N by your organization's maximum"), `PostsShownLine` states "Showing N of ~M posts · Load more (≈ points)", `LimitLine` names the setting and links to its row. Tested in `__tests__/post-count.test.ts` and aidream `test_profile_default_posts.py`; the three-rung ladder was proved live inside a rolled-back transaction (50 / 100 / 200).

**Change Log: F17 usage honesty 2026-10-11 (vendor names, setting names).** No vendor name renders on a customer screen: `ProviderFallbackNotice`/`ProviderChip` show only "Backup source" after a fallback (never "via <vendor>" or the vendor's reason), `SocialProviderCard` drops the per-vendor rows and vendor credits, the SEO cost page drops its "by provider" admin block and names activities only (vendors live in the admin app, /administration/usage). One name for each limit: "Most posts per account" and "Most comments per post" in `FetchLines` and in the knob labels (`social.profile_posts_max`, `social.comments_max`; descriptions no longer mention billed calls). The per-network request-rate knobs (`social.*.requests_per_minute`) are organization-only, so they no longer list on a person's Personal configuration. Each usage charge opens its account or post: `aidream` `social_cost_subject(handle=, url=)` carries it on the cost row, and `billing.my_cost_records` resolves it to `subject_*` (see entitlements/FEATURE.md).

**Change Log: media is the hero 2026-10-11.** One layout primitive, `components/MediaDetailLayout.tsx` (`MediaDetailLayout`, `MediaStage`, pure `planMediaLayout`): the host measures itself, the media box takes nearly the full available height at its true aspect ratio (width follows; 9:16, 1:1, 4:5, 16:9), details take the rest. Side-by-side when the host is wide enough (landscape media only when very wide); otherwise media on top at full width with a peek of the details (phone, narrow window). It scales with the window. Used by `PostDetailBody` (post window, canvas tab, page) and the board/Studio `PostTileView`; `PostMedia` takes `staged` (fills the stage, still reports the true ratio). `SavedPostGallery` arrows overlay the media sides and the counter sits on top, so a carousel no longer loses 40px. The action row is one slim row under the media. Swept: post cards have no hover preview, the swipe item sheet shows no media (Open post uses the window), ad creatives open the library link; nothing else needed the fix. Left: the page host uses a viewport-based height.

**Change Log: connected accounts refresh on click, Auto-update opt-in 2026-10-14.** An own account read through a connection has two row actions in `AccountsTab`: **Refresh stats** (one read, tooltip names the points or "Free", `POST /social/connected-accounts/refresh`) and **Auto-update** (per account, off by default, daily, a confirm names the points per run and an estimated month before it turns on; `PUT /social/connected-accounts/{id}/auto-update`). Costs come from `GET /social/connected-accounts/plans` through `useConnectedPlans`. Nothing turns on by itself (no blind paid automations).

**Change Log: connected account updates, free reads automatic 2026-10-14 (supersedes the Auto-update opt-in above).** The Auto-update row action and its confirm are gone. `AccountsTab` has an **Updates** column: for a free read (`plan.automatic`) a canonical `Select` of the server's `frequency_options` (Off / Every hour / Every 6 hours, the default / Every 12 hours / Daily; `PUT /social/connected-accounts/{id}/frequency` `{hours}` via `setConnectedFrequency`); for a paid read (X) the cell reads "Refresh only · <points>" and offers no choice — the server refuses to automate it too. Labels come from `frequencyLabel` in `useConnectedPlans.ts`. Server design and load numbers: aidream `services/social/FEATURE.md` § Account updates.
