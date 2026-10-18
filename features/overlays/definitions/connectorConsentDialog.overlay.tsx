"use client";

/**
 * Opener for the `connectorConsentDialog` overlay — "Choose what to connect".
 *
 * Call it from anywhere a person meets a provider they have not connected: the
 * prompt card above a composer, a connector chip, Settings. It opens over the
 * page instead of sending anyone to a settings route.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "connectorConsentDialog" as const;

export interface OpenConnectorConsentOptions {
  /** Seed the account being added to. */
  initialConnectionId?: string | null;
  /** Pre-switch-on these product rows (what the surface knows is in use). */
  initialProductKeys?: readonly string[];
}

export function useOpenConnectorConsentDialog() {
  const dispatch = useAppDispatch();
  return useCallback(
    (options?: OpenConnectorConsentOptions) => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            initialConnectionId: options?.initialConnectionId ?? null,
            initialProductKeys: options?.initialProductKeys
              ? [...options.initialProductKeys]
              : null,
          },
        }),
      );
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

export function ConnectorConsentDialogController({
  initialConnectionId,
  initialProductKeys,
}: OpenConnectorConsentOptions): null {
  const dispatch = useAppDispatch();
  const keys = initialProductKeys ? [...initialProductKeys].join(",") : "";
  useEffect(() => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          initialConnectionId: initialConnectionId ?? null,
          initialProductKeys: keys ? keys.split(",") : null,
        },
      }),
    );
    return () => {
      dispatch(closeOverlay({ overlayId: OVERLAY_ID }));
    };
    // `keys` is the stable address of the array a caller builds inline.
  }, [dispatch, initialConnectionId, keys]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ConnectorConsentDialogDefinitionData = OpenConnectorConsentOptions;

export const connectorConsentDialogOverlay = /* @__PURE__ */ defineOverlay<ConnectorConsentDialogDefinitionData>()({
  id: "connectorConsentDialog",
  label: "Choose what to connect",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});


declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    connectorConsentDialog: OverlayWire<ConnectorConsentDialogDefinitionData>;
  }
}
