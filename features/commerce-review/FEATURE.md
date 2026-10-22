# Commerce Review (the two human gates + attention)

**Routes:** `/commerce/triage` · `/commerce/drafts` · `/commerce/attention` ·
`/commerce/stores/connect` (admin map `/commerce/review/admin`)
**Owner workstream:** W11 of the ebay-store-management build
(`common-docs/systems/commerce/ebay/projects/ebay-store-management/PLAN.md`, UX.md §5.2/§5.5/§6).

## What it is

The human side of the commerce pipeline, over the C1 `commerce` schema:

- **Warehouse triage (gate 1)** — `awaiting_triage` assets, one per screen, image-first,
  keyboard-driven (1–5 = bucket, Enter = confirm the AI's call, J/K move). A decision writes
  `value_bucket` + the next `pipeline_state` (`no_value` → `recycled`, else → `drafting`) — the
  status write IS the pipeline trigger (W4's policy 3 applies at both gates).
- **Drafts review (gate 2, lister craft)** — `in_review` assets with their LIVE `listing_draft`
  mandate result (non-superseded, succeeded). Evidence pane (source photos + the draft's
  reasoning), confidence-gated fields (low-confidence drafts open expanded and warn), edit-in-place,
  Enter/R/X verdicts at the ~15s/item bar. approve → `ready_to_publish`, revise → `drafting`,
  reject → `rejected`.
- **Attention queue** — open `recall_audit` disagreements (`is_disagreement`, no `human_verdict`),
  escalations (`escalated_at` set), and high-impact open `asset_unknown` rows, one list; inline
  recall verdicts; every row opens its asset (no dead ends).
- **Onboarding + store connect** — `/commerce/stores/connect`; Connect calls aidream
  `GET /ebay/oauth/connect` (via `callApi`) and sends the browser to eBay consent; the callback
  returns here with `?status=connected|declined|expired|error`, shown as a toast.

## 🚨 THE LEARNING-TAP LAW

A human decision NEVER destructively overwrites an AI output row. `asset_mandate_result` and the
evidence columns of `recall_audit` are read-only here forever. Every human change lands as:

1. a `human_correction` row carrying the AI's `before_value` (`gate_1` bucket diffs, near-miss
   flagged when a `no_value` is promoted; `gate_2` per-field diffs with `field_path`
   `title`/`description`/`aspect:<Name>`/…), and
2. an ASSET write (`value_bucket` / `attributes.listing.<path>` / `pipeline_state`) via the
   guarded CAS — so W10's learning taps can diff human vs AI.

## Files

| File | What |
|---|---|
| `types.ts` | Hand-declared rows for `asset_mandate_result`, `recall_audit`, `human_correction`, `asset_review` + the `CommerceReviewSchema` cast (DELETE when `commerce` lands in the generated types). Intake rows are imported from `features/commerce-intake/types.ts` (W4 owns them — never re-declared). |
| `service.ts` | Complete queue reads (`readAllRows`), live-result resolution (`superseded_by IS NULL AND run_status='succeeded'`), `decideValueBucket`, `reviewDraft`, `listAttentionQueue`, `recordRecallVerdict`, guarded CAS asset writes. Photos read through W4's exported `listArtifactsForAssets` — one canonical path. |
| `components/TriageQueue.tsx` · `DraftReviewQueue.tsx` · `AttentionQueue.tsx` · `StoreConnectShell.tsx` · `ConfidenceChip.tsx` | The surfaces; `ConfidenceChip` is the one confidence rendering/banding for both gates. |

## Agent disclosure

These surfaces review AI output but launch no agent from the client, and the pipeline's mandates
(valuation, listing_draft — W2/W5's side) do not yet exist as bindable mandate rows with stable
`mandateKey`s. When they land, register them via a manifest `agentRole` per the `agent-disclosure`
skill — never invent keys to satisfy disclosure early.

## Route chrome

Every route here is a (core) page: `<PageHeader>` carries the identity, the body is
`h-full` + `pt-[var(--shell-header-h)]` (interactive content at the top must clear the
glass — the core-route-headers doctrine). Never subtract the header height; never render
a faux in-body header bar.

## Change Log

- 2026-10-22 — `listAssetPipelineResults` + `AssetPipelineResults`: the per-asset view of every live step result (consumed by the intake asset page). Triage: the AI reasoning is clamped to three lines with a More/Less reveal so "Open full asset" and the bucket tiles stay above the fold; the queue load defers its reset a tick (React Compiler rule). Review follow-ups: the reasoning reveal is per item and only offered when there is more to show; `AssetPipelineResults` says "Still running" for pending/running rows, keeps a neutral empty state, uses `RegionSkeleton` while reading, and renders the instant lane's record alongside the ledger steps.

- 2026-10-21 — **No bulk on the three queues, by design.** Triage and Drafts decide one asset at a time on its own photos and evidence (a verdict is never applied unseen); Attention verdicts weigh the original against the skeptic per item. They are single-item decisions, so no bulk twin is declared.
- 2026-09-19 — **THE FOURTH ORGANIZATION STATE (R37).** `AttentionQueue`, `DraftReviewQueue` and `TriageQueue` rendered `OrganizationRequiredNotice` from `!organizationId && orgBootstrapResolved` — true for a FAILED read too, since `setOrgBootstrapFailure` sets that flag. Each now reads `useOrganizationRequired().organizationState` and renders `OrganizationContextNotice`, so a failed read gets "We could not check your organization" with Try again instead of a pick nobody verified was needed. Guard: `pnpm check:org-three-states` rule 5.
- 2026-09-17 — **The active organization, never the "effective" one.** The triage, drafts and
  attention queues and the store-connect shell read `selectOrganizationId` instead of
  `selectEffectiveOrganizationId`: with no organization selected they no longer review (and write
  verdicts against) the user's PERSONAL workspace. Each queue now says so and names the remedy,
  and step 1 of store-connect renames itself to "Choose the organization this store belongs to"
  instead of pointing at a personal-workspace settings page
  (`common-docs/policies/context-is-carried-never-rebuilt.md`).

- 2026-08-29 — Deleted the `/commerce/settings` parallel config surface (ruling;
  no-legacy): the store-connect step 1 now opens `/organizations/[orgId]/settings/configuration`
  (the SELECTED active org, `/organizations` when none — see the 2026-09-17 entry). Added
  `pt-[var(--shell-header-h)]` clearance to the triage/drafts/attention/stores bodies —
  their top-of-page controls sat behind the glass header. Registered the commerce
  billing-dimensions module in this feature's admin map.
- 2026-08-29 — Created (W11): both gate queues, the attention queue, the store-connect shell,
  the learning-tap-lawful write path, admin map.
