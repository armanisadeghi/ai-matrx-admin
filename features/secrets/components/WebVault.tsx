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
import { packageKnobClient } from "@/lib/knobs/packageKnobClient";
import { supabase } from "@/utils/supabase/client";
import { webVaultIdentity as identity, webVaultSignIn as signIn } from "../webVaultIdentity";
import { useVaultInventory, VaultContextMenu } from "./VaultContextMenu";

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

const openUrl = (url: string) => void openOutbound(url, "_blank", "noopener");
/** "Open in new tab" for one item (the Authenticator's code rows): the item's own page. */
const openItemInNewTab = (itemId: string) =>
  void window.open(`/vault/${encodeURIComponent(itemId)}`, "_blank", "noopener");

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
      ? createVaultKnobs(packageKnobClient(supabase), { organizationId, userId })
      : undefined;
  // The website's own right-click menu (VaultContextMenu: agents, Copy, Export) answers on rows;
  // the row's More button still carries copy-any-field.
  const rowContextMenu = "host" as const;
  return knobs
    ? { identity, openUrl, openItemInNewTab, signIn, knobs, rowContextMenu }
    : { identity, openUrl, openItemInNewTab, signIn, rowContextMenu };
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
  // The right-click menu and every agent opened here get the vault's non-secret shape.
  const { inventory, onInventory, getSurfaceScope } = useVaultInventory();
  return (
    <VaultContextMenu
      inventory={inventory}
      getSurfaceScope={getSurfaceScope}
      onOpenItem={(id) =>
        onLocationChange(
          { ...location, itemId: id, mode: "view", kind: null, panel: null },
          "push",
        )
      }
    >
      {/* A plain element for the menu's trigger to slot onto (VaultApp takes no DOM props). */}
      <div className="h-full min-h-0 w-full">
        <VaultApp
          port={vaultPort()}
          host={host}
          layout={layout}
          location={location}
          onLocationChange={onLocationChange}
          notify={notify}
          onInventory={onInventory}
        />
      </div>
    </VaultContextMenu>
  );
}

/** The Authenticator's own address: the workspace opened on its codes view. */
export const AUTHENTICATOR_PATH = "/vault/authenticator";

/** `/vault`, `/vault/<id>` or `/vault/authenticator` (+ query) → where the workspace is. */
export function locationFromAddress(pathname: string | null, search: string): VaultLocation {
  // `/vault/authenticator` is the Authenticator itself, never an item id.
  const onAuthenticator = pathname === AUTHENTICATOR_PATH;
  const pathItem = onAuthenticator
    ? undefined
    : /^\/vault\/([^/]+)$/.exec(pathname ?? "")?.[1];
  const itemId = pathItem ? decodeURIComponent(pathItem) : null;
  const query = new URLSearchParams(search);
  if (onAuthenticator && !query.has("view")) query.set("view", "authenticator");
  return locationFromParams(query, itemId);
}

/** Address parts the approve panel reads beside `panel=approve:<key>`. */
const APPROVAL_PARAMS = ["label", "kind"] as const;

export function vaultHref(loc: VaultLocation, current: URLSearchParams): string {
  const q = locationToParams(loc);
  if (loc.panel?.startsWith("approve:")) {
    for (const key of APPROVAL_PARAMS) {
      const value = current.get(key);
      if (value) q.set(key, value);
    }
  }
  // The Authenticator keeps its own address while it is open.
  const onAuthenticator = !loc.itemId && loc.view === "authenticator";
  if (onAuthenticator) q.delete("view");
  const path = loc.itemId
    ? `/vault/${encodeURIComponent(loc.itemId)}`
    : onAuthenticator
      ? AUTHENTICATOR_PATH
      : "/vault";
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
  const location = locationFromAddress(pathname, params?.toString() ?? "");

  return (
    <div className="h-full overflow-hidden" data-user-content>
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
    <div className="h-[70dvh] min-h-[480px] overflow-hidden" data-user-content>
      <WebVault
        location={location}
        onLocationChange={(next) => setLocation(next)}
        organizationId={organizationId}
      />
    </div>
  );
}
