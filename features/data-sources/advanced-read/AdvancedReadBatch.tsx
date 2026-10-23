"use client";

import { useState } from "react";
import { Telescope } from "lucide-react";
import { Button, Switch } from "@ai-matrx/design-system/controls";

import { useLibraryOrganizationId } from "../library/hooks";
import { aboutTime, slowCoverage, type AdvancedAllow, type AdvancedItem } from "./contract";
import { CostDoor } from "@/components/cost/CostDoor";
import { confirmAdvancedRead, useConfirmOverPoints } from "./confirmAdvancedRead";
import { readEntry, startAdvancedRead, useReadVersion } from "./store";
import { useAdvancedQuote } from "./useAdvanced";

export interface AdvancedReadBatchProps {
  /** The pages that really failed (e.g. 50 of 300). */
  urls: readonly string[];
  onItem?: (item: AdvancedItem) => void;
  className?: string;
}

/**
 * "Try all N" — one quote for the whole batch (free, shown before the click), one stream, every page's
 * answer lands on that page. The tally below is the batch's own: read, not read.
 */
export function AdvancedReadBatch({ urls, onItem, className }: AdvancedReadBatchProps) {
  const organizationId = useLibraryOrganizationId();
  const confirmOver = useConfirmOverPoints();
  const version = useReadVersion();
  const [slow, setSlow] = useState(false);
  const unique = [...new Set(urls)];
  const idle = unique.filter((u) => !readEntry(u, version) || readEntry(u, version)?.status === "failed");
  const fast = useAdvancedQuote(idle, "fast", idle.length > 0);
  const slowOption = slowCoverage(fast.data?.items ?? []);
  const allow: AdvancedAllow = slow && slowOption ? "all" : "fast";
  const priced = useAdvancedQuote(idle, "all", Boolean(slowOption) && slow && idle.length > 0);
  const quote = allow === "all" ? priced.data : fast.data;
  const covered = (quote?.items ?? []).filter((i) => i.wouldTry.length > 0).map((i) => i.url);

  const tally = unique.reduce(
    (t, u) => {
      const e = readEntry(u, version);
      if (e?.status === "running") t.running += 1;
      else if (e?.status === "done") {
        if (e.item.ok) t.read += 1;
        else t.missed += 1;
      } else if (e?.status === "failed") t.missed += 1;
      return t;
    },
    { read: 0, missed: 0, running: 0 },
  );
  const started = tally.read + tally.missed + tally.running > 0;
  if (unique.length === 0) return null;
  if (!started && quote && covered.length === 0 && !slowOption) return null;

  const n = covered.length || idle.length;
  const go = async () => {
    if (!organizationId) return;
    if (!(await confirmAdvancedRead(quote?.pointsUpToTotal, confirmOver, `Try the advanced reader on ${n} pages?`))) return;
    startAdvancedRead({ organizationId, urls: covered.length ? covered : idle, allow, onItem });
  };
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className ?? ""}`} data-advanced-read-batch="">
      {n > 0 ? (
        <Button
          variant="quiet"
          icon={<Telescope className="h-3.5 w-3.5" />}
          onClick={go}
          disabled={!organizationId || !quote || tally.running > 0}
          data-action="advanced-read-all"
        >
          {tally.running > 0 ? "Reading" : `Try all ${n}`}
        </Button>
      ) : null}
      {n > 0 && quote?.pointsUpToTotal != null ? (
        <span data-advanced-read-quote="">
          <CostDoor points={quote.pointsUpToTotal} prefix="Up to " />
        </span>
      ) : null}
      {slowOption && n > 0 ? (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={slow} onCheckedChange={setSlow} aria-label="Include slow structured data" data-field="advanced-read-slow" />
          Include slow structured data{aboutTime(slowOption.typicalSeconds) ? ` (${aboutTime(slowOption.typicalSeconds)})` : ""}
        </label>
      ) : null}
      {quote?.limitApplied ? <span className="text-xs text-muted-foreground">First {quote.limitApplied.value} of {quote.limitApplied.requested}</span> : null}
      {started ? (
        <span className="text-xs text-muted-foreground" data-advanced-read-tally="">
          {tally.read} read · {tally.missed} not read
          {tally.running > 0 ? ` · ${tally.running} reading` : ""}
        </span>
      ) : null}
    </div>
  );
}
