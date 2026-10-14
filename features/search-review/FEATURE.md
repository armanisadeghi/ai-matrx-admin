# Review search results (`features/search-review`)

A window panel any feature opens when it has web results and needs a person to say what each one is.
Arman, 2026-10-14: "a strong primitive as a window panel we can use in all sorts of places where we do a
websearch and we need someone to tell us what's what."

## What it is

- **Renderer:** every result draws through THE canonical `web_result` component
  (`components/mardown-display/blocks/search-kinds/item-blocks.tsx` `WebResultBlock`, via
  `SearchKindNested`), the same one the Search Lab at `/scraper/search` uses. Never a second renderer.
  `webResult.ts` maps a raw Brave or Google object (or a `web_result` value) onto that kind by field
  name only.
- **Controls per result:** the "we think" suggestion (glows, never pre-selects; reason, probability,
  evidence and who suggested it open on hover only), the pinned answers, "More" for the rest of the
  vocabulary, sentiment when the chosen answer `hasSentiment`, Ask me later (back of the line) and
  Ignore. Rank and query open on hover; engine names show only for admin debuggers.
- **Header:** subject, progress, a To answer / Later / Answered / All filter, and the canonical copy
  menu (`CopyButtons`: markdown list with answers, JSON of subject + results + answers).
- **Window:** `searchReviewWindow` (catalogue, `windowRegistryMetadata`, `OverlayController`), opener
  `features/overlays/openers/searchReviewWindow.tsx`, URL `?panels=search_review:<sessionId>`,
  fullscreen on phones. Not preserved across reload: the session lives with its host page.

## API

```ts
const sessionId = usePublishSearchReviewSession(session | null); // features/search-review/sessionStore.ts
const open = useOpenSearchReviewWindow();                          // open(sessionId)
```

`SearchReviewSession` (`types.ts`): `subject {type, name, imageUrl?}`, `results: {key, result (raw
object), hits: {engine, rank, query}[]}[]`, `choices: {key, label, group?, description?, hasSentiment?,
pinned?}[]`, `answers: Record<key, {status: "answered", kind, sentiment} | {status: "later"} |
{status: "ignored"}>`, `suggestions?: Record<key, {kind, sentiment?, probability?, reason, evidence?,
by?}>`, `onAnswer(key, answer | null)` — the persistence adapter (may be async; a rejection shows on
the row). The host re-publishes every render, so the window always shows the host's answers; when
the host unmounts the window says the results closed with their page.

`SearchReviewBody` can also be rendered inline by a host that does not want a window.

## Callers

| Caller | Adapter |
|---|---|
| Smart Add "On the web" (`features/marketing/smart-add/SmartAddWebRow.tsx`) | `web.brand_relation_kind` vocabulary; rules suggestion (`webKinds.suggestKind`); answers go to the same `webChoices` state, persisted at Create by `relations.routeWebChoices` |
| Lab story `/lab/search-review` | the same entry on one recorded fullspecstaff.com round |

The AI "we think" source is the declared mandate `brand_intake.web_result_classifier` (aidream
`services/brand_intake/mandates.py` + `web_classifier_provision.py`, output kind
`brand_web_result_classification`); no agent is bound yet.

## Change log

- 2026-10-14 — created; Smart Add's inline web rows replaced by one "Review N web results" entry.
