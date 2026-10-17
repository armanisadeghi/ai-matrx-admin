"use client";

/**
 * Vault as a floating window — the credential store beside whatever you are
 * working on. Renders the shared `@ai-matrx/vault` workspace through the
 * website's host (`features/secrets/components/WebVault.tsx`).
 *
 * Only the non-secret position is persisted (`window_sessions.data`): the open
 * item and the rest of the workspace address (vault, view, search, panel) as
 * query text. Never a field value, never a revealed secret.
 */
import { useCallback, useState } from "react";
import {
  DEFAULT_LOCATION,
  locationFromParams,
  locationToParams,
  type VaultLocation,
} from "@ai-matrx/vault";

import { WindowPanel } from "@ai-matrx/summon/window";
import { WebVault } from "@/features/secrets/components/WebVault";

export interface VaultWindowProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId?: string;
  /** Restored from `window_sessions.data` — see the registry `defaultData`. */
  initialSelectedItemId?: string | null;
  /** The workspace address as query text (`locationToParams`), e.g. `mode=new&kind=website_login`. */
  initialLocation?: string | null;
}

export default function VaultWindow({
  isOpen,
  onClose,
  instanceId = "default",
  initialSelectedItemId = null,
  initialLocation = null,
}: VaultWindowProps) {
  if (!isOpen) return null;
  return (
    <VaultWindowInner
      onClose={onClose}
      instanceId={instanceId}
      initialSelectedItemId={initialSelectedItemId}
      initialLocation={initialLocation}
    />
  );
}

function VaultWindowInner({
  onClose,
  instanceId,
  initialSelectedItemId,
  initialLocation,
}: Omit<VaultWindowProps, "isOpen">) {
  const [location, setLocation] = useState<VaultLocation>(() =>
    initialLocation || initialSelectedItemId
      ? locationFromParams(
          new URLSearchParams(initialLocation ?? ""),
          initialSelectedItemId ?? null,
        )
      : DEFAULT_LOCATION,
  );

  const collectData = useCallback(
    (): Record<string, unknown> => ({
      selectedItemId: location.itemId,
      location: locationToParams(location).toString(),
    }),
    [location],
  );

  return (
    <WindowPanel
      id={`credential-vault-${instanceId}`}
      title="Vault"
      onClose={onClose}
      minWidth={360}
      minHeight={460}
      width={960}
      height={640}
      position="center"
      overlayId="credentialVaultWindow"
      onCollectData={collectData}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <WebVault location={location} onLocationChange={(next) => setLocation(next)} />
    </WindowPanel>
  );
}
