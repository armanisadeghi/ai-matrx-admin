"use client";

// features/mandates/feature-intelligence/IntelligenceIndex.tsx
//
// /intelligence — the directory of every part of the app that uses AI, in the
// live registry's shape: a section per Domain (its own jobs first), a card per
// Feature (its icon and name, the jobs at or below it, how many places they
// run, and — once the member list answers — how many agents and workflows run
// them for you and how many are not running), with one collapsible row per
// node below it at any depth; then Everywhere, the owner lanes and Unplaced.
// Search finds a card by its name, its Domain, a node below it, or anything
// inside it. `focusDomain` (from `?domain=`) scrolls to a Domain.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CircleAlert,
  ChevronRight,
  CircleCheck,
  Loader2,
  MapPin,
  Workflow,
} from "lucide-react";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdmin } from "@/lib/redux/selectors/userSelectors";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { featureIntelligenceHref } from "./hrefs";
import { featureIcon } from "./feature-icons";
import { IntelligenceSearchBar, useIntelligenceQuery } from "./IntelligenceSearch";
import { useIntelligenceDirectory } from "./useIntelligenceDirectory";
import {
  matchFeature,
  matchStrength,
  summarize,
  type DirectoryChild,
  type DirectoryDomain,
  type DirectoryFeature,
  type MatchReason,
} from "./index-model";

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/** A domain header's counts: only the ones that are not zero. */
const countsLabel = (features: number, jobs: number) =>
  [features > 0 ? plural(features, "feature") : "", jobs > 0 ? plural(jobs, "job") : ""]
    .filter(Boolean)
    .join(", ");

function jobsLine(feature: DirectoryFeature): string {
  if (feature.jobs.length === 0) return "No jobs you can see yet";
  const names = feature.jobs
    .slice(0, 4)
    .map((job) => (job.versions > 0 ? `${job.name} (${plural(job.versions, "version")})` : job.name));
  const more = feature.jobs.length - names.length;
  return more > 0 ? `${names.join(", ")} and ${more} more` : names.join(", ");
}

function reasonText(reason: MatchReason): string | null {
  if (reason.kind === "name" && reason.partial) return null;
  switch (reason.kind) {
    case "job":
      return `Job: ${reason.text}`;
    case "place":
      return `Runs on: ${reason.text}`;
    case "holder":
      return `Run by: ${reason.text}`;
    default:
      return null;
  }
}

