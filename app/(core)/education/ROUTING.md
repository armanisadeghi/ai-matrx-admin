# Education Hub — routing contract

> **Read this before adding any route under `/education`.** Product truth is
> `common-docs/systems/education/STATE.md` (vision beside it in `VISION.md`); how the frontend is
> built is [`features/education/FEATURE.md`](../../../features/education/FEATURE.md). If this
> drifts from the vision, stop and flag the owner.

Everything lives under `app/(core)/education/` (guest-accessible, server-rendered, app shell).
`/education` is the guest landing; a signed-in learner is redirected to `/education/overview`.
Marketing never masquerades as the signed-in surface. Three route kinds that never mix shapes:

| Layer | Shape | Example |
|---|---|---|
| Marketing / discovery | **Nested** under an axis (`subjects`, `levels`, `exam-prep`, `study-aids`, `features`), data-driven `[slug]`; 100% server, `MarketingPageShell` | `education/study-aids/flashcards` |
| SEO content | Catch-all `education/learn/[...slug]`; Article JSON-LD | `education/learn/biology/photosynthesis` |
| Application tools | **Flat**, one segment per tool plus its sub-routes; server shell + client islands | `education/flashcards/[setId]/study` |

## The load-bearing rule: marketing is nested, the app is flat

A tool is reached from many marketing angles, and all of them link into the one flat tool route.
Never nest a tool under an axis (`study-aids/flashcards/all` is wrong). Marketing slug and tool
slug can differ (FastFire: marketing `features/fastfire`, tool `fastfire`). A tool graduates from its
`EduToolComingSoon` placeholder at the **same slug**, never into `(transitional)`, `(legacy)` or a
sibling feature.

## Canonical tool flow

```
education/<tool>/                 library (mine + shared)                 [auth]
education/<tool>/new              create, lands in the editor             [auth]
education/<tool>/[id]             VIEW / USE, the shareable URL           [VIEW]
education/<tool>/[id]/edit        authoring                               [EDIT]
education/<tool>/[id]/<use-mode>  study | take | results | play …        [VIEW]
```

Gate `[id]` on VIEW and `[id]/edit` on EDIT with `requireAccess(type, id, level, {redirectTo})`
on the server (a view-only sharee on `/edit` is redirected to `[id]`, never 404) and
`useAccess(type, id)` in the view surface. Never a bespoke check; recipe in
[`features/sharing/FEATURE.md`](../../../features/sharing/FEATURE.md). Reference wiring:
`flashcards/[setId]/edit`.

## Route to feature map

Sub-routes: list the folder. Tool entries are in `features/education/data/tools.ts`.

- `flashcards` -> `features/flashcards`; `fastfire` -> `features/flashcards/fast-fire`.
- `quizzes`, `practice-tests`, `grade-work` -> `education/assessment`; `tutor` -> `education/tutor`.
- `audio-study`, `mind-maps`, `media/[id]` -> `education/media`; `memory`, `notes` -> own module.
- `summaries` -> `education/onboard` (converter output); `study-guides` -> `education/study-guides`.
- `kits` -> `education/kits` + `onboard` (`kits/new` is THE create page).
- `library` (+ `community`, `suggestions`) -> `education/library`; `classes` -> `education/classes`.
- `sessions`, `progress`, `planner`, `offline` -> `education/study`; `data` -> `education/onboard`.
- `practice-oral` -> `education/spoken-practice`; `game` -> `education/engage`.
- `family` -> `education/family`; `creator` -> `education/creators` (public face `/c/[handle]`, outside `(core)`).
- `overview` -> `education/home`; `learn` -> `education/publishing`; `admin` -> `features/admin` map.
- Redirects: `flashcards-2` -> `flashcards`; `start` -> `kits/new` (keeps `?source=`); `flashcards/new/import` -> `flashcards/new`; `flashcards/progress` -> `/education/progress`; `fastfire/capture-test` -> the admin harness.

Admin-only: `education/admin`, `flashcards/admin`, `learn/admin`, `subjects/quick-math/admin`.

## The route graph is closed (THE DOOR LAW)

Every route has at least one inbound link a user can click; fix a gap on sight.
- `offline` is reached from the "Offline study & sync" card on `/education/data` and the
  `OfflineStudySyncMount` queue-depth chip.
- `media/[id]` is the canonical route for the `study_media` entity token (`data/entityRoutes.ts`),
  used when a caller holds an id and not the kind. **`MediaRouter` must handle every
  `EduMediaKind`**; add a branch whenever a kind is added.
- `library/suggestions` is linked from the Community Library header.

## Conventions

- Page files are Server Components; no `"use client"` on a `page.tsx`. Heavy browser-only
  clients go through a `dynamic({ ssr: false })` wrapper (illegal in a Server Component).
- Metadata via helpers: `createDynamicRouteMetadata` (marketing/content), `toolMetadata("<slug>")`
  (tools). Never hand-roll `<title>`.
- Marketing/content body markup only through `SectionRenderer`; a new block kind extends the
  `EduSection` union.
- Route files live in `app/(core)/education/**` only; tool code in its own `features/` module and
  the route file stays thin. Registries driving marketing and tool entries: `features/education/data/`.
- New tool: add an `EduToolEntry` to `data/tools.ts`, create `education/<tool>/page.tsx` plus the
  canonical sub-routes, and add its line above.
- Lucide icons only, validated at runtime (see FEATURE.md); no emojis; mobile rules per the
  `ios-mobile-first` skill.
