---
type: Guide
title: Proof runs surface agent guide
---

# Proof runs

This is the administrator proof-run console, `/administration/compute/proof-runs`.
The surface is `matrx-admin/proof-runs`.
You can help author scenario test fixtures and inspect existing receipts.
Saving fixture data never runs its mandate or calls a provider.

## Start with the overview

`page_overview` is the compact XML overview supplied up front.
It contains read state, selected check/mode, checks, scenarios and recent receipts.
Lists carry `total` and `shown`, so a shortened list is never the whole registry.
Use it to describe the page without opening the same values with a context tool.
Look up the full arrays only when the specific task needs them.

## Loaded data

- `proof_checks`: check registry status records; their `slug` selects a check.
- `recent_runs`: the latest 25 run summaries; their `id` opens a receipt.
- `scenarios`: saved scenario records, including inactive scenarios.
- `mandate_catalog`: existing mandates and their supported engineered input names.
- `expectation_rules`: available rule vocabulary, requirements and help.
- `monthly_spend`, `month_to_date_usd`, `monthly_ceiling_usd`, `budget_percentage`: loaded spending evidence.

These loaded data values are absent before the combined read first succeeds.
An empty array after success means the server returned no rows.
During an in-flight refresh, the existing rows are the last successful read.
After a failed read these agent-facing arrays and budget values are absent.
`loading`, `data_loaded`, `organization_required`, `load_error`, and `read_state`
explain the difference. An organization refusal is distinct from an API failure.
Never infer a zero budget from values that have not loaded.

## Controls and run receipts

`selected_check`, `run_mode`, `running_check`, and `run_controls` describe execution controls.
`run_console` is the live started receipt, steps, proofs, completion and error state.
`open_run` is the selected history receipt, when successfully loaded.
`requested_run_id`, `run_detail_loading`, and `run_detail_error` belong to its latest request.
A later request supersedes an earlier response, so pending detail is never an old receipt.
`recent_runs_table_query`, `history_search` and `visible_runs` describe the canonical history view.

## Scenario draft

`scenario_draft` is the controlled open editor's composite.
`scenario_editor_state` carries raw variables text, parse error, saving and planted markers.
Its individually bindable fields are:
`scenario_slug`, `scenario_label`, `scenario_description`, `scenario_mandate_key`,
`scenario_user_input`, `scenario_variables`, `scenario_allowed_routes`,
`scenario_expectations`, `scenario_is_active`, `scenario_live_every_seconds`,
`scenario_max_cost_usd`, and the derived `scenario_check_slug`.
`scenario_variables_text` preserves even invalid JSON while `scenario_variables`
remains the last valid parsed object. `scenario_variables_error` explains a parse failure.
`scenario_saving` and `scenario_planted_markers` are the remaining editor-state constituents.
These editor values are absent when the editor is closed.

## Saved-list writes

All three list targets ask for one approval for the whole list.
They validate the complete list before showing a card and again before applying.
A refusal reports every discovered problem; nothing changes.
A partial API failure returns the saved identities and the records not attempted.
Do not repeat successful items just because a later item failed.

`create_scenarios` saves 1–25 new records using the editor's own save function.
Required fields: `slug`, `label`, `mandate_key` from the loaded catalog.
Optional authored fields: `description`, `variables`, `allowed_routes`, `expectations`,
`user_input`, `is_active`. Example:

```json
[
  {
    "slug": "example_check",
    "label": "Example check",
    "mandate_key": "<catalog key>",
    "variables": { "fact": "{{marker:FACT}}" },
    "expectations": [
      { "id": "read_fact", "rule": "contains_marker", "marker": "FACT" }
    ]
  }
]
```

`update_scenarios` saves `[{"id":"example_check","description":"New description"}]`.
Only fields supplied change; arrays and variables replace their whole field.
`is_active:false` disables reversibly, and `true` re-enables.
Slugs, derived check identities, cost ceilings and cadence cannot be changed through these targets.

`delete_scenarios` takes `["example_check"]` or `[{"id":"example_check"}]`.
It uses the existing soft-delete endpoint: the scenario disappears, recorded runs remain.
There is no deleted-record restore control on this page.
Prefer `update_scenarios` with `is_active:false` when reversible disable is enough.

## Draft and view writes

`open_scenario` takes a loaded slug, or `""` for the New scenario editor.
Save or cancel the current draft first; a hidden replacement is refused.
`scenario_draft` opens a new editor or patches its controlled authored fields:
`{"__kind":"json","label":"Proposed fixture","description":"Draft only"}`.
Nothing is saved. Saved slugs are immutable. If variables JSON is invalid,
include corrected `variables` in the patch before changing other draft fields.
`scenario_description` and `scenario_user_input` replace or patch their open draft text.
The person still presses Save scenario.

`selected_check` selects an existing check slug, without running it.
`run_mode` sets `auto`, `live` or `replay`, without starting a check.
`history_search` sets search text, with `""` clearing it.
`open_run` takes a recent run ID, or `""` to close its receipt.
These view changes are automatic; they neither save entities nor spend money.

## Boundaries

No target executes a proof or changes a spending ceiling or schedule.
Scenario variables and user input are engineered test fixtures, never ambient page context.
The subject conversation receives no page context or surface tools.
Use these page targets, not generic scope/data tools, to change scenario records.
If the requested action has no target, explain that and use `surface_feedback`.
