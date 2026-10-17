"use client";

/**
 * DbKindComponentImpl — this app's mount of `@ai-matrx/rich-content`'s database-component renderer
 * (kinds/db-component/db-kind-component-renderer: the in-page compile, the html frame, the error
 * boundary, the loading face, the loud compile-error card). Every host draws brand_* kinds through
 * that one renderer; what is this app's is the `dbKindComponent` capability registered here:
 *  - the compiler + scope (dbKindComponentCache.ts — Babel, so this chunk loads lazily);
 *  - the organization's sandbox setting (useKindSandboxSettings) and THE sandbox frame
 *    (KindSandboxFrame, /kind-sandbox), with this app's message ceiling;
 *  - the render-throw scream (captureReactRenderError) and the durable incident.
 */
import type React from "react";
import { configureRichContent } from "@ai-matrx/rich-content/host";
import type { RichContentDbKindComponentHost, RichContentDbKindSandboxFrameProps } from "@ai-matrx/rich-content/host/types";
import {
  DbKindComponentRenderer,
  blockKindCorrections,
  type DbKindComponentRendererProps,
} from "@ai-matrx/rich-content/kinds/db-component/db-kind-component-renderer";
import { captureReactRenderError } from "@/lib/diagnostics/captureReactError";
import { MAX_INBOUND_BYTES } from "../../sandbox/protocol";
import { webDbKindComponentCompiler } from "./dbKindComponentCache";
import { KindSandboxFrame } from "./KindSandboxFrame";
import { reportKindComponentIncident } from "./kindComponentIncident";
import { useKindSandboxSettings } from "./useKindSandboxKnob";
import { KindCorrectionsNotice } from "./KindCorrectionsNotice";

export const webDbKindComponentHost: RichContentDbKindComponentHost = {
  ...webDbKindComponentCompiler,
  useSandboxSettings: useKindSandboxSettings,
  SandboxFrame: KindSandboxFrame as unknown as React.ComponentType<RichContentDbKindSandboxFrameProps>,
  frameMessageBytes: MAX_INBOUND_BYTES,
  onRenderError: (error, info, kind) => {
    captureReactRenderError(error, {
      boundary: "DbKindComponentErrorBoundary",
      componentStack: info.componentStack ?? undefined,
      relation: `kind:${kind}`,
    });
    reportKindComponentIncident({
      kind,
      errorType: "render_throw",
      message: error instanceof Error ? error.message : String(error),
      stack: info.componentStack ?? null,
    });
  },
};

configureRichContent({ dbKindComponent: webDbKindComponentHost });

export type DbKindComponentImplProps = DbKindComponentRendererProps;
export const DbKindComponentImpl = DbKindComponentRenderer;
export { blockKindCorrections, KindCorrectionsNotice };
