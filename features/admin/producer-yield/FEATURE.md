# FEATURE — Yield register (pointer)

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/intelligence/producer-yield/FEATURE.md — read it before touching this feature in ANY repo.

Route: `/administration/reporting/producer-yield`.

| File | What it is |
|---|---|
| `types.ts` | Contract-derived row types **and the only sanctioned renderers** — `formatRate` / `formatUsd` / `formatCount` return an em dash for null. |
| `api.ts` | Typed client for `/admin/producer-yield` and its floor trigger. |
| `ProducerYieldConsole.tsx` | One statically-imported client component (the fragmentation law). Table + stat cards + the reporting `<AssistStrip/>`. |

## 🚨 The rule this surface must not break

**NULL IS NEVER ZERO.** `yield_rate ?? 0` turns "nobody has ever looked at this
producer" into "this producer is worthless" — opposite problems with opposite
fixes. Three states are rendered as distinct badges (`Unmeasurable`,
`Unmeasured`, `Measured`), and every number goes through the formatters above.
**Never write `?? 0` in this feature.**

**THE DOOR LAW.** Every producer row links to the surface where its outcomes
actually live (`door_href`), so a bad number is one click from the thing that
made it.
