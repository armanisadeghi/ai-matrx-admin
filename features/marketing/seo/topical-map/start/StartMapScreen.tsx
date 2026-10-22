"use client";

/**
 * START A MAP — the six-source tile screen (PLAN §6 E; champion: our podcast
 * studio's generator form + Notion's AI bar).
 *
 * One chosen tile, its own control, an emphasis box, then ONE launch through
 * `useAuthorTopicalMap` — a durable SEO command that floats in `LiveRunWindow`
 * (THE FLOATING LAW), survives a reload (`restoring`/rejoin) and reports the
 * server's own stage sentences. The result renders through `StartMapResult`.
 *
 * What rides where (THE USER-INPUT LAW): the emphasis box is the only thing
 * the person TYPES about the map, and the wire carries it as `emphasis`, which
 * the server hands to the mandate as `user_input`. Everything else is a named
 * field of `AuthorMapRequest`.
 *
 * Change mode comes from the `map_agent_change_mode` knob. `ask` is a SCREEN
 * mode (`map-author.ts`): the person is asked here, before the paid call, and
 * the body sends the answer — never `ask` itself. `apply`/`propose` are shown
 * as what the run will do; every launch states its consequence and its cost
 * first (destructive-and-expensive-actions law), so the dialog is not
 * optional in any mode.
 *
 * Adding ONE section to an existing map (`mapId` + `sectionParentSlug`) and
 * "Extend from the site" (R14 — `data` source, `propose` mode, on the existing
 * map) reuse this screen through `ExtendFromSiteDialog`.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Square } from "lucide-react";

import { ProTextarea } from "@/components/official/ProTextarea";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@ai-matrx/design-system/controls";
import { ResearchTopicSelect } from "@/features/marketing/content-plan/components/ResearchTopicSelect";
import { useBrandSites } from "@/features/marketing/data/hooks";
import { SourceInput } from "@/features/resource-manager/source-input/components/SourceInput";
import { useSourceSet } from "@/features/resource-manager/source-input/useSourceSet";
import { useResolvedSourceText } from "@/features/resource-manager/source-input/useResolvedSourceText";
import { ALL_SOURCE_KIND_IDS, type SourceInputKindId } from "@/features/resource-manager/source-input/sourceKinds";
import { extractErrorMessage } from "@/utils/errors";
import { cn } from "@/lib/utils";

import { useMapTopicRows } from "../hooks";
import { useTopicalMapKnobs, type MapAgentChangeMode } from "../knobs";
import type { MapAuthorChangeMode, MapAuthorSourceKind } from "../map-author";
import { useAuthorTopicalMap } from "../useAuthorTopicalMap";
import { TopicalMapFailed } from "../components/TopicalMapStates";
import { START_MAP_SOURCES, startMapSource } from "./startMapSources";
import { StartMapResult } from "./StartMapResult";
import { ErrorNotice } from "@ai-matrx/design-system";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { linkTopicToBrand } from "@/features/research/service";

const EVERY_SITE = "__every_site__";
const DOCUMENT_SOURCES_SURFACE = "topical-map:documents";
const WEB_SOURCES_SURFACE = "topical-map:web-page";
/** Documents: every way in but a bare topic (the description tile is its own tile). */
const DOCUMENT_KINDS: readonly SourceInputKindId[] = ALL_SOURCE_KIND_IDS.filter((k) => k !== "topic");
/** A web page: the one door. */
const WEB_KINDS: readonly SourceInputKindId[] = ["web"];
const MAP_SOURCE_DELIVERIES = ["direct"] as const;
const ROOT = "__root__";

export interface StartMapScreenProps {
  brand: { id: string; name: string; organizationId: string };
  /** Preselect a tile (deep links: `?start=<kind>`). */
  initialSourceKind?: MapAuthorSourceKind | null;
  /** `existing_research` deep link (`?research=<rs_topic id>`). */
  initialResearchTopicId?: string | null;
  /** `data` narrowed to one site (`?site=`). */
  initialSiteId?: string | null;
  /** Omitted: the server creates a draft map for this brand first. */
  mapId?: string | null;
  mapName?: string | null;
  /** Add ONE section under this topic instead of starting the map. */
  sectionParentSlug?: string | null;
  /** Force the mode (R14's extender sends `propose`); otherwise the knob decides. */
  forcedChangeMode?: MapAuthorChangeMode | null;
  /** Lock the tile (the extender is always `data`). */
  lockSourceKind?: boolean;
  className?: string;
}

