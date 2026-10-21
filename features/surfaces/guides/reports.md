---
type: Reference
title: Reports agent guide
---

# Reports

Reports show analyses over existing platform data.
The landing and Agent Drift share the Reports surface identity.
The administrator catalog uses its own reporting identity.

## Landing

`report_overview` summarizes the rendered report catalog.
`reports_catalog` contains its complete metadata.
`report_count` counts every rendered card, including coming-soon cards.
`available_report_slugs` contains only live reports.
The landing does not fabricate findings or a selected report.

Use `open_report` with a live report slug to follow its existing route.

```json
"agent-drift"
```

An unknown or non-live slug is refused.
Opening a report is navigation; it does not change source records.

## Agent Drift read state

`report_slug` identifies the open report.
`report_title` is its human name.
`report_is_admin_scope` distinguishes personal from platform-wide data.
Do not describe platform-wide figures as the person's own data.

`report_load_status` contains the current status and any error.
Findings, count and totals are absent until the read succeeds.
An absent count is not zero.
A successfully loaded empty report has an empty findings array and zero count.

`report_findings` contains one row per drifted agent in the loaded rollup.
Each row includes agent id/name, current version and severity counts.
It also includes usage and stale-pin counts.
These rows follow the table's current search, filters and sort, before pagination.
`report_page_findings` is the exact current page; `report_source_records` is the raw loaded read.
`report_view_status` stays pending until query and source match the published table view.
`report_table_query` records the active controls over those source rows.
`report_totals` covers the successful report rollup, not just one table page.
`report_overview` includes a compact preview of at most 25 source rows.
Any omitted rows are counted by the XML bundle.

## Report view controls

Use `set_report_view` to change only supplied settings.
These are UI changes; agent definitions and usage pins are unaffected.

```json
{"search":"Assistant","page":1,"sort":{"id":"breaking","direction":"desc"}}
```

`search` is text.
`page` and `page_size` are positive integers.
`sort` is null or an object with id and direction.
Sort ids: `agent`, `usages`, `breaking`, `silent`, `stale`.
Directions: `asc`, `desc`.
Search/sort/page-size changes return to page one unless page is supplied.

To inspect an agent, use its id from successful `report_findings`.

```json
{"selected_agent_id":"<loaded-agent-uuid>"}
```

Unknown ids are refused.
Use `selected_agent_id: null` to close the detail pane.
This target is available on Agent Drift, not on the catalog landing.

## Selected-agent detail

`agent_usage_detail` is supplied only while the shared usage engine is mounted.
It records the selected agent identity and personal/admin mode.
Its scan, mandate and history branches carry their own read states.
Failed or loading scan/mandate reads omit previous payloads.
Successful scan data includes groups, aggregates and summary.
Successful mandate data includes the existing impact result and posture.
The detail includes active dimension, row selection and mutation/dialog state.
Dimension rows are supplied before the detail table's own local filters.
Do not claim a row is on screen merely because it is in that source list.

## Boundaries

The report surface does not create/delete agents or alter usage pins.
Its view targets do not authorize remediation, notifications or agent execution.
Use the report's existing real actions for such work with the person's intent.
Do not invent a new agent definition to explain or fix a drift finding.
Use status and receipts to distinguish loaded, requested and saved state.
Use these page controls rather than generic database or context writes.
