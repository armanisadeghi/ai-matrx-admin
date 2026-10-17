"use client";

import type { OverlayErrorExtrasContext } from "@ai-matrx/summon/root";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { selectIsAdminDebugger } from "@/lib/redux/selectors/userSelectors";
import { buildOverlayErrorAgentPayload, buildOverlayErrorHuman, type OverlayErrorContext } from "./overlayErrorReport";

/** The admin "Copy for AI" pair in an overlay's error card (what the old fallback footer held). */
export default function OverlayErrorCopyForAi({ overlayId, error, componentStack }: OverlayErrorExtrasContext) {
  const isAdmin = useAppSelector(selectIsAdminDebugger);
  const store = useAppStore();
  if (!isAdmin) return null;
  const ctx: OverlayErrorContext = {
    modulePath: overlayId,
    error,
    componentStack: componentStack ?? null,
    isAdmin,
    getReduxState: () => store.getState(),
  };
  return <CopyButtons size="sm" label="Overlay error" human={() => buildOverlayErrorHuman(ctx)} agent={() => buildOverlayErrorAgentPayload(ctx)} />;
}
