---
type: Feature
title: "Tool result tables"
description: "Keep a Tool answer's rows in the person's own table: remembered per Tool per person, deduped on the answer's key."
tags: [tools, tables, third-party-services]
timestamp: 2026-10-16
---

# Tool result tables (lane L6b)

- `rowsFromKind.ts` reads an answer as rows. Rows = the kind's one array-of-objects property (a single-record answer is one row). Column headers = the kind schema's field titles. Dedupe key = item fields marked `x-row-key` in the kind (aidream `Field(json_schema_extra={"x-row-key": True})`), else the first of url/link/id/email/domain/keyword/name, else the whole row; several fields make a synthetic "Key" column.
- `toolTableBinding.ts` remembers `{tableId, tableName, auto}` in `users.user_preferences.preferences.tools.resultTables.<toolId>`.
- `appendResultRows.ts` writes through the data-tables engine (`appendToTable`: matched columns, new columns added, `dedupe` on the key column, update on duplicate).
- `ToolResultTableBar.tsx` is mounted under the answer in the Tools home (`ToolResult`): first time it opens the one Save to a table (new or existing table); after that one press adds this run; "Add every run" appends each finished call on its own (off by default).

- A kind may declare how its rows read as a table: `x-table-order` (ascending; undeclared fields follow in schema order, the row key last) and `x-table-hide` (a technical field never offered as a column). Declared on the social kinds (aidream `kinds/tool_catalog_social.py`).
