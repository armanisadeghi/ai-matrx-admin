"use client";

// features/mandates/feature-intelligence/PlacedJobs.tsx
//
// A page's jobs in the registry's shape, at any depth: the node's own jobs,
// then each child node as a collapsible group holding its jobs and its own
// children (Marketing → SEO → SEO Keywords). A job with per-surface versions is
// ONE roll-up row ("81 versions"); expanded it shows the job's split card and
// one compact line per version — nothing is merged, each line opens its own job.

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NewTabLink } from "@/components/official/entity-ref/NewTabLink";
import { MandateStatusBadge } from "../status/MandateStatusBadge";
import { featureIntelligenceHref } from "./hrefs";
import { entryKey, entryKeys, type NodeGroup, type PlacedEntry, type PlacementRow } from "./placement-model";
import type { FeatureIntelligenceRow, IntelligenceContext } from "./types";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";

export interface PlacedJobsProps {
  group: NodeGroup;
  rowByKey: ReadonlyMap<string, FeatureIntelligenceRow>;
  renderJob: (row: FeatureIntelligenceRow) => ReactNode;
  /** The full record page of one job, from this seat. */
  detailsHref: (mandateKey: AnyMandateKey) => string;
  focusMandateKey: AnyMandateKey | null;
  /** Searching opens every group so each match shows. */
  searching: boolean;
  context: IntelligenceContext;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function holds(group: NodeGroup, key: AnyMandateKey | null): boolean {
  if (!key) return false;
  return (
    group.own.some((entry) => entryKeys(entry).includes(key)) ||
    group.children.some((child) => holds(child, key))
  );
}

/** The page body: own jobs, then each child node. */
export function PlacedJobs(props: PlacedJobsProps) {
  const { group } = props;
  return (
    <div className="space-y-2">
      <EntryList entries={group.own} {...props} />
      {group.children.map((child) => (
        <NodeGroupRow key={child.slug} {...props} group={child} depth={0} />
      ))}
    </div>
  );
}

function EntryList({
  entries,
  rowByKey,
  renderJob,
  detailsHref,
  focusMandateKey,
  searching,
}: Omit<PlacedJobsProps, "group" | "context"> & { entries: readonly PlacedEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <ul className="space-y-2">
      {entries.map((entry) => {
        if (entry.kind === "job") {
          const row = rowByKey.get(entry.row.mandateKey);
          return row ? renderJob(row) : null;
        }
        return (
          <RollupRow
            key={`rollup:${entry.anchorId}`}
            entry={entry}
            rowByKey={rowByKey}
            renderJob={renderJob}
            detailsHref={detailsHref}
            open={searching || entryKeys(entry).includes(focusMandateKey ?? ("" as AnyMandateKey))}
          />
        );
      })}
    </ul>
  );
}

function NodeGroupRow(props: PlacedJobsProps & { depth: number }) {
  const { group, depth, focusMandateKey, searching, context } = props;
  const [expanded, setExpanded] = useState(() => holds(group, focusMandateKey));
  const open = expanded || searching;
  const panelId = `intelligence-node-${group.slug}`;
  return (
    <section
      className={cn("min-w-0 rounded-xl border border-border bg-card/40", depth > 0 && "bg-transparent")}
      aria-labelledby={`${panelId}-title`}
    >
      <div className="flex min-w-0 items-center gap-1.5 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? `Collapse ${group.name}` : `Expand ${group.name}`}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} aria-hidden />
        </button>
        <Link
          id={`${panelId}-title`}
          href={featureIntelligenceHref(group.slug, { context })}
          className="min-w-0 truncate type-title text-foreground hover:underline"
          title={group.name}
        >
          {group.name}
        </Link>
        {group.status && group.status !== "active" ? (
          <Badge variant="outline" className="shrink-0 font-normal capitalize text-muted-foreground">
            {group.status}
          </Badge>
        ) : null}
        <span className="ml-auto shrink-0 rounded-md bg-muted px-1.5 py-0.5 type-secondary font-medium tabular-nums text-muted-foreground">
          {plural(group.count, "job")}
        </span>
      </div>
      {open ? (
        <div id={panelId} className="space-y-2 px-2 pb-2">
          <EntryList entries={group.own} {...props} />
          {group.children.map((child) => (
            <NodeGroupRow key={child.slug} {...props} group={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function versionWhere(row: PlacementRow): string {
  return row.surfaceName ?? "No screen";
}

function RollupRow({
  entry,
  rowByKey,
  renderJob,
  detailsHref,
  open: forcedOpen,
}: {
  entry: Extract<PlacedEntry, { kind: "rollup" }>;
  rowByKey: ReadonlyMap<string, FeatureIntelligenceRow>;
  renderJob: (row: FeatureIntelligenceRow) => ReactNode;
  detailsHref: (mandateKey: AnyMandateKey) => string;
  open: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const open = expanded || forcedOpen;
  const anchorRow = entry.anchor ? rowByKey.get(entry.anchor.mandateKey) : undefined;
  const named = anchorRow ?? entry.versions.map((row) => rowByKey.get(row.mandateKey)).find(Boolean);
  const name = named?.shortName ?? entryKey(entry);
  const versions = entry.versions.filter((row) => rowByKey.has(row.mandateKey));
  const panelId = `intelligence-rollup-${entry.anchorId}`;
  return (
    <li
      id={`intelligence-rollup-${entryKey(entry)}`}
      data-rollup={entry.anchorId}
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
    >
      <div
        className="flex min-w-0 items-center gap-2 px-3 py-2.5 hover:bg-accent/20"
        data-clickable
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a, button")) return;
          setExpanded((value) => !value);
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? `Collapse ${name}` : `Expand ${name}`}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} aria-hidden />
        </button>
        <h3 className="min-w-0 truncate type-title text-foreground" title={name}>
          {name}
        </h3>
        <Badge variant="outline" className="shrink-0 font-normal tabular-nums text-muted-foreground">
          {plural(versions.length, "version")}
        </Badge>
      </div>
      {open ? (
        <div id={panelId} className="space-y-2 border-t border-border px-3 pb-3 pt-2">
          {anchorRow ? <ul>{renderJob(anchorRow)}</ul> : null}
          <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border" aria-label={`${name} versions`}>
            {versions.map((version) => {
              const row = rowByKey.get(version.mandateKey);
              if (!row) return null;
              const where = versionWhere(version);
              return (
                <li
                  key={version.mandateId}
                  id={`intelligence-${version.mandateKey}`}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-3 py-1.5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,9rem)_auto_auto]"
                >
                  <span className="min-w-0 truncate type-body text-foreground" title={where}>
                    {where}
                  </span>
                  <span className="hidden min-w-0 truncate type-body text-muted-foreground md:block" title={row.holderName}>
                    {row.holderName}
                  </span>
                  <span className="hidden min-w-0 truncate type-secondary text-muted-foreground md:block" title={row.decidedBy}>
                    {row.decidedBy}
                  </span>
                  <span className="hidden shrink-0 md:inline-flex">
                    <MandateStatusBadge status={row.status} size="sm" />
                  </span>
                  <NewTabLink href={detailsHref(row.mandateKey)} label={`${name} — ${where}`} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
