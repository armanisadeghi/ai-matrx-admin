"use client";

/**
 * The one friendly box. A person types or pastes anything — "Hydro Flask vs Yeti", a list, names
 * with their city, any link — and sees what we read from it as they type. Links decide their own
 * kind; otherwise the chosen kind does. Coming kinds stay visible, marked "Soon".
 */

import { useEffect, useRef } from "react";
import { Building2, Search, Share2, ShoppingBag, Store } from "lucide-react";
import { Button, Chip } from "@ai-matrx/design-system/controls";
import { announceComingSoon } from "@ai-matrx/kit/coming-soon";
import { formatPoints } from "@ai-matrx/kit/format";

import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";

import type { ComparisonKindInfo } from "../contract";
import { parseInput, isLink, type KindKey } from "../parse-input";
import { nameFromLink } from "../verdict";

const KIND_UI: Record<string, { label: string; icon: React.ReactNode; hint: string; soonId?: string }> = {
  companies_reviews: { label: "Companies", icon: <Building2 className="h-4 w-4" />, hint: "Names, websites or review links" },
  local_business: { label: "Local businesses", icon: <Store className="h-4 w-4" />, hint: "Names with their city, or map links" },
  products: { label: "Products", icon: <ShoppingBag className="h-4 w-4" />, hint: "", soonId: "compare.products" },
  social_accounts: { label: "Social", icon: <Share2 className="h-4 w-4" />, hint: "", soonId: "compare.social-accounts" },
};

export function CompareInput({ kinds, kindKey, onKind, text, onText, area, onArea, onFind, finding }: {
  kinds: ComparisonKindInfo[];
  kindKey: string;
  onKind: (key: string) => void;
  text: string;
  onText: (t: string) => void;
  area: string;
  onArea: (a: string) => void;
  onFind: () => void;
  finding: boolean;
}) {
  const kind = kinds.find((k) => k.key === kindKey) ?? null;
  const parsed = parseInput(text, kindKey as KindKey, area);
  const linkKind = parsed.suggestedKind ? kinds.find((k) => k.key === parsed.suggestedKind) ?? null : null;
  const blockedByLinks = linkKind !== null && linkKind.status !== "live";
  const names = parsed.items.filter((i) => !isLink(i.text)).length;
  const lookupCost = (kind?.lookup_points ?? 0) * names;
  const canFind = parsed.items.length >= 2 && !finding && !blockedByLinks && kind?.status === "live";
  const ui = KIND_UI[kindKey];

  // A city typed on the last place ("A vs B, Nashville TN") shows up in the Near box, editable.
  // Only the box's own earlier fill (or an empty box) is replaced — never what the person typed there.
  const autoArea = useRef("");
  useEffect(() => {
    if (!parsed.sharedArea || parsed.sharedArea === autoArea.current) return;
    if (area.trim() === "" || area === autoArea.current) {
      autoArea.current = parsed.sharedArea;
      onArea(parsed.sharedArea);
    }
  }, [parsed.sharedArea, area, onArea]);

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
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canFind) { e.preventDefault(); onFind(); } }}
          placeholder={kind?.example ?? "Type two or more, separated by vs"}
          aria-label="What to compare"
          autoGrow
          minHeight={112}
          maxHeight={320}
          enableCleanup={false}
        />
        {kindKey === "local_business" ? (
          <ProInput value={area} onChange={(e) => onArea(e.target.value)} placeholder="Near, e.g. Portland, OR"
            aria-label="Near" wrapperClassName="max-w-xs" />
        ) : null}
      </div>

      <div className="flex min-h-12 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {parsed.items.length === 0 ? (
            <span className="type-secondary text-muted-foreground">{ui?.hint}</span>
          ) : (
            parsed.items.map((i) => (
              <Chip key={i.text} label={isLink(i.text) ? nameFromLink(i.text) : i.text} tone="primary" />
            ))
          )}
          {blockedByLinks && linkKind ? (
            <span className="type-secondary text-warning-ink">{KIND_UI[linkKind.key]?.label ?? linkKind.label} links are coming soon</span>
          ) : null}
        </div>
        <Button variant="primary" hero icon={<Search className="h-4 w-4" />} onClick={onFind} disabled={!canFind}
          meta={lookupCost > 0 ? formatPoints(lookupCost, { short: true }) : undefined}>
          {finding ? "Finding" : parsed.items.length >= 2 ? `Find ${parsed.items.length}` : "Find them"}
        </Button>
      </div>
    </section>
  );
}
