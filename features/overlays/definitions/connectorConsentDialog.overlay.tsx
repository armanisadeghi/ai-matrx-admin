"use client";

/**
 * Opener for the `connectorConsentDialog` overlay — "Choose what to connect".
 *
 * Call it from anywhere a person meets a provider they have not connected: the
 * prompt card above a composer, a connector chip, Settings. It opens over the
 * page instead of sending anyone to a settings route.
 */

import { useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { AppDispatch } from "@/lib/redux/store";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./hook-controller";

const OVERLAY_ID = "connectorConsentDialog" as const;
const opener = createOpener<object>(OVERLAY_ID);

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
    opener.open(dispatch, { data: {
          initialConnectionId: options?.initialConnectionId ?? null,
          initialProductKeys: options?.initialProductKeys
            ? [...options.initialProductKeys]
            : null,
        } });
    return {
      close: () => dispatch(opener.close()),
    };
  };
}

export function useOpenConnectorConsentDialog() {
  const dispatch = useAppDispatch();
  return useMemo(() => createConnectorConsentDialogOpener({ dispatch }), [dispatch]);
}

export const ConnectorConsentDialogController = hookController<OpenConnectorConsentOptions>(useOpenConnectorConsentDialog);

export type ConnectorConsentDialogDefinitionData = OpenConnectorConsentOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    connectorConsentDialog: OverlayWire<ConnectorConsentDialogDefinitionData>;
  }
}
