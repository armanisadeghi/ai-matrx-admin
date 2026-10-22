# Brand session (the deck)

**Status:** active (data and wiring; the look is the design session's)
**Tier:** 2 (part of `features/marketing`)
**Last updated:** 2026-10-22

Product truth: common-docs `projects/brand-discovery/PLAN.md` § The flow step 4, `DATA-MODEL.md`
(`web.brand_choice`, § Where a chosen value belongs), `VISION.md` § The session screen.

## What it is

`/marketing/brands/[brandId]/identity/session` (`marketingRoutes.brandSession`; "Decide" on the brand header and its
phone menu). The whole screen is the card: the canonical `@ai-matrx/design-system/swipe-deck` `SwipeDeck`, bound
through a `SwipeDeckBinding` (`useBrandSessionDeck`). A screen the design session builds binds the same way:
`binding` in, `snapshot` out.

## The cards and their doors

| Card | Swipes | Written through |
|---|---|---|
| Offering stance (an agent's open A3 row, one card per offering; its precise `value.stance` is the Suggestion via `suggestedLabel`) | right Grow · up Sustain or Accept · left Sunset or Refuse · down not sure | the person's own A3 row via `web.brand_choice_correct` (`{stance, offering, answer_to}`, chosen; the person's OWN earlier answer is withdrawn first — `ownLiveAnswers` by `created_by` — and a colleague's is superseded by the database, single per offering); not sure parks the agent's row |
| Audience category (Who / Cares about: the brand's `brand_audience` rows, and categories the word checks name) | the four placements | `web.brand_audience_answer` (adds the category in the brand's organization when new) |
| Tagline / one-liner (`h6_tagline`, `h0_description`: pick-one groups) | right Could be it · left not us · down not sure; then the pick | `decide` `shortlist` / `not_us` / `not_sure`; the pick = `decide lead` (switching shortlists the old pick back first); one left in the running is picked |
| Finding to confirm (`web.discovered_item` pending, built by Smart Add's own `loadSavedFindings` → `buildQueue` → `foldQueue`) | right confirm · left reject · down not sure (nothing written) | Smart Add `persistAnswer` (its one confirm path; its `undo` on undo). A name is kept as an alias, never renamed. |
| Brand candidate (`web.brand_choice` open) | right lead · up ours, not the face · left not us · down not sure | `web.brand_choice_decide(p_choice_id, p_action, p_reason, p_via)` |
| A word held (part screen) | the same four; tag it from the Who / Cares about rows (`categoryRows`), `+` adds a category with its answer | `web.brand_choice_correct` → a NEW row, origin `said`, value `{text, part_of, start, end, categories, category_ids}`, `grew_from` the candidate; re-placed / withdrawn through `decide`; a changed tag replaces the row; a category answer → `web.brand_audience_answer` |
| Page agent rewording (write target `session_propose_rewording`) | — | `web.brand_choice_propose` → a NEW OPEN row, origin `ai`, `grew_from` the card |

Order: stances, then audience categories, then candidates by the element's `position` (oldest first), then findings; kept for the whole sitting
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

- `web.brand_choice_decide` also takes `shortlist` (decision `shortlisted`, person only, also in the trigger), and
  `withdraw` of a chosen row restores what it had replaced (2026-10-22, cases 17-19).
- `web.brand_audience_answer(p_brand_id, p_row, p_name, p_action, p_origin, p_via)` — SECURITY DEFINER, person only,
  editor on the brand; finds or adds the category (child of its row, brand's organization) and the brand's one row about
  it (`about` edge to the category), then decides it. Cases 20-21.
- **REVIEW3 (2026-10-22), cases 22-27** — red on the old bodies, green after (and 1-21 green on the new ones):
  - **Subject of a stance (C1).** `single_per_subject` supersedes on whatever subject the row has: its `about`
    targets (the offering) and the PENDING offering finding it `grew_from`. `brand_choice_correct` copies the
    answered row's `grew_from → web_discovered_item` edge onto the answer, so a stance answer is one per offering
    before the offering is kept. `web._stance_follows_kept_offering` links the agent row AND every answer that grew
    from it on a person's Yes, so `seo.map_foundation` reads the answer.
  - **Who decides (I1).** Trigger `brand_choice_person_decides` fires on `decision, placement, decided_by`; any move
    to or away from chosen / declined / shortlisted / parked / superseded needs tier `user`, `auth.uid()` and
    `decided_by = auth.uid()`. The decide door's own supersede / restore / retract writes carry the transaction-local
    flag `web.brand_choice_door` (set and restored inside the door; still tier `user`).
  - **Test seats (I4).** Who is a seat is decided per brand, in ONE place: `web.brand_non_person_seat_ids(brand_id)`
    (`platform.non_person_account_ids()` + `agent_test_account_ids()`: admin@admin.com, test@test.com, persona
    fixtures, canaries, bots). One exemption (2026-10-22): a persona-factory account is a person on a brand in the test
    organization it created, owns and stamped with its own run (`iam.organizations.metadata.test_fixture.test_run_id`);
    on every other brand it stays a seat. `decide`, `person_validated_offering_ids` and the stance triggers read that
    function. A seat may answer, but `decide` refuses its change to a person's decided row and never supersedes or
    restores a person's row; its Yes / No on an offering finding fires neither stance trigger.
  - **Audience origin.** `brand_audience_answer` takes origin `said` or `team` only; the deck always sends `said`.
- Data design: common-docs `projects/brand-discovery/DATA-MODEL.md` § The brand session's answers.

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
- 2026-10-22 — The finish and empty screens are the deck's own (`endActions`, `empty`); the page no longer draws its own `EmptyState` for either and renders the deck even when nothing waits.
- 2026-10-22 — Test seats are per brand (`web.brand_non_person_seat_ids`): a persona is a person only on the brand its own test organization owns.
- 2026-10-22 — REVIEW3: a stance answer is one per offering and reaches the topical map (subject = `about` or the pending finding); only a person moves a decided value (trigger on decision/placement/decided_by, door flag); test seats never displace a person; a second editor's answer withdraws only their own (`personId`, `created_by` read); audience answers are origin `said`. Proof: rollback cases 22-27; jest `deck.test.ts`.
- 2026-10-22 — LOGO CARD: a logo finding shows its picture in the deck's media slot (`findingItem`, via the validate page's `logoImageOf`), never the address as text. Proof: jest `deck.test.ts`.
- 2026-10-22 — Stances first (four swipes, the agent's precise stance as the Suggestion), audience categories with their answer, word tags, taglines and one-liners as picks; the audience door and `shortlist`.
- 2026-10-22 — Cards no longer repeat their four answers as rows under the text (`choicesOnCard={false}`): the edges are the answers (owner rule: nothing on the screen but the thing being asked about).
- 2026-10-22 — Created: decide/correct/propose doors, the deck binding, the route, the surface.
