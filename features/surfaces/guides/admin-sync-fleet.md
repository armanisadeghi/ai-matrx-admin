---
type: Guide
title: Sync fleet surface agent guide
---

# Sync fleet

This is `/administration/applications/sync`, surface `matrx-admin/sync-fleet`.
It shows path-free organization-authorized folder-sync health.
It is an observation page, with table view controls.
It has no create, edit, delete, pause, quota or permission control for mappings.

## Start with the overview

`page_overview` is supplied as a compact XML bundle.
It reports loaded mapping count, health counts, observation time and searches.
It includes the first 12 mapping identities and states.
The list carries `total` and `shown` so truncation remains visible.
Describe the page from this overview before making any context lookup.
Read larger arrays only when the person's question requires the complete rows.

## Loaded fleet

`sync_mappings` contains the complete loaded path-free rows.
The server read is capped at 1000, ordered by state-change time.
`sync_mapping_count` counts these rows, not the entire underlying database.
Never claim that a loaded fleet represents every mapping in the platform.
Each row carries:

- `id`: mapping identity.
- `user_id`: account identity, not its name or email.
- `device_id`: device identity.
- `organization_id`: owning organization.
- `direction`: configured sync direction.
- `desired_state`: the person's intended state.
- `state`: the engine's observed state.
- `state_changed_at`: latest state transition, when known.
- `last_seen_at`: device check-in timestamp, when known.
- `last_synced_at`: last completed sync timestamp, when known.
- `items_total`: measured item count, or null when unmeasured.
- `bytes_total`: measured bytes, or null when unmeasured.
- `created_at`: registration timestamp, when known.

A null measurement is unknown, never a zero.
The page never reads local folder paths, state reasons or private mapping knobs.
Never invent these fields or attempt to infer them from an identity.

## Health segments

`over_quota_mappings` and `over_quota_count` are the loaded over-quota segment.
`accounts_over_quota` counts distinct accounts in that segment.
`stalled_mappings` and `stalled_count` identify mappings that need intervention.
`degraded_mappings` and `degraded_count` identify mappings still moving with degradation.
`behind_mappings` and `behind_count` identify active mappings with missing/stale check-ins.
`observed_at` is the browser clock used for silent-device classification and relative time.
`fleet_health` groups those counts and the same observation time.

Segments overlap: a mapping can occur in more than one segment.
Do not add segment counts and call the sum a mapping count.
A segment's total is computed before its table's search/filtering.
Changing a table search must never change the loaded health totals.

## Read state

`load_state` is `ready` because the server awaits the read before this client mounts.
A successful empty read really means no loaded mappings.
A failed read throws to the route error boundary before this runtime appears.
Never interpret the absence of a mounted runtime as an empty fleet.
This page does not poll mapping rows; the observation clock advances locally.
A page refresh is needed to read newer server mapping rows.

## Table view values

`fleet_table_views` contains one entry for each mounted segment.
The keys are `over-quota`, `stopped`, `degraded`, and `behind`.
Each entry has its canonical query: search, filters, sort and pagination.
Processed rows appear once the canonical table reports its view.
Query state is controlled by the parent and updates even if matching rows are unchanged.
Do not confuse processed rows with the underlying loaded segment.

The individually bindable search values are:
`over_quota_search`, `stalled_search`, `degraded_search`, `behind_search`.
Empty text means no search in that segment.

## View writes

The four matching string write targets change existing table search controls only.
They apply automatically because they only change view state.
They never change a record or make a provider call.

Example tool arguments:

```json
{ "target": "degraded_search", "value": "offline" }
```

To clear that search:

```json
{ "target": "degraded_search", "value": "" }
```

The canonical menu also offers Clear segment searches.
No mapping mutation target is declared: there is no such action on this page.
Do not use generic data or context tools to bypass that observation boundary.
If the person needs a physical intervention, explain the displayed state without claiming to do it.
Use `surface_feedback` when a requested capability is missing.
