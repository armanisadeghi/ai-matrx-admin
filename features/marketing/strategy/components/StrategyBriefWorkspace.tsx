"use client";

import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
/**
 * features/marketing/strategy/components/StrategyBriefWorkspace.tsx
 *
 * ONE workspace, two scopes: the BRAND strategy (business facts, service lines
 * with footprints) and the SITE brief (what this website is for, reading the
 * brand facts). Same component, split by `scope` — never a fork.
 *
 * What it answers, always, on every visit: does a brief exist; what state is
 * it in (waiting for you / confirmed / accepted by lapse / none); what it was
 * built from; what the AI was unsure about; and the ONE action that moves it
 * forward. Regenerating never touches a page or a plan — it supersedes the
 * previous version and carries your corrections forward, and the button says
 * so before it spends anything.
 */
import { useState } from "react";
import Link from "next/link";
import {
  Check,
  CircleDashed,
  ExternalLink,
  History,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PropertyRow } from "@ai-matrx/design-system/controls";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";
import { DurableRunFailure } from "@/lib/durable-run/DurableRunFailure";
import {
  LoadingSurface,
  QueryError,
  SectionCard,
  formatDate,
} from "@/features/marketing/components/shared/MarketingUi";
import { useBrandSites } from "@/features/marketing/data/hooks";
import { marketingSeg } from "@/features/marketing/lib/keys";
import {
  brandKindCopy,
  type BrandKind,
} from "@/features/marketing/lib/brand-kind";
import { marketingRoutes } from "@/features/marketing/lib/routes";

import type { StrategyBrief, StrategyScope } from "../data";
import {
  useGenerateStrategy,
  useStrategyBrief,
  useStrategyHistory,
  useStrategyRuling,
} from "../hooks";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { BrandStrategySurface, StrategyCorrectionsInput } from "./BrandStrategySurface";

const SCOPE_NOUN: Record<StrategyScope, string> = {
  brand: "brand strategy",
  site: "site brief",
};

/** Facts the agent establishes, in the order a person reads them. */
const FACT_ROWS: Record<
  StrategyScope,
  Array<{ key: string; label: string }>
> = {
  brand: [
    { key: "what_they_do", label: "What they do" },
    { key: "primary_location", label: "Where they are" },
    { key: "customer_description", label: "Who they serve" },
  ],
  site: [
    { key: "site_purpose", label: "What this site is for" },
    { key: "audience_slice", label: "Who this site is for" },
    { key: "what_it_must_win", label: "What it must win" },
    { key: "service_lines_served", label: "Service lines this site carries" },
    { key: "shape_notes", label: "Its shape" },
  ],
};

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(", ");
  if (typeof value === "number") return String(value);
  return "";
}

/** Footprint enum tokens, in the reader's words — never a raw `location_set`. */
const FOOTPRINT_LABEL: Record<string, string> = {
  national: "national",
  regional: "regional",
  local: "local",
  radius: "service radius",
  location_set: "specific locations",
  global: "global",
  online: "online only",
};
function footprintLabel(token: string): string {
  return FOOTPRINT_LABEL[token] ?? (humanizeIdentifier(token) || token);
}

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(asText).filter(Boolean) : [];
}

/** "Built from a crawl of 983 pages and 28 days of Search Console" — from provenance, never inferred. */
function builtFrom(
  scope: StrategyScope,
  inputs: Record<string, unknown>,
): string[] {
  const parts: string[] = [];
  const crawl = inputs.crawl as Record<string, unknown> | undefined;
  if (crawl && typeof crawl.pages === "number") {
    parts.push(`a crawl of ${crawl.pages.toLocaleString()} pages`);
  }
  const gsc = inputs.gsc as Record<string, unknown> | null | undefined;
  if (gsc && typeof gsc === "object") {
    parts.push(
      typeof gsc.window === "string"
        ? `Search Console (${gsc.window})`
        : "Search Console",
    );
  } else if (gsc === null && scope === "site") {
    parts.push("no Search Console data (the site has none connected)");
  }
  if (inputs.research_document_id) parts.push("the research report");
  if (typeof inputs.plan_nodes === "number" && inputs.plan_nodes > 0) {
    parts.push(`the content plan (${inputs.plan_nodes} planned pages)`);
  }
  if (inputs.brand_strategy_id) parts.push("the brand strategy");
  if (Array.isArray(inputs.sites)) {
    parts.push(
      `${inputs.sites.length} website${inputs.sites.length === 1 ? "" : "s"}`,
    );
  }
  return parts;
}

/**
 * Where the brief stands, as a short value plus a one-sentence tooltip. The
 * long "what this means" wording lives in the tooltip, never on the card.
 */
