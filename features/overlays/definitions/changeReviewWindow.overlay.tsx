"use client";

/**
 * Opener for the `changeReviewWindow` overlay — THE archive / move review (move-and-archive plan § 9).
 * `useOpenChangeReviewWindow()` returns `open({ verb, entityType, id, name, organizationId })`.
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";

const opener = createOpener<object>("changeReviewWindow");

export interface OpenChangeReviewOptions {
  verb: "move" | "delete";
  /** Registry token (`note`, `web_brand`, `party`). */
  entityType: string;
  id: string;
  name: string;
  /** The record's own organization: a move never offers it as the destination. */
  organizationId?: string | null;
}

export function changeReviewOverlayData(opts: OpenChangeReviewOptions) {
  return {
    overlayId: "changeReviewWindow" as const,
    data: {
      verb: opts.verb,
      entityType: opts.entityType,
      ids: [opts.id],
      recordName: opts.name,
      title: `${opts.verb === "move" ? "Move" : "Archive"} ${opts.name}`,
      currentOrganizationId: opts.organizationId ?? null,
    },
  };
}

export function useOpenChangeReviewWindow() {
  const dispatch = useAppDispatch();
  return useCallback((opts: OpenChangeReviewOptions) => opener.open(dispatch, { data: changeReviewOverlayData(opts).data }), [dispatch]);
}

export type ChangeReviewWindowDefinitionData = OpenChangeReviewOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    changeReviewWindow: OverlayWire<ChangeReviewWindowDefinitionData>;
  }
}
