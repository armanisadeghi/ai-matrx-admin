"use client";

/**
 * The one-line ask above the lineup. It never compares anything itself: a CONCEPT ("medical spas in
 * Sherman Oaks", "best e-waste recycling in Los Angeles") finds real candidates to pick from, a LIST
 * ("Blue Medical Spa vs Sassy Med Spa") fills the cards, which then look themselves up for the person to
 * see. The line under the box says which it read, and one click flips it.
 */

import { useEffect, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Compass, ListPlus, Search } from "lucide-react";
import { Button, Chip } from "@ai-matrx/design-system/controls";
import { CostDoor } from "@/components/cost/CostDoor";

import { ProInput } from "@/components/official/ProInput";

import { planDiscovery, type InputMode, type Scope } from "../discovery";
import { isLink, parseInput, type KindKey } from "../parse-input";
import { nameFromLink } from "../verdict";

const PLAN_DELAY_MS = 400;

const PLACEHOLDER: Record<string, string> = {
  local_business: "med spas in Sherman Oaks — or A vs B",
  companies_reviews: "payroll software — or Gusto vs Rippling",
  products: "headphones under $300 — or two product links",
  social_accounts: "fitness creators on TikTok — or @a vs @b",
  list_items: "Lincoln Elementary in Omaha vs Westside Elementary",
};

export function AskBar({
  kindKey, text, onText, near, mode, onMode, scope, onScope, finding, stage, organizationId, onFind, onFill, quiet = false,
}: {
  kindKey: string;
  text: string;
  onText: (t: string) => void;
  near: string;
  mode: InputMode;
  onMode: (m: InputMode) => void;
  scope: Scope;
  onScope: (s: Scope) => void;
  finding: boolean;
  stage: string | null;
  organizationId: string;
  onFind: () => void;
  onFill: () => void;
  /** The found list below already says what was read: keep the line under the box empty. */
  quiet?: boolean;
}) {
  const find = mode === "find";
  const parsed = parseInput(text, kindKey as KindKey, near);
  const [planText, setPlanText] = useState(text);
  useEffect(() => {
    const t = setTimeout(() => setPlanText(text), PLAN_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);
  const plan = useQuery({
    queryKey: ["comparison", "discover-plan", organizationId, planText.trim(), kindKey, near.trim(), scope],
    queryFn: ({ signal }) => planDiscovery({ text: planText, kind: kindKey, area: near, scope }, { organizationId, signal }),
    enabled: find && planText.trim().length >= 2,
    staleTime: 60_000,
  });
  const reading = find && planText.trim().length >= 2 ? plan.data ?? null : null;
  const needsPlace = reading?.needs === "area" && !near.trim();
  const canFind = find && text.trim().length >= 2 && !finding && !needsPlace && reading !== null && !plan.isFetching;
  const canFill = !find && parsed.items.length >= 1;
  const go = () => (find ? canFind && onFind() : canFill && onFill());
  // Enter is a press of Find even while the line is still being read: it waits for the reading, then goes once.
  const [queuedFor, setQueuedFor] = useState<string | null>(null);
  const wantsFind = find && text.trim().length >= 2 && !finding;
  useEffect(() => {
    if (queuedFor === null) return;
    if (queuedFor !== text) { setQueuedFor(null); return; }
    if (canFind) { setQueuedFor(null); onFind(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedFor, text, canFind]);
  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (find ? canFind : canFill) go();
    else if (wantsFind && !needsPlace) setQueuedFor(text);
  };

  return (
    <div className="space-y-2">
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <ProInput value={text} onChange={(e) => onText(e.target.value)} onKeyDown={onEnter} aria-label="Describe or list"
          placeholder={PLACEHOLDER[kindKey] ?? "Describe it, or list names with vs"} wrapperClassName="flex-1" />
        {/* a paid search's cost sits behind the Cost door beside the button (the decide step) */}
        {find && reading && reading.points > 0 && !finding ? <CostDoor points={reading.points} /> : null}
        <Button type="submit" variant="outline" disabled={find ? !canFind : !canFill}
          icon={find || !canFill ? <Search className="h-4 w-4" /> : <ListPlus className="h-4 w-4" />}>
          {find || !canFill ? (finding ? "Finding" : "Find") : `Fill ${Math.min(parsed.items.length, 5)}`}
        </Button>
      </form>
      <div className="flex min-h-7 min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pl-1">
        {text.trim().length < 2 || (quiet && find && !finding) ? null : find ? (
          <>
            <Compass className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="type-secondary min-w-0 truncate text-muted-foreground">
              {finding && stage ? stage : needsPlace ? "Add a place in Near" : reading?.summary
                ?? <span className="inline-block h-3 w-40 animate-pulse rounded bg-muted align-middle" aria-label="Reading" />}
            </span>
            {reading?.mode === "places" || reading?.mode === "services" ? (
              <Button variant="quiet" onClick={() => onScope(reading.mode === "places" ? "nationwide" : "local")}>
                {reading.mode === "places" ? "Nationwide" : "Near a place"}
              </Button>
            ) : null}
            <Button variant="quiet" onClick={() => onMode("compare")}>These are names</Button>
          </>
        ) : (
          <>
            {parsed.items.slice(0, 5).map((i) => (
              <Chip key={i.text} label={isLink(i.text) ? nameFromLink(i.text) : i.text} tone="primary" />
            ))}
            <Button variant="quiet" onClick={() => onMode("find")}>Search for this</Button>
          </>
        )}
      </div>
    </div>
  );
}
