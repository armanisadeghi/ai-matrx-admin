"use client";

import { useState } from "react";
import { Telescope } from "lucide-react";
import { Button, Switch } from "@ai-matrx/design-system/controls";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useLibraryOrganizationId } from "../library/hooks";
import { aboutTime, parseCoverageList, slowCoverage, type AdvancedAllow, type AdvancedItem } from "./contract";
import { CostDoor } from "@/components/cost/CostDoor";
import { confirmAdvancedRead, useConfirmOverPoints } from "./confirmAdvancedRead";
import { AdvancedReadResult } from "./AdvancedReadResult";
import { startAdvancedRead, useReadEntry } from "./store";
import { useAdvancedQuote } from "./useAdvanced";

export interface AdvancedReadButtonProps {
  /** The page our scraper could not read. */
  url: string;
  /** The failed read's own `coverage` list, when the server sent one: `[]` means nothing covers it (renders nothing). */
  coverage?: unknown;
  /** Called once with the page when it is read (a research source saves its text here). */
  onItem?: (item: AdvancedItem) => void;
  className?: string;
}

/**
 * "Try advanced reader" for ONE page that really failed. The price is quoted (free) before the click;
 * nothing paid ever runs by itself. The result replaces the button in place and survives a remount.
 */
export function AdvancedReadButton({ url, coverage, onItem, className }: AdvancedReadButtonProps) {
  const organizationId = useLibraryOrganizationId();
  const confirmOver = useConfirmOverPoints();
  const entry = useReadEntry(url);
  const [slow, setSlow] = useState(false);
  const declaredEmpty = Array.isArray(coverage) && parseCoverageList(coverage).length === 0;
  const read = entry?.status === "done" && entry.item.ok;
  const fast = useAdvancedQuote([url], "fast", !declaredEmpty && !read);
  const slowOption = slowCoverage(fast.data?.items ?? []);
  const allow: AdvancedAllow = slow && slowOption ? "all" : "fast";
  const priced = useAdvancedQuote([url], "all", Boolean(slowOption) && slow && !read);
  const quote = allow === "all" ? priced.data : fast.data;
  const item = quote?.items[0];

  if (read) {
    return (
      <div className={className} data-advanced-read={url}>
        <AdvancedReadResult item={entry.item} />
      </div>
    );
  }
  const go = async () => {
    if (!organizationId) return;
    if (!(await confirmAdvancedRead(item?.pointsUpTo, confirmOver, "Try the advanced reader?"))) return;
    startAdvancedRead({ organizationId, urls: [url], allow, onItem });
  };
  if (entry?.status === "running") {
    return (
      <div className={className} data-advanced-read={url}>
        <Button variant="quiet" icon={<Telescope className="h-3.5 w-3.5" />} disabled data-action="advanced-read">
          Reading
        </Button>
      </div>
    );
  }
  if (declaredEmpty || (quote && (!item || item.wouldTry.length === 0) && !slowOption)) return null;
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`} data-advanced-read={url}>
      {entry?.status === "done" ? <AdvancedReadResult item={entry.item} /> : null}
      {entry?.status === "failed" ? (
        <p className="text-sm text-destructive">
          {entry.message}
          <ErrorAlchemyMenu error={entry.message} />
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="quiet"
          icon={<Telescope className="h-3.5 w-3.5" />}
          onClick={go}
          disabled={!organizationId || !quote}
          data-action="advanced-read"
        >
          {entry?.status === "failed" || entry?.status === "done" ? "Try again" : "Try advanced reader"}
        </Button>
        {item?.pointsUpTo != null ? (
          <span data-advanced-read-quote="">
            <CostDoor points={item.pointsUpTo} prefix="Up to " />
          </span>
        ) : null}
        {slowOption ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={slow} onCheckedChange={setSlow} aria-label="Include slow structured data" data-field="advanced-read-slow" />
            Include slow structured data{aboutTime(slowOption.typicalSeconds) ? ` (${aboutTime(slowOption.typicalSeconds)})` : ""}
          </label>
        ) : null}
      </div>
    </div>
  );
}