export function StartMapScreen({
  brand,
  initialSourceKind = null,
  initialResearchTopicId = null,
  initialSiteId = null,
  mapId = null,
  mapName = null,
  sectionParentSlug = null,
  forcedChangeMode = null,
  lockSourceKind = false,
  className,
}: StartMapScreenProps) {
  const [sourceKind, setSourceKind] = useState<MapAuthorSourceKind>(
    initialSourceKind ?? (initialResearchTopicId ? "existing_research" : "data"),
  );
  const tile = startMapSource(sourceKind);

  // Every source's own value lives in its own state; `authorTopicalMapBody`
  // sends only the chosen tile's field, so a value left in a tile the person
  // switched away from can never ride along.
  const [siteId, setSiteId] = useState<string | null>(initialSiteId);
  const [prompt, setPrompt] = useState("");
  const [researchTopicId, setResearchTopicId] = useState<string | null>(initialResearchTopicId);
  const [emphasis, setEmphasis] = useState("");
  const [newMapName, setNewMapName] = useState("");
  const [parentSlug, setParentSlug] = useState<string | null>(sectionParentSlug);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [askedMode, setAskedMode] = useState<"propose" | "apply" | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const knobs = useTopicalMapKnobs();
  const sites = useBrandSites(brand.id);
  // Section parents are only meaningful on an existing map.
  const topicRows = useMapTopicRows(mapId ?? "", Boolean(mapId));
  // The two text tiles read their Sources on the SERVER through the one Source
  // input; the box under it is the server's text for the person to correct.
  const documentSources = useSourceSet(DOCUMENT_SOURCES_SURFACE);
  const documentPreview = useResolvedSourceText(documentSources, { enabled: sourceKind === "documents" });
  const webSources = useSourceSet(WEB_SOURCES_SURFACE);
  const webPreview = useResolvedSourceText(webSources, { enabled: sourceKind === "web_search" });
  const documentText = documentPreview.text;
  const webText = webPreview.text;
  const webUrl =
    (() => {
      const page = webSources.sources.find((c) => c.status === "ready")?.draft;
      return (page?.origin ?? page?.label ?? "").trim();
    })();

  const run = useAuthorTopicalMap({
    brandId: brand.id,
    organizationId: brand.organizationId,
  });

  // A deep link that lands after mount (the home switches kinds in place).
  useEffect(() => {
    if (initialSourceKind) setSourceKind(initialSourceKind);
  }, [initialSourceKind]);
  useEffect(() => {
    if (initialResearchTopicId) {
      setResearchTopicId(initialResearchTopicId);
      setSourceKind("existing_research");
    }
  }, [initialResearchTopicId]);

  const knobMode: MapAgentChangeMode | null = knobs.knobs?.map_agent_change_mode ?? null;
  const effectiveMode: MapAuthorChangeMode | "ask" | null = forcedChangeMode ?? knobMode;

  const busy =
    run.running ||
    run.restoring ||
    (sourceKind === "documents" && documentPreview.loading) ||
    (sourceKind === "web_search" && webPreview.loading);

  const readiness = (): string | null => {
    switch (sourceKind) {
      case "prompt":
        return prompt.trim() ? null : "Describe the business before building the map.";
      case "documents":
        return documentText.trim() ? null : "Add a document first.";
      case "web_search":
        return webText.trim() ? null : "Add a web page first, then edit the text.";
      case "existing_research":
        return researchTopicId ? null : "Pick the finished research topic.";
      default:
        return null;
    }
  };
  const notReady = readiness();

  const launch = async (mode: MapAuthorChangeMode | null) => {
    setLocalError(null);
    try {
      // Research turned into this brand's map is research FOR this brand:
      // the research_topic → web_brand edge (idempotent) is written first, so
      // the brand's Relationships tab and Media → Research filter see it.
      if (sourceKind === "existing_research" && researchTopicId) {
        await linkTopicToBrand(researchTopicId, brand.id, brand.organizationId);
      }
      run.reset();
      await run.author({
        sourceKind,
        mapId: mapId ?? undefined,
        mapName: mapId ? undefined : newMapName.trim() || undefined,
        sectionParentSlug: parentSlug ?? undefined,
        emphasis: emphasis || undefined,
        changeMode: mode ?? undefined,
        siteId: sourceKind === "data" ? siteId ?? undefined : undefined,
        prompt: sourceKind === "prompt" ? prompt : undefined,
        documentText: sourceKind === "documents" ? documentText : undefined,
        webSearchText: sourceKind === "web_search" ? webText : undefined,
        webSearchQuery: sourceKind === "web_search" ? webUrl.trim() || undefined : undefined,
        researchTopicId: sourceKind === "existing_research" ? researchTopicId : undefined,
      });
    } catch (error) {
      // `authorTopicalMapBody` refuses locally what the server would refuse —
      // shown here, before any paid call.
      setLocalError(extractErrorMessage(error));
    }
  };

  const onConfirm = () => {
    const mode: MapAuthorChangeMode | null =
      effectiveMode === "ask" ? askedMode : effectiveMode === null ? null : effectiveMode;
    if (effectiveMode === "ask" && !mode) return;
    setConfirmOpen(false);
    void launch(mode);
  };

  const target = mapId
    ? parentSlug
      ? `one new section under "${parentSlug}" in ${mapName ?? "this map"}`
      : `${mapName ?? "this map"}`
    : newMapName.trim()
      ? `a new map "${newMapName.trim()}" for ${brand.name}`
      : `a new draft map for ${brand.name}`;

  const consequence = (mode: MapAuthorChangeMode | null): string => {
    const cost =
      "This is minutes of paid agent work (cost unmeasured on this build). The run keeps going if you close this page and rejoins here.";
    if (sourceKind === "new_research") {
      return `Commissions a company topic-tree research run for ${brand.name}. No map is written on this call; you build it from the finished research afterwards. ${cost}`;
    }
    if (mode === "apply") {
      return `Writes the proposed topics into ${target} as ACTIVE — live for every site using the map, immediately. Existing topics with the same slug are updated in place. ${cost}`;
    }
    if (mode === "propose") {
      return `Writes the proposed topics into ${target} as PROPOSALS you review one by one; nothing goes live until accepted. ${cost}`;
    }
    return `Writes the proposed topics into ${target}; whether they land active or as proposals is decided by this organization's change-mode setting. ${cost}`;
  };

  return (
    <div className={cn("grid gap-4", className)}>
      {/* The tiles */}
      <div
        role="radiogroup"
        aria-label="Where the map starts from"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {START_MAP_SOURCES.map((option) => {
          const Icon = option.icon;
          const active = option.kind === sourceKind;
          const locked = lockSourceKind && !active;
          return (
            <button
              key={option.kind}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={locked || busy}
              onClick={() => setSourceKind(option.kind)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                (locked || busy) && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {option.label}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{option.helper}</span>
            </button>
          );
        })}
      </div>

      {/* The chosen tile's control */}
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4">
        {tile.control === "site" ? (
          <div className="grid gap-1.5">
            <Label htmlFor="start-map-site">Site to read</Label>
            {sites.isError ? (
              <ErrorNotice size="inline" className="text-xs" message={extractErrorMessage(sites.error)} />
            ) : (
              <Select
                value={siteId ?? EVERY_SITE}
                onValueChange={(v) => setSiteId(v === EVERY_SITE ? null : v)}
                disabled={busy}
              >
                <SelectTrigger id="start-map-site" className="w-full sm:w-80">
                  <SelectValue placeholder="Every site of this brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EVERY_SITE}>Every site of this brand</SelectItem>
                  {(sites.data ?? []).map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name ?? site.domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              {sites.isPending
                ? "Loading this brand's sites…"
                : sites.isError
                  ? null
                  : (sites.data?.length ?? 0) === 0
                    ? "This brand has no site yet; the author reads the brand profile, business facts and locations alone."
                    : "The author reads the brand profile plus the chosen site's crawl, keywords and content plan."}
            </p>
          </div>
        ) : null}

        {tile.control === "text" ? (
          <div className="grid gap-1.5">
            <Label htmlFor="start-map-prompt">The business, in your words</Label>
            <ProTextarea
              id="start-map-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={tile.placeholder}
              rows={6}
              disabled={busy}
              className="text-base"
            />
          </div>
        ) : null}

        {tile.control === "resolve" && sourceKind === "documents" ? (
          <SourceTextPanel
            surfaceKey={DOCUMENT_SOURCES_SURFACE}
            kinds={DOCUMENT_KINDS}
            title="Documents"
            preview={documentPreview}
            label="Text the author reads"
            placeholder={tile.placeholder}
            disabled={busy}
          />
        ) : null}

        {tile.control === "resolve" && sourceKind === "web_search" ? (
          <SourceTextPanel
            surfaceKey={WEB_SOURCES_SURFACE}
            kinds={WEB_KINDS}
            title="Web page"
            preview={webPreview}
            label="Cleaned page text"
            placeholder={tile.placeholder}
            disabled={busy}
          />
        ) : null}

        {tile.control === "research" ? (
          <div className="grid gap-1.5">
            <Label>Finished research</Label>
            <ResearchTopicSelect
              value={researchTopicId}
              onChange={setResearchTopicId}
              organizationId={brand.organizationId}
              brandId={brand.id}
              triggerClassName="h-9 w-full sm:w-80 text-sm"
            />
          </div>
        ) : null}

        {tile.control === "none" ? (
          <p className="text-sm text-muted-foreground">{tile.helper}</p>
        ) : null}

        {/* Where it lands */}
        {mapId ? (
          <div className="grid gap-1.5">
            <Label htmlFor="start-map-parent">Add under</Label>
            {topicRows.isError ? (
              <TopicalMapFailed what="this map's topics" error={topicRows.error} />
            ) : (
              <Select
                value={parentSlug ?? ROOT}
                onValueChange={(v) => setParentSlug(v === ROOT ? null : v)}
                disabled={busy || topicRows.isPending}
              >
                <SelectTrigger id="start-map-parent" className="w-full sm:w-80">
                  <SelectValue placeholder="The whole map" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROOT}>The whole map</SelectItem>
                  {(topicRows.data ?? [])
                    .filter((t) => t.status === "active")
                    .map((t) => (
                      <SelectItem key={t.id} value={t.slug}>
                        {t.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              Choosing a topic adds ONE new section beneath it and leaves the rest of the map
              alone.
            </p>
          </div>
        ) : sourceKind !== "new_research" ? (
          <div className="grid gap-1.5">
            <Label htmlFor="start-map-name">Map name (optional)</Label>
            <Input
              id="start-map-name"
              value={newMapName}
              onChange={(e) => setNewMapName(e.target.value)}
              placeholder={`${brand.name} topical map`}
              disabled={busy}
              className="w-full sm:w-80"
            />
          </div>
        ) : null}

        {/* Emphasis — the only thing typed ABOUT the map; rides `user_input`. */}
        <div className="grid gap-1.5">
          <Label htmlFor="start-map-emphasis">Emphasis (optional)</Label>
          <ProTextarea
            id="start-map-emphasis"
            value={emphasis}
            onChange={(e) => setEmphasis(e.target.value)}
            placeholder="e.g. Data security is a major focus. Do not split by city."
            rows={2}
            disabled={busy}
            className="text-base"
          />
        </div>

        {/* Mode + launch */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            {knobs.error ? (
              <span role="alert" className="text-destructive">
                Change mode could not be read: {extractErrorMessage(knobs.error)}
                <ErrorAlchemyMenu className="ml-auto" />
              </span>
            ) : effectiveMode === null ? (
              "Reading this organization's change-mode setting…"
            ) : effectiveMode === "ask" ? (
              "You will be asked whether topics land live or as proposals."
            ) : effectiveMode === "apply" ? (
              "Topics land ACTIVE (change mode: apply)."
            ) : (
              "Topics land as PROPOSALS you review (change mode: propose)."
            )}
          </p>
          <div className="flex items-center gap-2">
            {run.running && run.cancel ? (
              <Button
                icon={<Square aria-hidden />}
                type="button"
                variant="outline"
                onClick={() => void run.cancel?.()}
                disabled={run.cancelling}
              >
                Stop
              </Button>
            ) : null}
            <Button
              variant="primary"
              type="button"
              onClick={() => {
                setAskedMode(null);
                setConfirmOpen(true);
              }}
              disabled={busy || Boolean(notReady) || (effectiveMode === null && !knobs.error)}
              title={notReady ?? undefined}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <AGENT_ICON className="h-4 w-4" aria-hidden />
              )}
              {tile.launchLabel}
            </Button>
          </div>
        </div>
        {notReady && !busy ? (
          <p className="text-xs text-muted-foreground">{notReady}</p>
        ) : null}
      </div>

      {/* The run — the stream itself floats in LiveRunWindow; this is the ledger line. */}
      {run.restoring ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          A map run for {brand.name} is already in progress — rejoining it.
        </p>
      ) : null}
      {run.running ? (
        <div className="rounded-xl border border-border bg-card p-4" aria-live="polite">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {run.waitMessage ?? run.stage ?? "Working…"}
          </p>
          {run.memo?.source_kind ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Source: {startMapSource(run.memo.source_kind as MapAuthorSourceKind).label}
            </p>
          ) : null}
          {run.stages.length > 0 ? (
            <ol className="mt-2 grid gap-0.5 text-xs text-muted-foreground">
              {run.stages.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
      {run.status === "stopped" && run.stoppedMessage ? (
        <p className="rounded-xl border border-border bg-muted/30 p-3 text-sm">{run.stoppedMessage}</p>
      ) : null}
      {localError || run.error ? (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="flex items-center gap-2 font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            The map run did not start or stopped
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{localError ?? run.error}</p>
          {run.retry && !localError ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => void run.retry?.()}
            >
              Run it again exactly as sent
            </Button>
          ) : null}
          <ErrorAlchemyMenu className="ml-auto" />
        </div>
      ) : null}
      {run.result ? (
        <StartMapResult
          result={run.result}
          onBuildFromResearch={(id) => {
            setResearchTopicId(id);
            setSourceKind("existing_research");
            run.reset();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={sourceKind === "new_research" ? "Start the research?" : `Build ${mapId ? "into" : ""} ${target}?`}
        description={consequence(
          effectiveMode === "ask" ? askedMode : effectiveMode === null ? null : effectiveMode,
        )}
        content={
          effectiveMode === "ask" && sourceKind !== "new_research" ? (
            <RadioGroup
              value={askedMode ?? ""}
              onValueChange={(v) => setAskedMode(v === "apply" ? "apply" : "propose")}
              aria-label="How the topics land"
              className="grid gap-2"
            >
              <label className="flex items-start gap-2 text-sm">
                <RadioGroupItem value="propose" id="start-map-mode-propose" />
                <span>
                  <span className="font-medium">Propose</span> — write them as proposals; nothing
                  goes live until you accept it.
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <RadioGroupItem value="apply" id="start-map-mode-apply" />
                <span>
                  <span className="font-medium">Apply</span> — write them active, live for every
                  site using the map, immediately.
                </span>
              </label>
            </RadioGroup>
          ) : undefined
        }
        confirmLabel={tile.launchLabel}
        confirmDisabled={effectiveMode === "ask" && sourceKind !== "new_research" && !askedMode}
        variant={
          (effectiveMode === "ask" ? askedMode : effectiveMode) === "apply" ? "destructive" : "default"
        }
        onConfirm={onConfirm}
      />
    </div>
  );
}


/** The one Source input, and under it the server's text for the person to correct. */
function SourceTextPanel({
  surfaceKey,
  kinds,
  title,
  preview,
  label,
  placeholder,
  disabled,
}: {
  surfaceKey: string;
  kinds: readonly SourceInputKindId[];
  title: string;
  preview: ReturnType<typeof useResolvedSourceText>;
  label: string;
  placeholder?: string;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-3">
      <SourceInput
        surfaceKey={surfaceKey}
        title={title}
        purpose="your map"
        kinds={kinds}
        deliveries={MAP_SOURCE_DELIVERIES}
      />
      {preview.loading || preview.text || preview.error ? (
        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Label>{label}</Label>
            {preview.loading ? <span className="text-xs text-muted-foreground">Reading…</span> : null}
            {preview.truncated ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                Cut to its chosen size
              </span>
            ) : null}
          </div>
          {preview.error ? (
            <ErrorNotice size="inline" className="text-xs" message={preview.error} />
          ) : (
            <ProTextarea
              aria-label={label}
              value={preview.text}
              onChange={(e) => preview.setText(e.target.value)}
              placeholder={placeholder}
              rows={8}
              disabled={disabled}
              className="text-base"
            />
          )}
          {preview.droppedNotes.map((note) => (
            <p key={note} className="text-xs text-muted-foreground">
              {note}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
