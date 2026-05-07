"use client";

import type { ComponentType } from "react";
import { getAdapterForTabId } from "../library-sources/registry";

/**
 * Render-preview registry — lets a library source declare a React
 * component that renders the *live* output of one of its tabs as a
 * sibling editor tab (`kind === "render-preview"`).
 *
 * The registry is keyed by the same `tabIdPrefix` the library-source
 * adapter owns (e.g. `aga-app:`), so a single lookup tells us
 *  - whether the source tab is even previewable
 *  - which component to render
 *
 * Previewers are responsible for fetching their own metadata
 * (variable schemas, layout config, agent ids, etc.) — the source tab
 * gives them the live code buffer; everything else they own.
 */

/** Props handed to every previewer. */
export interface RenderPreviewerProps {
  /** Row id parsed from the source tab id. */
  rowId: string;
  /** Field id for multi-column sources (e.g. tool_ui_components). */
  fieldId?: string;
  /** Live buffer of the source tab — re-renders on every keystroke. */
  code: string;
  /** Source tab id — handy for keying / debugging / agent context. */
  sourceTabId: string;
  /** Monaco language id of the source buffer. */
  language: string;
}

export type RenderPreviewer = ComponentType<RenderPreviewerProps>;

const previewersByPrefix = new Map<string, RenderPreviewer>();

/**
 * Register a previewer for a library-source `tabIdPrefix`. Re-registration
 * is a no-op so Fast Refresh in dev doesn't explode.
 */
export function registerRenderPreviewer(
  tabIdPrefix: string,
  previewer: RenderPreviewer,
): void {
  if (previewersByPrefix.has(tabIdPrefix)) return;
  previewersByPrefix.set(tabIdPrefix, previewer);
}

export function getRenderPreviewerForTabId(
  tabId: string,
): RenderPreviewer | undefined {
  const adapter = getAdapterForTabId(tabId);
  if (!adapter) return undefined;
  return previewersByPrefix.get(adapter.tabIdPrefix);
}

export function hasRenderPreviewerForTabId(tabId: string): boolean {
  return getRenderPreviewerForTabId(tabId) !== undefined;
}

/**
 * Build the canonical preview-tab id paired to a source tab id. Stable
 * so opening twice is idempotent.
 */
export function renderPreviewTabId(sourceTabId: string): string {
  return `${sourceTabId}::preview`;
}
