"use client";

/**
 * useOpenCloudBrowserCanvas — the ONE way both triggers open the Cloud Browser.
 *
 * Per the 2026-08 steering, the Cloud Browser is hosted as a CANVAS ITEM (not a
 * standalone route or a bespoke overlay container): it renders inside the
 * existing artifacts/canvas side-sheet, reusing the frame + header the canvas
 * pane already provides. Both entry points call this:
 *   - agent-initiated: the client-side handoff / cloud-browser tool outcome;
 *   - composer attachment: the "work in a cloud browser" pill on the smart
 *     input's ConversationContextRail.
 *
 * The standalone `WindowPanel` opener (`useOpenCloudBrowserWindow`) still works,
 * but the canvas is the primary host. `cloud_browser` is NON_PERSISTABLE — its
 * live run/screenshot/handoff state is never serialized to `canvas_items`.
 */

import { useCallback } from "react";
import { useCanvas } from "@/features/canvas/hooks/useCanvas";
import { useArtifactCanvasActions } from "@/features/canvas/host/useArtifactCanvas";
import {
  buildCloudComputerCanvasContent,
  cloudComputerCanvasSourceId,
} from "@/features/cloud-computer/useOpenCloudComputerCanvas";
import {
  getCloudComputer,
  lastKnownCloudComputer,
} from "@/features/cloud-computer/service";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectRun } from "../redux/selectors";
import type { CanvasContent } from "@/features/canvas/canvasContent";
import type { CloudBrowserRun } from "../types";

export interface OpenCloudBrowserCanvasOptions {
  initialProfileId?: string | null;
  /** The run this handoff/outcome belongs to, when the opener knows it. */
  runId?: string | null;
  /**
   * The chat this browser belongs to. THE BINDING — it is what lets taking
   * control steer the running agent's turn instead of yanking the browser out
   * from under it (`useCloudBrowserTakeover`). Every opener that has one must
   * pass it; without it the surface can only take control immediately.
   */
  conversationId?: string | null;
}

function fleetBrowserSourceId(conversationId: string): string {
  return `cloud-browser:${conversationId}`;
}

/**
 * Whether this open belongs in the Computer tab instead of a Cloud Browser
 * pane — THE ONE-VIEWER RULE (2026-10-16): a machine run is shown only by the
 * Computer tab, never by a second pane that would claim the same run and
 * supersede the stream the person is typing in. A named fleet run stays in the
 * Cloud Browser; an open with no run follows the person's machine.
 * `machineExists` is `null` while the machine has not been read yet.
 */
export function browserBelongsToComputer(input: {
  sliceRun: Pick<CloudBrowserRun, "id" | "executionTarget"> | null;
  runId?: string | null;
  machineExists: boolean | null;
}): boolean {
  const { sliceRun, runId, machineExists } = input;
  if (runId) return sliceRun?.id === runId && sliceRun.executionTarget === "sandbox";
  if (sliceRun?.executionTarget === "sandbox") return true;
  return machineExists === true;
}

/** Stable per-chat canvas identity, so opening twice shows/hides one item
 *  rather than stacking browsers. For a person with a Cloud Computer the
 *  browser IS the Computer tab, so the composer's browser pill toggles that. */
export function cloudBrowserCanvasSourceId(conversationId: string): string {
  return lastKnownCloudComputer()?.exists
    ? cloudComputerCanvasSourceId(conversationId)
    : fleetBrowserSourceId(conversationId);
}

/** The one payload both verbs use, so offering then opening shows ONE pane. */
export function buildCloudBrowserCanvasContent(
  opts: OpenCloudBrowserCanvasOptions = {},
): CanvasContent {
  const conversationId = opts.conversationId ?? undefined;
  return {
    type: "cloud_browser",
    data: {
      initialProfileId: opts.initialProfileId ?? undefined,
      runId: opts.runId ?? undefined,
    },
    metadata: {
      title: "Cloud Browser",
      conversationId,
      sourceMessageId: conversationId
        ? fleetBrowserSourceId(conversationId)
        : undefined,
    },
  };
}

export function useOpenCloudBrowserCanvas() {
  const { open } = useCanvas();
  const { offer } = useArtifactCanvasActions();
  const sliceRun = useAppSelector(selectRun);
  return useCallback(
    (opts: OpenCloudBrowserCanvasOptions = {}) => {
      const computer = buildCloudComputerCanvasContent({
        conversationId: opts.conversationId,
      });
      const decide = (machineExists: boolean | null) => {
        if (browserBelongsToComputer({ sliceRun, runId: opts.runId, machineExists })) {
          open(computer);
          return;
        }
        open(buildCloudBrowserCanvasContent(opts));
        // The person's Cloud Computer sits beside the browser as its own tab.
        offer(computer);
      };
      const known = lastKnownCloudComputer();
      if (known || opts.runId) {
        decide(known ? known.exists : null);
        return;
      }
      // Not read yet in this session: one read decides (a person's click).
      void getCloudComputer().then(
        (machine) => decide(machine.exists),
        () => decide(null),
      );
    },
    [open, offer, sliceRun],
  );
}

/**
 * Make the browser pane AVAILABLE without putting it on screen.
 *
 * `cloud_browser` is NON_PERSISTABLE, so nothing restores this pane after a
 * reload — exactly the shape that stranded
 * the Sandbox behind a hidden one-item switcher on 2026-09-15. While a run is
 * live its surface keeps offering it, so the switcher always has a door to it.
 * See `features/canvas/liveSourceReachability.ts`.
 */
export function useOfferCloudBrowserCanvas() {
  const { offer } = useArtifactCanvasActions();
  const sliceRun = useAppSelector(selectRun);
  return useCallback(
    (opts: OpenCloudBrowserCanvasOptions = {}) => {
      const machineExists = lastKnownCloudComputer()?.exists ?? null;
      offer(
        browserBelongsToComputer({ sliceRun, runId: opts.runId, machineExists })
          ? buildCloudComputerCanvasContent({ conversationId: opts.conversationId })
          : buildCloudBrowserCanvasContent(opts),
      );
    },
    [offer, sliceRun],
  );
}
