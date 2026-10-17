"use client";

/**
 * The one friendly box. A person types a CONCEPT ("best bike shops in Bend", "payroll software",
 * "who competes with @handle") or a LIST ("Hydro Flask vs Yeti", names with their city, links). The
 * box says which it read — "Find for me" or "Compare these" — and the person can flip it. A concept
 * shows how we will search for it and what finding costs before anything is spent; a list shows its
 * items as chips. Links decide their own kind; coming kinds stay visible, marked "Soon".
 */

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Compass, Globe, MapPin, Search, Share2, ShoppingBag, Store } from "lucide-react";
import { Button, Chip, SegmentedControl } from "@ai-matrx/design-system/controls";
import { announceComingSoon } from "@ai-matrx/kit/coming-soon";
import { formatPoints } from "@ai-matrx/kit/format";

import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";

import type { ComparisonKindInfo } from "../contract";
import { planDiscovery, type InputMode, type Scope } from "../discovery";
import { parseInput, isLink, type KindKey } from "../parse-input";
import { nameFromLink } from "../verdict";

const KIND_UI: Record<string, { label: string; icon: React.ReactNode; hint: string; soonId?: string }> = {
  companies_reviews: { label: "Companies", icon: <Building2 className="h-4 w-4" />, hint: "Names, websites or review links" },
  local_business: { label: "Local businesses", icon: <Store className="h-4 w-4" />, hint: "Names with their city, or map links" },
  products: { label: "Products", icon: <ShoppingBag className="h-4 w-4" />, hint: "", soonId: "compare.products" },
  social_accounts: { label: "Social", icon: <Share2 className="h-4 w-4" />, hint: "", soonId: "compare.social-accounts" },
};

const MODE_OPTIONS = [
  { value: "find" as const, label: "Find for me" },
  { value: "compare" as const, label: "Compare these" },
];

/** What the box waits for after the last keystroke before reading a concept (free, no search). */
const PLAN_DELAY_MS = 400;

