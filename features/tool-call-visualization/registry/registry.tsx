"use client";

import React from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";

import type { ToolLifecycleEntry } from "@/features/agents/types/request.types";
import type { ToolEventPayload } from "@/types/python-generated/stream-events";

import type {
  ToolOverlayTabSpec,
  ToolRegistry,
  ToolRenderer,
  ToolRendererProps,
} from "../types";
import { GenericRenderer } from "./GenericRenderer";

import { BraveSearchInline } from "../renderers/brave-search";
import { NewsInline, NewsOverlay } from "../renderers/news-api";
import {
  SeoMetaTagsInline,
  SeoMetaTagsOverlay,
} from "../renderers/seo-meta-tags";
import { SeoMetaTitlesInline } from "../renderers/seo-meta-titles";
import { SeoMetaDescriptionsInline } from "../renderers/seo-meta-descriptions";
import {
  WebResearchInline,
  WebResearchOverlay,
} from "../renderers/web-research";
import {
  CoreWebSearchInline,
  CoreWebSearchOverlay,
} from "../renderers/core-web-search";
import {
  DeepResearchInline,
  deepResearchOverlayTabs,
} from "../renderers/deep-research";
import { UserListsInline, UserListsOverlay } from "../renderers/get-user-lists";
import BraveSearchDisplay from "@/features/workflows/results/registered-components/BraveSearchDisplay";

import {
  resultAsObject,
  resultAsString,
  getArg,
  collectMessages,
  filterStepEvents,
} from "../renderers/_shared";
import {
  DynamicInlineRenderer,
  DynamicOverlayRenderer,
} from "../dynamic/DynamicToolRenderer";
import { getCachedRenderer, isKnownNoDynamic } from "../dynamic/cache";

// ─────────────────────────────────────────────────────────────────────────────
// SEO header extras helpers
// ─────────────────────────────────────────────────────────────────────────────

function seoMetaTagsHeaderExtras(entry: ToolLifecycleEntry): React.ReactNode {
  const result = resultAsObject(entry);
  if (!result) return null;
  const batch = result.batch_analysis as
    | Array<{ overall_ok: boolean }>
    | undefined;
  if (!batch) return null;
  const total = (result.count as number | undefined) ?? batch.length;
  const passed = batch.filter((a) => a.overall_ok).length;
  const failed = total - passed;
  return (
    <div className="flex items-center gap-3 text-white/90 text-xs mt-1">
      <span className="flex items-center gap-1">
        <CheckCircle className="w-3.5 h-3.5" />
        {passed} Passed
      </span>
      {failed > 0 && (
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          {failed} Need Attention
        </span>
      )}
      <span className="ml-auto text-white/60">Total: {total}</span>
    </div>
  );
}

function seoTitlesHeaderExtras(entry: ToolLifecycleEntry): React.ReactNode {
  const result = resultAsObject(entry);
  if (!result) return null;
  const analysis = result.title_analysis as
    | Array<{ title_ok: boolean }>
    | undefined;
  if (!analysis) return null;
  const total = (result.count as number | undefined) ?? analysis.length;
  const passed = analysis.filter((a) => a.title_ok).length;
  const failed = total - passed;
  return (
    <div className="flex items-center gap-3 text-white/90 text-xs mt-1">
      <span className="flex items-center gap-1">
        <CheckCircle className="w-3.5 h-3.5" />
        {passed} Passed
      </span>
      {failed > 0 && (
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          {failed} Need Attention
        </span>
      )}
      <span className="ml-auto text-white/60">Total: {total}</span>
    </div>
  );
}

