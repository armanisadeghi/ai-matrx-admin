"use client";

/**
 * THE website's host for `@ai-matrx/vault` — the one Vault workspace the web
 * app, the browser extension and the desktop app all render. This file only
 * supplies identity: the app's own `Api` (`serverApi`), its browser Supabase
 * client, the outbound-link door and the app's toast. Every screen and every
 * vault call lives in the package (`aidream/apps/shared/vault`).
 *
 * Three web placements render it: the `/vault` route (`VaultRouteBody`, the
 * address carries everything), the floating Vault window, and the
 * organization page's vault section (both keep their location in memory).
 */
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  createApiVaultPort,
  createSupabaseIdentity,
  createVaultKnobs,
  DEFAULT_LOCATION,
  locationFromParams,
  locationToParams,
  VaultApp,
  type Notify,
  type VaultHostCapabilities,
  type VaultLayout,
  type VaultLocation,
  type VaultPort,
} from "@ai-matrx/vault";
import { openOutbound } from "@ai-matrx/kit/outbound";
import {
  pushAddressWithoutNavigating,
  replaceAddressWithoutNavigating,
} from "@/lib/url-state/addressWithoutNavigating";
import { serverApi } from "@/lib/api/server-api";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { toast } from "@/lib/toast";
import { supabase } from "@/utils/supabase/client";

let sharedPort: VaultPort | null = null;
/** One port per tab: it holds only the server client and caches, never a person's plaintext. */
function vaultPort(): VaultPort {
  sharedPort ??= createApiVaultPort(serverApi, {
    userState: supabase,
    platformDoor: supabase.schema("platform"),
    passkeys: supabase.auth,
  });
  return sharedPort;
}

const identity = createSupabaseIdentity(supabase.auth, {
  redirectTo: () => window.location.href,
});

const openUrl = (url: string) => void openOutbound(url, "_blank", "noopener");

const notify: Notify = (message, kind) => {
  if (kind === "error") toast.error(message);
  else if (kind === "success") toast.success(message);
  else toast.info(message);
};

/**
 * The host abilities for one placement. `organizationId` names whose vault
 * settings (generator and import limits) apply: the organization page passes
 * its own; everywhere else it is the active organization.
 */
function useVaultHost(organizationId: string | null): VaultHostCapabilities {
  const userId = useAppSelector(selectUserId);
  const knobs =
    organizationId && userId
      ? createVaultKnobs(supabase, { organizationId, userId })
      : undefined;
  return knobs ? { identity, openUrl, knobs } : { identity, openUrl };
}

export interface WebVaultProps {
  location: VaultLocation;
  onLocationChange: (next: VaultLocation, how: "push" | "replace") => void;
  /** Whose vault settings apply; defaults to the active organization. */
  organizationId?: string | null;
  layout?: VaultLayout;
}

/** The workspace with the website's identity, for any placement. */
export function WebVault({
  location,
  onLocationChange,
  organizationId,
  layout,
}: WebVaultProps) {
  const activeOrganizationId = useAppSelector(selectOrganizationId);
  const host = useVaultHost(organizationId ?? activeOrganizationId);
  return (
    <VaultApp
      port={vaultPort()}
      host={host}
      layout={layout}
      location={location}
      onLocationChange={onLocationChange}
      notify={notify}
    />
  );
}

/** Address parts the approve panel reads beside `panel=approve:<key>`. */
const APPROVAL_PARAMS = ["label", "kind"] as const;

function vaultHref(loc: VaultLocation, current: URLSearchParams): string {
  const q = locationToParams(loc);
  if (loc.panel?.startsWith("approve:")) {
    for (const key of APPROVAL_PARAMS) {
      const value = current.get(key);
      if (value) q.set(key, value);
    }
  }
  const path = loc.itemId ? `/vault/${encodeURIComponent(loc.itemId)}` : "/vault";
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * `/vault` and `/vault/[itemId]`: the item id is the path, everything else is
 * query params. Writes never navigate (no server round trip, no remount), so
 * opening an item and coming Back keeps the list exactly as it was.
 */
export function VaultRouteBody() {
  const pathname = usePathname();
  const params = useSearchParams();
  const pathItem = /^\/vault\/([^/]+)$/.exec(pathname ?? "")?.[1];
  const itemId = pathItem ? decodeURIComponent(pathItem) : null;
  const location = locationFromParams(
    new URLSearchParams(params?.toString() ?? ""),
    itemId,
  );

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full min-h-0 pt-[var(--shell-header-h)]">
        <WebVault
          location={location}
          onLocationChange={(next, how) => {
            const href = vaultHref(
              next,
              new URLSearchParams(window.location.search),
            );
            if (how === "push") pushAddressWithoutNavigating(href);
            else replaceAddressWithoutNavigating(href);
          }}
        />
      </div>
    </div>
  );
}

/**
 * The organization page's vault section: the same workspace, opened on that
 * organization's vault and kept in memory (the page owns its own address).
 */
export function OrganizationVault({ organizationId }: { organizationId: string }) {
  const [location, setLocation] = useState<VaultLocation>(() => ({
    ...DEFAULT_LOCATION,
    vault: organizationId,
  }));
  return (
    <div className="h-[70dvh] min-h-[480px] overflow-hidden">
      <WebVault
        location={location}
        onLocationChange={(next) => setLocation(next)}
        organizationId={organizationId}
      />
    </div>
  );
}