function statusRow(brief: StrategyBrief): { value: string; help?: string } {
  switch (brief.status) {
    case "confirmed":
      return {
        value: `Confirmed ${formatDate(brief.reviewedAt)}`,
        help: "You confirmed this version; every agent works from it.",
      };
    case "auto_accepted":
      return {
        value: `Accepted by lapse ${formatDate(brief.autoAcceptAt)}`,
        help: "Nobody reviewed it within 24 hours, so it stands as written until you correct and confirm it.",
      };
    case "awaiting_review":
      return {
        value: `Waiting for you · takes effect ${formatDate(brief.autoAcceptAt)}`,
        help: "Agents proceed without it until you confirm; on that date it takes effect as written.",
      };
    default:
      return { value: "Draft" };
  }
}

export function StrategyBriefWorkspace({
  scope,
  id,
  brandId,
  brandSeg,
  organizationId,
  brandKind,
}: {
  /** The owning brand's kind: a person brand's strategy is not a "brand strategy". */
  brandKind?: BrandKind;
  scope: StrategyScope;
  /** brand id for brand scope, site id for site scope. */
  id: string;
  brandId: string;
  brandSeg: string;
  organizationId: string;
}) {
  const brief = useStrategyBrief(scope, id, organizationId);
  const history = useStrategyHistory(
    scope,
    id,
    organizationId,
    Boolean(brief.data),
  );
  const ruling = useStrategyRuling(scope, id, organizationId);
  const generate = useGenerateStrategy(scope, id, organizationId);
  // The site brief READS the brand strategy — say what it read.
  const brandStrategy = useStrategyBrief(
    "brand",
    scope === "site" ? brandId : null,
    organizationId,
  );
  // Cheap and cached; rendered only in brand scope.
  const sites = useBrandSites(brandId);

  const [guidance, setGuidance] = useState<string | null>(null);
  const current = brief.data ?? null;
  const guidanceValue = guidance ?? current?.guidance ?? "";
  const noun =
    scope === "brand"
      ? brandKindCopy(brandKind).strategy.noun
      : SCOPE_NOUN[scope];
  const brandStrategyHref = `${marketingRoutes.brandIdentity(brandSeg)}/strategy`;

  async function runGenerate() {
    const ok = await confirm({
      title: current ? `Rewrite the ${noun}?` : `Write the ${noun}?`,
      description: current
        ? "Writes a new version from everything we now know; this one stays in history and your corrections carry over. No page or plan changes."
        : "Reads the website, Search Console, research and the plan to write a first draft. No page or plan changes.",
      confirmLabel: current ? "Write a new version" : "Write it",
    });
    if (!ok) return;
    await generate.launch({});
  }

  if (brief.isLoading) return <LoadingSurface label={`Loading the ${noun}…`} />;
  if (brief.error) {
    return (
      <QueryError error={brief.error} onRetry={() => void brief.refetch()} />
    );
  }

  const nounTitle = noun.charAt(0).toUpperCase() + noun.slice(1);
  const brandStrategyNoun = brandKindCopy(brandKind).strategy.noun;
  const sources = current ? builtFrom(scope, current.inputs) : [];
  const status = current ? statusRow(current) : null;
  const openQuestions = current ? asList(current.facts.open_questions) : [];
  const factsFound = current
    ? FACT_ROWS[scope].filter((row) => asText(current.facts[row.key])).length
    : 0;
  const factsTotal = FACT_ROWS[scope].length;
  const goTo = (anchor: string) =>
    document
      .getElementById(anchor)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  // Short states only — what is done, what is not, and the one door to change it.
  const states: Array<{
    key: string;
    label: string;
    value: string;
    done: boolean;
    action: string;
    anchor: string;
  }> = current
    ? [
        {
          key: "facts",
          label: "Facts",
          value: `${factsFound} of ${factsTotal} found`,
          done: factsFound === factsTotal,
          action: "Review",
          anchor: "strategy-facts",
        },
        {
          key: "lines",
          label: "Service lines",
          value: current.serviceLines.length
            ? String(current.serviceLines.length)
            : "None yet",
          done: current.serviceLines.length > 0,
          action: "Review",
          anchor: "strategy-lines",
        },
        {
          key: "questions",
          label: "AI is unsure about",
          value: openQuestions.length
            ? String(openQuestions.length)
            : "Nothing",
          done: openQuestions.length === 0,
          action: "Answer",
          anchor: "strategy-corrections",
        },
        {
          key: "corrections",
          label: "Your corrections",
          value: current.guidance.trim() ? "Added" : "None yet",
          done: Boolean(current.guidance.trim()),
          action: current.guidance.trim() ? "Edit" : "Add",
          anchor: "strategy-corrections",
        },
      ]
    : [];

  // The room's own surface values (brand scope), read at trigger time.
  const getOwnSurfaceValues = () =>
    current
      ? {
          strategy_brief_markdown: current.briefMarkdown,
          strategy_facts: Object.fromEntries(
            FACT_ROWS[scope].map((row) => [row.key, asText(current.facts[row.key])]),
          ),
          strategy_service_lines: current.serviceLines.map((line) => ({
            name: line.name,
            customer_segment: line.customerSegment,
            footprint: line.footprint,
            footprint_detail: line.footprintDetail,
            why: line.why,
          })),
          strategy_open_questions: openQuestions,
          strategy_guidance: current.guidance,
          strategy_guidance_draft: guidanceValue,
          strategy_status: current.status,
          strategy_version_no: current.versionNo,
          strategy_confidence: {
            score: current.agentConfidence,
            reason: current.confidenceReason,
          },
          strategy_built_from: sources,
          ...(history.data
            ? {
                strategy_history: history.data.map((version) => ({
                  version_no: version.versionNo,
                  generated_at: version.generatedAt,
                  reviewed_at: version.reviewedAt,
                  confidence: version.agentConfidence,
                  guidance: version.guidance,
                  brief_markdown: version.briefMarkdown,
                })),
              }
            : {}),
        }
      : {};

  const body = (
    <div className="mx-auto w-full max-w-6xl space-y-3 px-3 py-3 sm:px-4">
      <h1 className="sr-only">{nounTitle}</h1>
      {/* Lead with the substance: who they are, then the strategy itself. */}
      <header className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {nounTitle}
          </h2>
          {generate.running ? (
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {generate.stage ?? "Working…"}
            </span>
          ) : (
            <Button
              variant={current ? "outline" : "primary"}
              onClick={() => void runGenerate()}
            >
              {current ? (
                <RefreshCw className="size-3.5" aria-hidden />
              ) : (
                <AGENT_ICON className="size-3.5" aria-hidden />
              )}
              {current ? "Write a new version" : `Write the ${noun}`}
            </Button>
          )}
        </div>
        {states.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {states.map((state) => (
              <li key={state.key} className="min-w-0">
                <button
                  type="button"
                  onClick={() => goTo(state.anchor)}
                  className="flex h-full w-full min-w-0 flex-col items-start gap-1 rounded-xl border border-border bg-card/80 p-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {state.label}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    {state.done ? (
                      <Check
                        className="size-3.5 shrink-0 text-primary"
                        aria-hidden
                      />
                    ) : (
                      <CircleDashed
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                    <span className="truncate">{state.value}</span>
                  </span>
                  <span className="text-xs text-primary">{state.action}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <DurableRunFailure
        error={generate.error}
        retry={generate.retry}
        running={generate.running}
      />

      {current ? (
        <>
          <SectionCard title="The brief">
            <div className="p-3">
              <MarkdownRenderer content={current.briefMarkdown} fontSize={14} />
            </div>
          </SectionCard>

          <div id="strategy-facts" className="scroll-mt-16">
            <SectionCard
              title="Facts the AI established"
              about="What the AI concluded about the business. Anything wrong goes in Your corrections and outranks these."
            >
              <div className="space-y-3 p-3">
                {factsFound === 0 ? (
                  <p className="type-secondary text-muted-foreground">
                    Asked after this version — write a new version
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  {FACT_ROWS[scope].map((row) => {
                    const value = asText(current.facts[row.key]);
                    return (
                      <PropertyRow
                        key={row.key}
                        label={row.label}
                        value={value || undefined}
                        missing={value ? undefined : "Not established"}
                      />
                    );
                  })}
                </div>
                {openQuestions.length > 0 ? (
                  <PropertyRow label="What the AI was unsure about">
                    <ul className="list-disc space-y-0.5 pl-5">
                      {openQuestions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </PropertyRow>
                ) : null}
              </div>
            </SectionCard>
          </div>

          {scope === "brand" || current.serviceLines.length > 0 ? (
            <div id="strategy-lines" className="scroll-mt-16">
              <SectionCard
                title={
                  scope === "brand"
                    ? "Service lines and where each competes"
                    : "Service lines this site carries"
                }
                about="Each line of business, the customers it is for and how far it reaches: national, regional, a service radius or specific locations."
              >
                {current.serviceLines.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    None established yet
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {current.serviceLines.map((line) => (
                      <li key={line.name} className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {line.name}
                          </span>
                          <Badge variant="outline">
                            {footprintLabel(line.footprint)}
                          </Badge>
                          {line.customerSegment ? (
                            <span className="text-xs text-muted-foreground">
                              for {line.customerSegment}
                            </span>
                          ) : null}
                        </div>
                        {line.footprintDetail || line.why ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {[line.footprintDetail, line.why]
                              .filter(Boolean)
                              .join(" — ")}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          ) : null}

          <div id="strategy-corrections" className="scroll-mt-16">
            <SectionCard
              title="Your corrections"
              about={`Say it the way you would say it out loud: "it's more like a 30-mile radius", "we stopped doing residential last year". This outranks everything the AI inferred and carries into every later version. Confirming with no corrections means "this is right".`}
            >
              <div className="space-y-2 p-3">
                <StrategyCorrectionsInput
                  value={guidanceValue}
                  onChange={setGuidance}
                  placeholder="What the AI got wrong, or could not have known"
                />
                <div className="flex items-center gap-2">
                  <Button
                    icon={
                      ruling.isPending ? (
                        <Loader2 className="animate-spin" aria-hidden />
                      ) : (
                        <Check aria-hidden />
                      )
                    }
                    variant="primary"
                    disabled={ruling.isPending}
                    onClick={() => ruling.mutate({ guidance: guidanceValue })}
                  >
                    {current.status === "confirmed"
                      ? "Save corrections"
                      : "Confirm this brief"}
                  </Button>
                </div>
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {scope === "brand" && (sites.data?.length ?? 0) > 0 ? (
        <SectionCard
          title="Each website's own brief"
          about="Every website of this brand has its own brief that reads this strategy and narrows it to what that one site must win."
        >
          <ul className="divide-y divide-border">
            {(sites.data ?? []).map((site) => (
              <li
                key={site.id}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm text-foreground">
                  {site.domain ?? site.name}
                </span>
                <Button asChild variant="quiet">
                  <Link
                    href={marketingRoutes.brandContentPlanSite(
                      brandSeg,
                      marketingSeg(site),
                      "brief",
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Site brief
                    <ExternalLink className="size-3" aria-hidden />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {current ? (
        <SectionCard
          title="About this version"
          headerExtra={
            <>
              <Badge variant="secondary">v{current.versionNo}</Badge>
              {current.agentConfidence != null ? (
                <Badge variant="outline" title={current.confidenceReason}>
                  AI confidence {current.agentConfidence}/5
                </Badge>
              ) : null}
            </>
          }
        >
          <div className="space-y-3 p-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <PropertyRow
                label="Status"
                value={status?.value}
                help={status?.help}
              />
              <PropertyRow
                label="Built"
                value={formatDate(current.generatedAt)}
              />
              <PropertyRow
                label="Built from"
                value={sources.length > 0 ? sources.join(", ") : undefined}
                missing="Not recorded"
              />
              {scope === "site" ? (
                <PropertyRow
                  label={`Reads the ${brandStrategyNoun}`}
                  value={
                    brandStrategy.data
                      ? brandStrategy.data.status === "confirmed"
                        ? "Confirmed"
                        : brandStrategy.data.status === "auto_accepted"
                          ? "Accepted by lapse"
                          : "Not yet reviewed"
                      : undefined
                  }
                  missing={brandStrategy.data ? undefined : "None yet"}
                  help={
                    brandStrategy.data
                      ? undefined
                      : `Without it the site brief infers the business facts itself; write the ${brandStrategyNoun} first.`
                  }
                  meta={
                    <Button asChild variant="quiet">
                      <Link
                        href={brandStrategyHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open
                        <ExternalLink className="size-3" aria-hidden />
                      </Link>
                    </Button>
                  }
                />
              ) : null}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {(history.data?.length ?? 0) > 0 ? (
        <SectionCard title="Earlier versions" collapsible defaultOpen={false}>
          <ul className="divide-y divide-border">
            {(history.data ?? []).map((version) => (
              <li key={version.id} className="px-3 py-2">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-xs">
                    <History
                      className="size-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="font-medium text-foreground">
                      v{version.versionNo}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDate(version.generatedAt)}
                    </span>
                    {version.agentConfidence != null ? (
                      <Badge variant="outline">
                        confidence {version.agentConfidence}/5
                      </Badge>
                    ) : null}
                    {version.reviewedAt ? (
                      <span className="text-muted-foreground">
                        confirmed {formatDate(version.reviewedAt)}
                      </span>
                    ) : null}
                  </summary>
                  <div className="mt-2 space-y-3 rounded-md border border-border p-3">
                    <MarkdownRenderer
                      content={version.briefMarkdown}
                      fontSize={13}
                    />
                    {version.guidance ? (
                      <PropertyRow
                        label="Your words at the time"
                        value={version.guidance}
                      />
                    ) : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </div>
  );

  return scope === "brand" ? (
    <BrandStrategySurface
      getOwn={getOwnSurfaceValues}
      onGuidanceDraft={current ? setGuidance : null}
    >
      {body}
    </BrandStrategySurface>
  ) : (
    body
  );
}