function FeatureCard({
  feature,
  reason,
}: {
  feature: DirectoryFeature;
  reason: MatchReason;
}) {
  const Icon = featureIcon(feature.feature, feature.domain);
  const summary = summarize(feature);
  const why = reasonText(reason);
  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40">
      <Link
        href={featureIntelligenceHref(feature.feature)}
        className="group flex min-w-0 flex-1 flex-col gap-2 p-3.5 transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-ink">
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-foreground">
            {feature.label}
          </span>
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 type-secondary font-medium tabular-nums text-muted-foreground">
            {plural(feature.jobs.length, "job")}
          </span>
        </div>
        <p className="line-clamp-2 type-body leading-snug text-muted-foreground">
          {jobsLine(feature)}
        </p>
        {why ? (
          <p className="truncate type-secondary font-medium text-primary">{why}</p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 type-secondary text-muted-foreground">
          {summary.agents > 0 ? (
            <span className="inline-flex items-center gap-1">
              <AGENT_ICON className="h-3.5 w-3.5" aria-hidden />
              {plural(summary.agents, "agent")}
            </span>
          ) : null}
          {summary.workflows > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Workflow className="h-3.5 w-3.5" aria-hidden />
              {plural(summary.workflows, "workflow")}
            </span>
          ) : null}
          {feature.places.length > 0 ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {plural(feature.places.length, "place")}
            </span>
          ) : null}
          {summary.known ? (
            summary.notRunning > 0 ? (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                {summary.notRunning} not running
              </span>
            ) : feature.jobs.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                All running
              </span>
            ) : null
          ) : null}
        </div>
      </Link>
      {feature.children.length > 0 ? (
        <ul className="border-t border-border/70 px-1.5 py-1" aria-label={`${feature.label} parts`}>
          {feature.children.map((child) => (
            <ChildRow key={child.slug} child={child} depth={0} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** One node below a card: its name and job count, opening its own page; its own children fold under it. */
function ChildRow({ child, depth }: { child: DirectoryChild; depth: number }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="min-w-0">
      <div className="flex min-w-0 items-center gap-1" style={{ paddingLeft: depth * 14 }}>
        {child.children.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? `Collapse ${child.label}` : `Expand ${child.label}`}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} aria-hidden />
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" aria-hidden />
        )}
        <Link
          href={featureIntelligenceHref(child.slug)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 type-body text-foreground hover:bg-accent/40"
          title={child.label}
        >
          <span className="min-w-0 flex-1 truncate">{child.label}</span>
          <span className="shrink-0 type-secondary tabular-nums text-muted-foreground">
            {plural(child.count, "job")}
          </span>
        </Link>
      </div>
      {open ? (
        <ul>
          {child.children.map((grand) => (
            <ChildRow key={grand.slug} child={grand} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function DomainSection({
  domain,
  items,
  focused,
}: {
  domain: DirectoryDomain;
  items: { feature: DirectoryFeature; reason: MatchReason }[];
  focused: boolean;
}) {
  if (items.length === 0) return null;
  const id = `intelligence-domain-${domain.domain}`;
  const jobs = items.reduce((sum, item) => sum + item.feature.jobs.length, 0);
  return (
    <section
      className="mt-6 scroll-mt-20 first:mt-0"
      aria-labelledby={`${id}-title`}
      id={id}
    >
      <h2
        id={`${id}-title`}
        className={cn(
          "mb-2 flex items-baseline gap-2 type-title text-foreground",
          focused && "text-primary",
        )}
      >
        <span>{domain.label}</span>
        <span className="type-secondary font-normal tabular-nums text-muted-foreground">
          {countsLabel(items.filter((item) => !item.feature.lane && item.feature.feature !== domain.domain).length, jobs)}
        </span>
      </h2>
      <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <FeatureCard
            key={item.feature.feature}
            feature={item.feature}
            reason={item.reason}
          />
        ))}
      </ul>
    </section>
  );
}

export function IntelligenceIndex({
  focusDomain = null,
}: { focusDomain?: string | null } = {}) {
  const { domains, error } = useIntelligenceDirectory();
  const [query, setQuery] = useIntelligenceQuery();
  const isAdmin = useAppSelector(selectIsAdmin);

  const directory = domains
    ? domains.flatMap((domain) => domain.features)
    : null;
  const searching = query.trim().length > 0;

  const sections = (domains ?? []).map((domain) => {
    const items: { feature: DirectoryFeature; reason: MatchReason }[] = [];
    for (const feature of domain.features) {
      if (feature.fixture && !isAdmin) continue;
      const reason = matchFeature(feature, query, domain.label);
      if (reason) items.push({ feature, reason });
    }
    // While searching, the strongest matches lead (the sort is stable, so the
    // registry's own order holds inside each strength).
    if (searching)
      items.sort((a, b) => matchStrength(b.reason) - matchStrength(a.reason));
    return { domain, items };
  });
  const matchedCount = sections.reduce(
    (sum, section) => sum + section.items.length,
    0,
  );
  const visible = (directory ?? []).filter((row) => !row.fixture);
  const totalJobs = visible.reduce((sum, row) => sum + row.jobs.length, 0);
  const featureCount = visible.filter((row) => !row.lane && row.feature !== row.domain).length;
  const domainCount = new Set(visible.map((row) => row.domain).filter(Boolean))
    .size;

  // An old page id lands here with `?domain=` — bring that Domain into view once.
  const scrolled = useRef(false);
  useEffect(() => {
    if (!focusDomain || !domains || scrolled.current) return;
    scrolled.current = true;
    document
      .getElementById(`intelligence-domain-${focusDomain}`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focusDomain, domains]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
      <IntelligenceSearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search domains, features, jobs, screens, agents, workflows"
        summary={directory && !error
          ? searching
            ? `${matchedCount} match`
            : `${plural(domainCount, "domain")}, ${plural(featureCount, "feature")}, ${plural(totalJobs, "job")}`
          : null}
        className="-mx-4 px-4 sm:-mx-6 sm:px-6"
      />
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 type-body text-destructive-ink">
          The features could not be read: {error}
          <ErrorAlchemyMenu error={error} />
        </div>
      ) : directory === null ? (
        <div className="flex min-h-[30dvh] items-center justify-center">
          <Loader2
            className="h-6 w-6 animate-spin text-muted-foreground"
            aria-label="Loading features"
          />
        </div>
      ) : matchedCount === 0 ? (
        <div className="flex min-h-[20dvh] flex-col items-center justify-center gap-2 text-center">
          <p className="text-[13.5px] text-muted-foreground">
            Nothing matches &ldquo;{query.trim()}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-[13px] font-medium text-primary hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        sections.map((section) => (
          <DomainSection
            key={section.domain.domain}
            domain={section.domain}
            items={section.items}
            focused={!searching && section.domain.domain === focusDomain}
          />
        ))
      )}
    </div>
  );
}
