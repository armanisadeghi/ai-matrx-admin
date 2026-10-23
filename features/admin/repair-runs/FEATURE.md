# Repair Runs (admin surface)

**Route:** `/administration/compute/repair-runs` (super admin). Server contract and every rule:
`aidream/aidream/services/platform_repair/FEATURE.md`.

A super admin picks an agent and either a known problem (system error, feedback, check finding —
by record id) or types what to do, and presses Start. The server starts the run AS them, in their
admin organization, as an ordinary chat bound to the platform's own sandbox. The chat opens on the
main site in a new tab (`crossDeploymentHref("/chat/<id>")`), where it streams live, shows its
sub-agents and sandbox, and keeps taking messages. Nothing starts on its own.

| File | What it is |
|---|---|
| `api.ts` | The three calls (`POST/GET /admin/platform-repair/runs`, `GET /admin/platform-repair/box`) as inline descriptors on `serverApi`; replace with the generated `@ai-matrx/api/architecture` operations once the package carries them. |
| `RepairRunsConsole.tsx` | The platform box line, the Start form, the runs list (refreshes every 10 s). |

Rules:
- The default agent is the newest run's agent, read from the server's list — never browser storage.
- `?subject_kind=system_error|feedback|check_finding&subject_id=<uuid>` pre-fills the problem, so
  any admin page can link a record straight to a run.
- The new tab is opened inside the click (browsers block a tab opened after an await) and closed
  if the server refuses; the refusal sentence shows beside Start as the server wrote it.
- Each run row opens its chat; its sandbox opens the admin sandbox record page.

## Change Log
- 2026-10-23: created.
