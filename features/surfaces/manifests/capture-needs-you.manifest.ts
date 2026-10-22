/**
 * Surface manifest — Needs your browser (`matrx-user/capture-needs-you`), route `/capture/needs-you`.
 *
 * The web pages (and videos) our readers could not fetch and that only the person's own browser can
 * open, each with why and what to do. Emitter: `NeedsYouPage` (`features/capture-ladder/`), from
 * `useNeedsYou`.
 *
 * READ-ONLY: the one action ("Open in my browser") runs the person's own Chrome extension; an agent
 * cannot do it for them.
 */

import type { SurfaceManifest, SurfaceScopePayload, SurfaceValue } from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const CAPTURE_NEEDS_YOU_SURFACE_NAME = "matrx-user/capture-needs-you";

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "needs_you_status",
    label: "Load status",
    description: 'The list\'s state: "ready" once read; anything else means it is still loading or the read failed.',
    valueType: "string",
    alwaysAvailable: true,
    autoContext: true,
    typicalCharCount: 8,
    sortOrder: 100,
  },
  {
    name: "needs_you_count",
    label: "Waiting",
    description: "How many pages are waiting for the person's browser.",
    valueType: "number",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 3,
    sortOrder: 110,
  },
  {
    name: "needs_you_items",
    label: "Pages waiting",
    description: "The first 50: { id, url, title, kind (web_page, video, …), status, reason (why our readers could not fetch it), what_to_do }.",
    valueType: "array",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 3000,
    inlineUpTo: 6000,
    sortOrder: 120,
  },
  {
    name: "reader_liveness",
    label: "Reader status",
    description: "Whether the person's browser reader is answering, in the page's words.",
    valueType: "string",
    alwaysAvailable: false,
    autoContext: false,
    typicalCharCount: 80,
    sortOrder: 130,
  },
];

const declared: Omit<SurfaceManifest, "readiness"> = {
  surfaceName: CAPTURE_NEEDS_YOU_SURFACE_NAME,
  situation:
    "They are looking at the {needs_you_count|no} web pages only their own browser can open for their library; only they can start that.",
  inheritsFrom: "matrx-default/web",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Needs your browser",
  description: "Pages our readers could not fetch that the person's own browser must open.",
  urlPattern: "/capture/needs-you",
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
};

/** No typed `readiness` (D2: earned, never typed). The installed `@ai-matrx/chat` type still
 * requires the key until the D2 package change ships, hence the one cast. */
export const captureNeedsYouManifest = declared as SurfaceManifest;

export function createCaptureNeedsYouScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
