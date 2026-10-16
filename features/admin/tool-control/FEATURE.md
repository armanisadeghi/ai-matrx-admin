# Tool control (admin)

**Route:** `/administration/agents/tool-control` (Tools & MCP → Tool Control). `?tool=<id>` opens one Tool.

Every third-party Tool (job) on one screen: its state, how well each source is doing, and the switches.
Rules and the server half: `aidream/aidream/services/tool_control/FEATURE.md`; contract:
`common-docs/projects/third-party-services/CONTRACT.md` §12.

| Piece | File |
|---|---|
| Tools list (one row per Tool: state, sources on, success with sample size, speed, last worked) | `ToolsTable.tsx` |
| One Tool: sources table (7/30-day success, speed, last worked/failed, errors in a row, 48-hour strip, Check / Turn on / Turn off), history | `ToolDetail.tsx`, `UptimeStrip.tsx` |
| Vendor accounts: pause by hand, resume after a check | `AccountsPanel.tsx` |
| Rules: the platform's Tool knobs (switch-off thresholds; each organization's off switch, disabled Tools, daily and per-call caps) | `FeatureKnobsPanel feature="tools"` |
| Reads (RLS, platform admins) / changes (`/admin/tool-control`) | `service.ts` |
| Pure words, roll-up, strip, history | `words.ts` (tests in `__tests__/`) |

- A source is turned on only after a real check succeeds: **Check and turn on** runs one call; **Turn on** alone is
  refused by the server until a check has passed since the source went off.
- The dock shows a switched-off source as one item (`tool-health`) that opens this screen.
- The generated database types predate these tables and views; `service.ts` types the query builder by hand until
  `types/database.types.ts` is regenerated.