function seoDescriptionsHeaderExtras(
  entry: ToolLifecycleEntry,
): React.ReactNode {
  const result = resultAsObject(entry);
  if (!result) return null;
  const analysis = result.description_analysis as
    | Array<{ description_ok: boolean }>
    | undefined;
  if (!analysis) return null;
  const total = (result.count as number | undefined) ?? analysis.length;
  const passed = analysis.filter((a) => a.description_ok).length;
  const failed = total - passed;
  return (
    <div className="flex items-center gap-3 text-white/90 text-xs mt-1">
      <span className="flex items-center gap-1">
        <CheckCircle className="w-3.5 h-3.5" />
        {passed} Passed
      </span>
      {failed > 0 && (
        <span className="flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          {failed} Need Attention
        </span>
      )}
      <span className="ml-auto text-white/60">Total: {total}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Static tool registry
// ─────────────────────────────────────────────────────────────────────────────

export const toolRendererRegistry: ToolRegistry = {
  web_search: {
    toolName: "web_search",
    displayName: "Web Search",
    resultsLabel: "Search Results",
    InlineComponent: BraveSearchInline,
    OverlayComponent: (props: ToolRendererProps) => {
      const first = filterStepEvents(props.events, "brave_default_page")[0];
      if (!first) return <GenericRenderer {...props} />;
      // BraveSearchDisplay expects legacy { type, content } — adapt here.
      const adapted = {
        type: "brave_default_page" as const,
        content: first.metadata,
      };
      return <BraveSearchDisplay data={adapted as never} />;
    },
  },

  news_get_headlines: {
    toolName: "news_get_headlines",
    displayName: "News Headlines",
    resultsLabel: "News Results",
    InlineComponent: NewsInline,
    OverlayComponent: NewsOverlay,
    keepExpandedOnStream: true,
    getHeaderSubtitle: (entry) => {
      const query = getArg<string>(entry, "query");
      return typeof query === "string" && query ? query : null;
    },
    getHeaderExtras: (entry) => {
      const result = resultAsObject(entry);
      const totalResults =
        typeof result?.total_results === "number"
          ? (result.total_results as number)
          : undefined;
      if (!totalResults) return null;
      return (
        <div className="flex items-center gap-3 text-white/90 text-xs mt-1">
          <span>
            {totalResults} {totalResults === 1 ? "article" : "articles"} found
          </span>
        </div>
      );
    },
  },

  seo_check_meta_tags_batch: {
    toolName: "seo_check_meta_tags_batch",
    displayName: "SEO Meta Tags",
    resultsLabel: "Meta Tags Results",
    InlineComponent: SeoMetaTagsInline,
    OverlayComponent: SeoMetaTagsOverlay,
    keepExpandedOnStream: true,
    getHeaderExtras: seoMetaTagsHeaderExtras,
  },

  seo_check_meta_titles: {
    toolName: "seo_check_meta_titles",
    displayName: "SEO Title Checker",
    resultsLabel: "Title Results",
    InlineComponent: SeoMetaTitlesInline,
    keepExpandedOnStream: true,
    getHeaderExtras: seoTitlesHeaderExtras,
  },

  seo_check_meta_descriptions: {
    toolName: "seo_check_meta_descriptions",
    displayName: "SEO Description Checker",
    resultsLabel: "Description Results",
    InlineComponent: SeoMetaDescriptionsInline,
    keepExpandedOnStream: true,
    getHeaderExtras: seoDescriptionsHeaderExtras,
  },

  web_search_v1: {
    toolName: "web_search_v1",
    displayName: "Web Research",
    resultsLabel: "Research Results",
    InlineComponent: WebResearchInline,
    OverlayComponent: WebResearchOverlay,
    keepExpandedOnStream: true,
    getHeaderSubtitle: (entry) => {
      const queries = getArg<unknown[]>(entry, "queries");
      if (Array.isArray(queries) && queries.length > 0) {
        return queries.length === 1
          ? String(queries[0])
          : `${queries.length} queries`;
      }
      const query = getArg<string>(entry, "query");
      return typeof query === "string" ? query : null;
    },
    getHeaderExtras: (entry, events) => {
      const queries = getArg<unknown[]>(entry, "queries");
      const query = getArg<string>(entry, "query");
      const queryCount = Array.isArray(queries)
        ? queries.length
        : typeof query === "string"
          ? 1
          : 0;
      const messages = collectMessages(events);
      const browsingCount = messages.filter((m) =>
        m.startsWith("Browsing "),
      ).length;
      if (queryCount === 0 && browsingCount === 0) return null;
      const parts: string[] = [];
      if (queryCount > 0)
        parts.push(`${queryCount} ${queryCount === 1 ? "query" : "queries"}`);
      if (browsingCount > 0) {
        parts.push(
          `${browsingCount} deep ${browsingCount === 1 ? "read" : "reads"}`,
        );
      } else if (queryCount > 0) {
        parts.push(`~${queryCount * 3} deep reads`);
      }
      return (
        <div className="flex items-center gap-3 text-white/90 text-xs mt-1">
          <span className="flex items-center gap-1">
            {parts.join(" \u00B7 ")}
          </span>
        </div>
      );
    },
  },

  core_web_search: {
    toolName: "core_web_search",
    displayName: "Multi-Query Search",
    resultsLabel: "Search Results",
    InlineComponent: CoreWebSearchInline,
    OverlayComponent: CoreWebSearchOverlay,
    keepExpandedOnStream: true,
  },

  research_web: {
    toolName: "research_web",
    displayName: "Deep Research",
    resultsLabel: "Research Results",
    InlineComponent: DeepResearchInline,
    OverlayTabs: deepResearchOverlayTabs,
    keepExpandedOnStream: true,
    getHeaderSubtitle: (entry) => {
      const query = getArg<string>(entry, "query");
      return typeof query === "string" ? query : null;
    },
    getHeaderExtras: (entry) => {
      const raw = resultAsString(entry);
      if (!raw) return null;
      const readCount = (raw.match(/<read_result>/g) || []).length;
      if (readCount === 0) return null;
      return (
        <div className="flex items-center gap-3 text-white/90 text-xs mt-1">
          <span className="flex items-center gap-1">
            {readCount} {readCount === 1 ? "page" : "pages"} read
          </span>
        </div>
      );
    },
  },

  core_web_search_and_read: {
    toolName: "core_web_search_and_read",
    displayName: "Deep Research",
    resultsLabel: "Research Results",
    InlineComponent: DeepResearchInline,
    OverlayTabs: deepResearchOverlayTabs,
    keepExpandedOnStream: true,
    getHeaderSubtitle: (entry) => {
      const query = getArg<string>(entry, "query");
      return typeof query === "string" ? query : null;
    },
    getHeaderExtras: (entry) => {
      const raw = resultAsString(entry);
      if (!raw) return null;
      const readCount = (raw.match(/<read_result>/g) || []).length;
      if (readCount === 0) return null;
      return (
        <div className="flex items-center gap-3 text-white/90 text-xs mt-1">
          <span className="flex items-center gap-1">
            {readCount} {readCount === 1 ? "page" : "pages"} read
          </span>
        </div>
      );
    },
  },

  get_user_lists: {
    toolName: "get_user_lists",
    displayName: "User Lists",
    resultsLabel: "Lists",
    InlineComponent: UserListsInline,
    OverlayComponent: UserListsOverlay,
    keepExpandedOnStream: true,
    getHeaderSubtitle: (entry) => {
      const search = getArg<string>(entry, "search_term");
      const page = getArg<number>(entry, "page") ?? 1;
      const parts: string[] = [];
      if (typeof search === "string" && search) parts.push(`"${search}"`);
      if (page > 1) parts.push(`Page ${page}`);
      return parts.length > 0 ? parts.join(" · ") : null;
    },
    getHeaderExtras: (entry) => {
      const result = resultAsObject(entry);
      if (!result) return null;
      const count = result.count as number | undefined;
      const pageSize = result.page_size as number | undefined;
      if (!count) return null;
      return (
        <div className="flex items-center gap-3 text-white/90 text-xs mt-1">
          <span>
            {count} {count === 1 ? "list" : "lists"}
          </span>
          {pageSize && <span>{pageSize} per page</span>}
        </div>
      );
    },
  },

  core_web_read_web_pages: {
    toolName: "core_web_read_web_pages",
    displayName: "Web Page Reader",
    resultsLabel: "Pages Read",
    InlineComponent: DeepResearchInline,
    OverlayTabs: deepResearchOverlayTabs,
    keepExpandedOnStream: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Resolution API
// ─────────────────────────────────────────────────────────────────────────────

export function hasCustomRenderer(toolName: string | null): boolean {
  if (!toolName) return false;
  if (toolName in toolRendererRegistry) return true;
  if (getCachedRenderer(toolName)) return true;
  return false;
}

export function mightHaveDynamicRenderer(toolName: string | null): boolean {
  if (!toolName) return false;
  if (toolName in toolRendererRegistry) return false;
  if (isKnownNoDynamic(toolName)) return false;
  return true;
}

export function getInlineRenderer(
  toolName: string | null,
): React.ComponentType<ToolRendererProps> {
  if (!toolName) return GenericRenderer;

  if (toolRendererRegistry[toolName]) {
    return toolRendererRegistry[toolName].InlineComponent;
  }

  const dynamicCached = getCachedRenderer(toolName);
  if (dynamicCached) {
    const cachedToolName = toolName;
    return (props: ToolRendererProps) => (
      <DynamicInlineRenderer toolName={cachedToolName} {...props} />
    );
  }

  if (!isKnownNoDynamic(toolName)) {
    const dynamicToolName = toolName;
    return (props: ToolRendererProps) => (
      <DynamicInlineRenderer toolName={dynamicToolName} {...props} />
    );
  }

  return GenericRenderer;
}

/**
 * Returns the custom overlay tabs registered for a tool, or `null` if the
 * tool only registers a single OverlayComponent (or nothing at all).
 *
 * When this returns a non-empty array, the ToolUpdatesOverlay should
 * expand these into top-level tabs and SKIP the default "Results" tab.
 */
export function getOverlayTabs(
  toolName: string | null,
): ToolOverlayTabSpec[] | null {
  if (!toolName) return null;
  const renderer = toolRendererRegistry[toolName];
  if (renderer?.OverlayTabs && renderer.OverlayTabs.length > 0) {
    return renderer.OverlayTabs;
  }
  // Dynamic renderers do not currently support OverlayTabs.
  return null;
}

/** True when the tool contributes its own top-level overlay tabs. */
export function hasOverlayTabs(toolName: string | null): boolean {
  const tabs = getOverlayTabs(toolName);
  return tabs !== null && tabs.length > 0;
}

export function getOverlayRenderer(
  toolName: string | null,
): React.ComponentType<ToolRendererProps> {
  if (!toolName) return GenericRenderer;

  if (toolRendererRegistry[toolName]) {
    const renderer = toolRendererRegistry[toolName];
    return (
      renderer.OverlayComponent ?? renderer.InlineComponent ?? GenericRenderer
    );
  }

  const dynamicCached = getCachedRenderer(toolName);
  if (dynamicCached) {
    const cachedToolName = toolName;
    if (dynamicCached.OverlayComponent) {
      return (props: ToolRendererProps) => (
        <DynamicOverlayRenderer toolName={cachedToolName} {...props} />
      );
    }
    return (props: ToolRendererProps) => (
      <DynamicInlineRenderer toolName={cachedToolName} {...props} />
    );
  }

  if (!isKnownNoDynamic(toolName)) {
    const dynamicToolName = toolName;
    return (props: ToolRendererProps) => (
      <DynamicOverlayRenderer toolName={dynamicToolName} {...props} />
    );
  }

  return GenericRenderer;
}

export function shouldKeepExpandedOnStream(toolName: string | null): boolean {
  if (!toolName) return true;
  if (toolRendererRegistry[toolName]) {
    return toolRendererRegistry[toolName].keepExpandedOnStream ?? false;
  }
  const dynamic = getCachedRenderer(toolName);
  if (dynamic) return dynamic.keepExpandedOnStream;
  return true;
}

export function getToolDisplayName(toolName: string | null): string {
  if (!toolName) return "Tool";
  if (toolRendererRegistry[toolName]?.displayName)
    return toolRendererRegistry[toolName].displayName;
  const dynamic = getCachedRenderer(toolName);
  if (dynamic) return dynamic.displayName;
  return toolName
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getResultsLabel(toolName: string | null): string {
  if (!toolName) return "Results";
  const renderer = toolRendererRegistry[toolName];
  if (renderer?.resultsLabel) return renderer.resultsLabel;
  const dynamic = getCachedRenderer(toolName);
  if (dynamic?.resultsLabel) return dynamic.resultsLabel;
  return `${getToolDisplayName(toolName)} Results`;
}

export function getHeaderSubtitle(
  toolName: string | null,
  entry: ToolLifecycleEntry,
  events?: ToolEventPayload[],
): string | null {
  if (!toolName) return null;
  const fn = toolRendererRegistry[toolName]?.getHeaderSubtitle;
  if (fn) {
    try {
      return fn(entry, events);
    } catch {
      return null;
    }
  }
  const dynamic = getCachedRenderer(toolName);
  if (dynamic?.getHeaderSubtitle) {
    try {
      return dynamic.getHeaderSubtitle(entry, events);
    } catch {
      return null;
    }
  }
  return null;
}

export function getHeaderExtras(
  toolName: string | null,
  entry: ToolLifecycleEntry,
  events?: ToolEventPayload[],
): React.ReactNode {
  if (!toolName) return null;
  const fn = toolRendererRegistry[toolName]?.getHeaderExtras;
  if (fn) {
    try {
      return fn(entry, events);
    } catch {
      return null;
    }
  }
  const dynamic = getCachedRenderer(toolName);
  if (dynamic?.getHeaderExtras) {
    try {
      return dynamic.getHeaderExtras(entry, events);
    } catch {
      return null;
    }
  }
  return null;
}

export function registerToolRenderer(
  toolName: string,
  renderer: ToolRenderer,
): void {
  toolRendererRegistry[toolName] = renderer;
}
