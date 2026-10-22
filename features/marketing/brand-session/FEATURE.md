# Brand session (the deck)

**Status:** active (data and wiring; the look is the design session's)
**Tier:** 2 (part of `features/marketing`)
**Last updated:** 2026-10-22

Product truth: common-docs `projects/brand-discovery/PLAN.md` § The flow step 4, `DATA-MODEL.md`
(`web.brand_choice`, § Where a chosen value belongs), `VISION.md` § The session screen.

## What it is

`/marketing/[brandId]/identity/session` (`marketingRoutes.brandSession`; "Decide" on the brand header and its
phone menu). The whole screen is the card: the canonical `@ai-matrx/design-system/swipe-deck` `SwipeDeck`, bound
through a `SwipeDeckBinding` (`useBrandSessionDeck`). A screen the design session builds binds the same way:
`binding` in, `snapshot` out.

## The cards and their doors

| Card | Swipes | Written through |
|---|---|---|
| Finding to confirm (`web.discovered_item` pending, built by Smart Add's own `loadSavedFindings` → `buildQueue` → `foldQueue`) | right confirm · left reject · down not sure (nothing written) | Smart Add `persistAnswer` (its one confirm path; its `undo` on undo). A name is kept as an alias, never renamed. |
| Brand candidate (`web.brand_choice` open) | right lead · up ours, not the face · left not us · down not sure | `web.brand_choice_decide(p_choice_id, p_action, p_reason, p_via)` |
| A word held (part screen) | the same four | `web.brand_choice_correct` → a NEW row, origin `said`, value `{text, part_of, start, end}`, `grew_from` the candidate; re-placed / withdrawn through `decide` |
| Page agent rewording (write target `session_propose_rewording`) | — | `web.brand_choice_propose` → a NEW OPEN row, origin `ai`, `grew_from` the card |

Order: findings first, then candidates by the element's `position`, oldest first; kept for the whole sitting
(`keepOrder`) so an answered card stays where it was and undo brings it back in place. A candidate a run writes
meanwhile joins the end. Undo is the deck's own unlimited undo: each change's inverse goes back through the same
doors (a choice answer taken back = `retract`).

## The database doors (made 2026-10-22 through the Supabase MCP; `platform.client_callable_door` rows)

- `web.brand_choice_decide` — SECURITY DEFINER. Refuses no `auth.uid()`, any actor tier but `user`
  (`platform.declared_actor_tier()`: a person's browser is `user`; `x-matrx-actor-tier: agent|system` and a server
  write carrying the person's claims but declaring nothing are refused), and anyone without editor access to the
  brand. Takes a per-(brand, element) transaction advisory lock before any row lock, so two people deciding the same
  element never both end chosen.
  `lead`/`support` → chosen + placement; `not_us` → declined; `not_sure` → parked; `retract` → open. Whenever a
  chosen row stops being chosen (retract, or re-placed to `not_us` / `not_sure`) every row it superseded is chosen
  again, its `superseded_by` edge soft-deleted; `withdraw` → soft-deletes the
  person's OWN `said` row. Single-value elements (`platform.categories.metadata.cardinality` `single`, or
  `single_per_subject` per `about` target) supersede the earlier chosen row in the same transaction with a
  `superseded_by` edge. A word remark (`value.part_of`) never supersedes. Cooperates with the trigger
  `brand_choice_person_decides` (decided_by is always the signed-in person, restores included).
- Trigger `brand_choice_person_decides` (`web._brand_choice_person_decides`) refuses the same tiers on a direct
  write of `decision` chosen/declined or a chosen row's `placement`.
- `web.brand_choice_correct` — refuses any tier but `user`, same as decide; the person's own words (origin `said`) for the same element, `grew_from` + `about`
  copied, optionally placed at once via `decide`.
- `web.brand_choice_propose` — an OPEN `ai` candidate; never decides (an agent may call it; it must name its system).
- Edge type registered: `web_brand_choice --grew_from--> web_brand_choice`.
- Proof: `__tests__/brand_choice_doors.rollback.sql` (a DO block that ends in `ROLLED_BACK_GREEN`; run it with the
  Supabase MCP). Red before the doors existed (`42883 function does not exist`), green after: job refused, agent
  refused, stranger refused, person chose, single-value superseded, many-value kept both, undo restored, parked and
  declined, word correction, rewording superseded, withdraw own words only. Cases 12-16 (review 2026-10-22) were
  red on the old bodies and green after: undeclared server refused (door + trigger), agent direct write refused,
  browser person passes (role authenticated, PostgREST headers), undo on re-place, element lock held.

## Live refresh

The deck's query is under the brand's key (`["marketing","brand",<id>,"session-deck"]`); the page mounts
`useLiveBrand`, whose postgres_changes on the five brand tables (all in `supabase_realtime`) invalidate it.

## Surface

`matrx-user/marketing-brand-session` (inherits `matrx-user/marketing-brand`), mounted with `BrandRoomSurface`:
`session_current` (card in focus) and `session_counts`; one write target `session_propose_rewording`. No agent
chrome on the page.

## Not built here

- The Curator (sorts and pre-places candidates: fills `recommended_placement`, `opinion_reason`, `word_signals`,
  which the deck already shows as Suggestion, Reason and word parts). Its mandate and output kind are PLAN step 7.
- Continue to a next stage: no stage workflow after discovery exists, so the end of the deck returns to the brand.
- Undo across sittings: decisions from an earlier sitting are not cards; they are retracted from the brand's
  choices elsewhere (the decide door's `retract` serves any screen).

## Change log
- 2026-10-22 — Cards no longer repeat their four answers as rows under the text (`choicesOnCard={false}`): the edges are the answers (owner rule: nothing on the screen but the thing being asked about).
- 2026-10-22 — Created: decide/correct/propose doors, the deck binding, the route, the surface.
