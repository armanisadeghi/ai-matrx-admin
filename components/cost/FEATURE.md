# components/cost — how a cost reaches the screen

**Where** a cost may appear is the policy: `../common-docs/policies/points-and-money-in-the-ui.md`
(owner ruling 2026-10-22). This folder is **how**: every figure goes through it.

## The pieces

| Piece | Use it for |
|---|---|
| `CostDoor.tsx` — `<CostDoor usd \| points \| rows />` | THE door: a quiet "Cost" link (or `iconOnly`) that shows the points in a popover on click; a system admin also sees dollars there under the "Admin only" tag. Every price outside a cost surface. |
| `AdminOnlyTag.tsx` — `<AdminOnly>`, `<AdminOnlyTag>` | The visible "Admin only" label around any admin-only dollar block off the admin site. Inside `<AdminOnly>`, `useSeesDollars()` is true for a system admin. |
| `Cost.tsx` — `<Cost usd />` | One figure on a cost surface (billing, usage, battles). In the admin's dollar mode off the admin site it draws the tag. |
| `CostBadge.tsx` | The tier-colored chip, inside a door or on a cost surface. |
| `useCostDisplay.ts` | `format` / `unit` / `toPoints` / `rate`; `useSeesDollars` (bare dollars: system admin on the admin site, or inside `<AdminOnly>`); `useIsCostAdmin` (the identity, for drawing a labelled admin block); `useOnAdminSurface`. |
| `costUnit.ts` | Out-of-render reads: `currentCostUnit()`, `currentSeesDollars()` (points off the admin site — plain text cannot carry the tag), `isAdminSurfacePath`. |
| `AdminCost.tsx`, `useAdminCost.ts`, `formatAdminCost.ts`, `adminCostColumns.ts`, `costColumn.ts` | Admin figures (dollars + points on the admin site, points elsewhere) and table columns. |
| `pointsRate*.ts` | The `billing.points_per_usd` knob, the one rate. |

## Rules

- The admin site is `/administration/**` (manage.aimatrx.com); it is the label for its own dollars.
- Plain strings (toasts, copy text, tooltips, `title=`) never carry dollars off the admin site; the helpers enforce it.
- Shared packages reach the door through their host slot (`@ai-matrx/chat` ui-slot `CostDoor`, `@ai-matrx/records-ui` host `CostDoor`), filled from here.

## Guard

`pnpm check:cost-display` (`scripts/check-cost-display.ts`, release gates, shrink-only baseline): P1 price placement
(`ALLOWED_PLACES` cases `billing/usage/pricing/budget`, `battle`, `admin-gated`, `out of points`, `usage door`; anything
inside `<CostDoor>`/`<AdminOnly>` is behind the door), P2 bare dollars off the admin site, R1–R7 correctness.
`--census` lists every price-showing file; `--self-test` proves the rules.

## Change log

- 2026-10-22 — CostDoor + AdminOnly added; dollars bare only on the admin site; guard P1 cases narrowed, door spans, P2 (owner ruling).
