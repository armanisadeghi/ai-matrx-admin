"use client";

/**
 * Opener for the `connectorConsentDialog` overlay — "Choose what to connect".
 *
 * Call it from anywhere a person meets a provider they have not connected: the
 * prompt card above a composer, a connector chip, Settings. It opens over the
 * page instead of sending anyone to a settings route.
 */

import { useEffect, useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { AppDispatch } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "connectorConsentDialog" as const;

export interface OpenConnectorConsentOptions {
  /** Seed the account being added to. */
  initialConnectionId?: string | null;
  /** Pre-switch-on these product rows (what the surface knows is in use). */
  initialProductKeys?: readonly string[];
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createConnectorConsentDialogOpener(store: { dispatch: AppDispatch }) {
  const dispatch = store.dispatch;
  return (options?: OpenConnectorConsentOptions) => {
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
  };
}

export function useOpenConnectorConsentDialog() {
  const dispatch = useAppDispatch();
  return useMemo(() => createConnectorConsentDialogOpener({ dispatch }), [dispatch]);
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

export type ConnectorConsentDialogDefinitionData = OpenConnectorConsentOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    connectorConsentDialog: OverlayWire<ConnectorConsentDialogDefinitionData>;
  }
}
