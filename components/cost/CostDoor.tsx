"use client";

/**
 * components/cost/CostDoor.tsx — THE COST DOOR (owner ruling 2026-10-22,
 * common-docs/policies/points-and-money-in-the-ui.md):
 *
 *   "Users should never see points usage or be told about points unless they are somewhere that is
 *    specifically for that purpose or they have clicked something to get usage."
 *
 * Outside a cost-purpose surface (billing, usage, wallet, plans, budgets, battles) a price never
 * prints on the page. It sits behind this quiet door: a "Cost" link (or an icon in a dense row) that
 * the person CLICKS to reveal the points in a popover. Task pages, forms, how-many pickers, confirm
 * footers, cards, history rows and run views all use it. A confirm step keeps its confirm; the cost
 * moves in here.
 *
 * Pass USD (`usd`) or points (`points`) — or several labelled `rows` ("Per record", "Total"). The
 * door formats them (points for everyone). A system admin also sees the dollar figure, inside the
 * door, under the visible "Admin only" tag. Package hosts that format their own points (the chat and
 * records-ui slots) pass ready text through `rows[].text`.
 *
 * `pnpm check:cost-display` treats everything inside `<CostDoor …>` as behind the door.
 */

import { Coins } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { formatPoints } from "@ai-matrx/kit/format";
import { cn } from "@/lib/utils";
import { AdminOnlyTag } from "./AdminOnlyTag";
import { formatAdminUsd } from "./formatAdminCost";
import { useCostDisplay, useIsCostAdmin } from "./useCostDisplay";

export interface CostDoorRow {
  label: string;
  /** The figure in USD as the server reported it. */
  usd?: number | null;
  /** The figure already in points. */
  points?: number | null;
  /** Ready text from a package host that formats its own points ("40 points"). */
  text?: string | null;
  /** Prefix for an estimate ("~", "up to "). */
  prefix?: string;
}

export interface CostDoorProps {
  /** One figure in USD (the usual case). */
  usd?: number | null;
  /** One figure already in points. */
  points?: number | null;
  /** Several labelled figures instead of one. */
  rows?: CostDoorRow[];
  /** Prefix for an estimate ("~", "up to "). */
  prefix?: string;
  /** The door's text; default "Cost". */
  label?: string;
  /** Icon-only door for a dense row or table cell. */
  iconOnly?: boolean;
  className?: string;
}

function hasFigure(r: CostDoorRow): boolean {
  return (
    (typeof r.usd === "number" && Number.isFinite(r.usd)) ||
    (typeof r.points === "number" && Number.isFinite(r.points)) ||
    Boolean(r.text)
  );
}

export function CostDoor({ usd, points, rows, prefix, label = "Cost", iconOnly, className }: CostDoorProps) {
  const { toPoints } = useCostDisplay();
  const seesDollars = useIsCostAdmin();
  const list: CostDoorRow[] = rows ?? [{ label, usd, points, prefix }];
  if (!list.some(hasFigure)) return null;

  const pointsText = (r: CostDoorRow): string => {
    if (r.text) return r.text;
    const p = typeof r.points === "number" ? r.points : toPoints(r.usd);
    return p === null || p === undefined ? "—" : `${r.prefix ?? prefix ?? ""}${formatPoints(p)}`;
  };
  const adminUsd = list.filter((r) => typeof r.usd === "number" && Number.isFinite(r.usd));

  return (
    <Popover>
      <PopoverTrigger asChild>
        {iconOnly ? (
          <Button variant="quiet" aria-label={label} icon={<Coins />} className={className} />
        ) : (
          <Button variant="link" icon={<Coins />} className={className}>
            {label}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-[10rem] max-w-[18rem] p-3 text-sm">
        <dl className="grid grid-cols-[auto_auto] items-baseline gap-x-4 gap-y-1">
          {list.filter(hasFigure).map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="text-right font-medium tabular-nums">{pointsText(r)}</dd>
            </div>
          ))}
        </dl>
        {seesDollars && adminUsd.length > 0 && (
          <div className={cn("mt-2 border-t border-border pt-2")}>
            <AdminOnlyTag />
            <dl className="mt-1 grid grid-cols-[auto_auto] items-baseline gap-x-4 gap-y-1">
              {adminUsd.map((r) => (
                <div key={r.label} className="contents">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className="text-right tabular-nums">{formatAdminUsd(r.usd)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
