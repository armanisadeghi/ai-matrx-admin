---
type: Reference
title: Assists inbox agent guide
---

# Assists inbox

The inbox lists proposals from existing producers.
It offers triage, view controls, and a way to resume quieted assists.
It does not create proposals or execute their actions.

## Read the current view

Start with `assist_overview` for the current view and a compact loaded list.
The bundle counts any rows omitted from its preview.
Use `loaded_assists` when the complete current page is needed.
The page is one server result page, not the entire matching inbox.
Use `assist_total_count` for the server-side match count.
Use `assist_status_counts` for the per-status totals.

`assist_load_state` is `loading`, `ready`, or `failed`.
On loading or failure, previous rows and totals are absent.
`assist_load_error` describes a current failure.
Do not interpret unavailable rows as an empty inbox.

`assist_table_controls` is the immediate table state.
`assist_table_query` is the search-debounced read state.
A newly typed search may be visible before that read starts.
The scope treats this interval as loading rather than publishing old rows.
`assist_view` combines tab, urgency, flags, query and quiet state.

## Change the view

Use `set_assist_view`; it changes only settings supplied in its object.
It neither changes assist records nor executes a proposal.

```json
{"status_tab":"pending","urgency":"urgent","include_snoozed":true}
```

Supported tabs: `pending`, `accepted`, `dismissed`, `resolved`, `all`.
`resolved` means the condition went away; it does not mean accepted.
Urgency is `normal`, `elevated`, `urgent`, or null for every band.
Flags are `include_snoozed`, `starred_only`, `unseen_only`, `show_silenced`.
`search` changes the table's text search.
`source_key`, `source_kind`, and `surface_name` set existing column filters.
Null clears any of those three filters.
Source kinds are `deterministic`, `agent`, `sweep`, and `stream`.
`page` and `page_size` are positive integers.
Filter/search/sort changes reset to page one unless a page is supplied.
`sort` takes an id and `asc` or `desc`, or null to clear sorting.
Use the target description for the permitted sort ids.

## Triage existing rows

Use `update_assists` for an array of changes to current loaded rows.
The person approves the changes before canonical functions save them.
Each entry names exactly one operation for one id.
Repeated or unloaded ids are refused before any change.

```json
[{"id":"<loaded-assist-uuid>","starred":true}]
```

`starred` flags or unflags the record.
`status: "dismissed"` removes it from active suggestions while retaining it.
`status: "pending"` restores it through the existing Restore control.
`snooze` takes `1d`, `7d`, or `30d` and requires a pending row.
Do not combine starred, status and snooze in the same entry.
To perform another operation on the same assist, use a subsequent request.
The receipt names which records were changed and any partial list failure.

## Quiet and sources

`assist_quiet` and `assist_quiet_until` describe the global quiet preference.
`assist_preferences_ready` must be true before changing it.
`resume_assists` takes boolean true and asks the person before saving.
It resumes global assists without accepting or executing any proposal.
`source_suppressions` contains the loaded source quiet records.
`silenced_sources` contains their source keys.
Resuming global assists does not undo a source-specific quiet decision.

## Boundaries

The inbox has no create or hard-delete control.
Producer-owned proposals cannot be fabricated through these targets.
No target accepts an action payload, mandate key or agent definition.
Execution remains the assist's own verb-labeled user control.
Use the returned write receipt to describe what actually landed.
After a view change, wait for the next successful read before using row ids.
Use the page's targets rather than generic database or context tools.