export function CompareInput({
  kinds, kindKey, onKind, text, onText, area, onArea, onFind, finding, mode, onMode, scope, onScope,
  onDiscover, organizationId, stage,
}: {
  kinds: ComparisonKindInfo[];
  kindKey: string;
  onKind: (key: string) => void;
  text: string;
  onText: (t: string) => void;
  area: string;
  onArea: (a: string) => void;
  onFind: () => void;
  finding: boolean;
  /** The mode the box is in (inferred from the text unless the person flipped it). */
  mode: InputMode;
  onMode: (m: InputMode) => void;
  scope: Scope;
  onScope: (s: Scope) => void;
  onDiscover: () => void;
  organizationId: string;
  /** The step a running discovery is on ("Searching the map"). */
  stage: string | null;
}) {
  const kind = kinds.find((k) => k.key === kindKey) ?? null;
  const parsed = parseInput(text, kindKey as KindKey, area);
  const linkKind = parsed.suggestedKind ? kinds.find((k) => k.key === parsed.suggestedKind) ?? null : null;
  const blockedByLinks = linkKind !== null && linkKind.status !== "live";
  const names = parsed.items.filter((i) => !isLink(i.text)).length;
  const lookupCost = (kind?.lookup_points ?? 0) * names;
  const canFind = parsed.items.length >= 2 && !finding && !blockedByLinks && kind?.status === "live";
  const ui = KIND_UI[kindKey];
  const findMode = mode === "find";

  // The concept is read on the server (free) a moment after typing stops.
  const [planText, setPlanText] = useState(text);
  useEffect(() => {
    const t = setTimeout(() => setPlanText(text), PLAN_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);
  const plan = useQuery({
    queryKey: ["comparison", "discover-plan", organizationId, planText.trim(), kindKey, area.trim(), scope],
    queryFn: ({ signal }) => planDiscovery({ text: planText, kind: kindKey, area, scope }, { organizationId, signal }),
    enabled: findMode && planText.trim().length >= 2,
    staleTime: 60_000,
  });
  const reading = findMode && planText.trim().length >= 2 ? plan.data ?? null : null;
  const needsArea = reading?.needs === "area" && !area.trim();
  const showNear = kindKey === "local_business" || reading?.mode === "places" || reading?.needs === "area";
  const canDiscover = findMode && text.trim().length >= 2 && !finding && !needsArea && !plan.isFetching && reading !== null;

  // A city typed on the last place ("A vs B, Nashville TN") shows up in the Near box, editable.
  // Only the box's own earlier fill (or an empty box) is replaced — never what the person typed there.
  const autoArea = useRef("");
  useEffect(() => {
    if (findMode || !parsed.sharedArea || parsed.sharedArea === autoArea.current) return;
    if (area.trim() === "" || area === autoArea.current) {
      autoArea.current = parsed.sharedArea;
      onArea(parsed.sharedArea);
    }
  }, [findMode, parsed.sharedArea, area, onArea]);

  const go = () => (findMode ? (canDiscover ? onDiscover() : undefined) : (canFind ? onFind() : undefined));

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="What to compare">
        {kinds.map((k) => {
          const meta = KIND_UI[k.key];
          const soon = k.status !== "live";
          return (
            <Button key={k.key} variant="outline" pressed={k.key === kindKey && !soon} icon={meta?.icon}
              meta={soon ? "Soon" : undefined}
              onClick={() => (soon ? void announceComingSoon(meta?.soonId ?? k.key) : onKind(k.key))}>
              {meta?.label ?? k.label}
            </Button>
          );
        })}
      </div>

      <div className="space-y-2">
        <ProTextarea
          value={text}
          onChange={(e) => onText(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); go(); } }}
          placeholder={findMode ? "best bike shops in Bend, OR" : kind?.example ?? "Type two or more, separated by vs"}
          aria-label="What to compare"
          autoGrow
          minHeight={112}
          maxHeight={320}
          enableCleanup={false}
        />
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl value={mode} onValueChange={onMode} data={MODE_OPTIONS} aria-label="Mode" />
          {showNear ? (
            <ProInput value={area} onChange={(e) => onArea(e.target.value)} placeholder="Near, e.g. Portland, OR"
              aria-label="Near" wrapperClassName="w-56 max-w-full" />
          ) : null}
          {findMode && (reading?.mode === "places" || reading?.mode === "services") ? (
            <Button variant="quiet" icon={reading.mode === "places" ? <Globe className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              onClick={() => onScope(reading.mode === "places" ? "nationwide" : "local")}>
              {reading.mode === "places" ? "Nationwide instead" : "Near a place instead"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {findMode ? (
            stage && finding ? (
              <span className="type-secondary text-foreground">{stage}</span>
            ) : reading ? (
              <span className="type-secondary inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <Compass className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate" title={reading.summary}>{needsArea ? "Add a place, or search nationwide" : reading.summary}</span>
              </span>
            ) : (
              <span className="type-secondary text-muted-foreground">A kind of business, product or account</span>
            )
          ) : parsed.items.length === 0 ? (
            <span className="type-secondary text-muted-foreground">{ui?.hint}</span>
          ) : (
            parsed.items.map((i) => (
              <Chip key={i.text} label={isLink(i.text) ? nameFromLink(i.text) : i.text} tone="primary" />
            ))
          )}
          {!findMode && blockedByLinks && linkKind ? (
            <span className="type-secondary text-warning-ink">{KIND_UI[linkKind.key]?.label ?? linkKind.label} links are coming soon</span>
          ) : null}
        </div>
        {findMode ? (
          <Button variant="primary" hero icon={<Search className="h-4 w-4" />} onClick={go} disabled={!canDiscover}
            meta={reading && reading.points > 0 ? formatPoints(reading.points, { short: true }) : undefined}>
            {finding ? "Finding" : "Find for me"}
          </Button>
        ) : (
          <Button variant="primary" hero icon={<Search className="h-4 w-4" />} onClick={go} disabled={!canFind}
            meta={lookupCost > 0 ? formatPoints(lookupCost, { short: true }) : undefined}>
            {finding ? "Finding" : parsed.items.length >= 2 ? `Find ${parsed.items.length}` : "Find them"}
          </Button>
        )}
      </div>
    </section>
  );
}
