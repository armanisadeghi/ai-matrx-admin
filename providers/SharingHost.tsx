"use client";

/**
 * providers/SharingHost.tsx — the web's ONE host configuration for @ai-matrx/sharing.
 *
 * The share sheet, share links, permission service, registry and "shown to" reads live in the
 * package (`@ai-matrx/sharing/core` + `/react`). This file hands it the web's pieces, once, at
 * module load (before any page effect can ask for a share): the browser Supabase client, aidream
 * calls (`callApi` through the Redux store), the active organization, entity routes, the
 * search-engine-indexed server actions, and the web's UI parts (toasts, copy buttons, page
 * capture, Alchemy menu, entity refs from records-ui, people search, vault identity).
 * It also injects `@ai-matrx/data/access` (configureAccess) and the access screens'
 * `@ai-matrx/sharing/access/react` (configureAccessUi) through the access-gate's own boot.
 *
 * `<SharingHost />` renders nothing; mounting it in app/Providers.tsx keeps this module in the
 * bundle (the app's package.json declares `"sideEffects": false`).
 */

import { useEffect, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { configureSharing, type ShareServerCall, type ShareServerResult } from "@ai-matrx/sharing/core";
import { configureShareSheetUi } from "@ai-matrx/sharing/react";
import { InfoHint } from "@ai-matrx/design-system/controls";
import { EntityDoorControls, EntityRef } from "@ai-matrx/records-ui/entity-ref";
import { resolveEntityDoors } from "@ai-matrx/records-ui/entity-doors";
import { createClient } from "@/utils/supabase/client";
import { callApi } from "@/lib/api/call-api";
import { getStore } from "@/lib/redux/store";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { getActiveOrgId } from "@/lib/organizations/activeOrg";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { tryGetEntityInfo } from "@/features/scopes/registry/entityRegistry";
import {
  getSearchEngineIndexedState,
  setSearchEngineIndexed,
} from "@/features/sharing/indexed/actions";
import { toast } from "@/components/ui/use-toast";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { csvExportItem, jsonExportItem } from "@/components/agent-copy/export";
import { usePageCapture } from "@/components/agent-copy/page-capture/usePageCapture";
import { dialogCapture } from "@/components/agent-copy/page-capture/pageCapture";
import { PageCaptureButton } from "@/components/agent-copy/page-capture/PageCaptureButton";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { UserAvatarDisplay } from "@/components/user/UserIdentity";
import { ConnectionsReadNotice } from "@/features/messaging/components/ConnectionsReadNotice";
import { useUserConnections } from "@/features/messaging/hooks/useUserConnections";
import { UserSearchField } from "@/features/user-search/UserSearchField";
import { useNavTree } from "@/features/agent-context/hooks/useNavTree";
import { webVaultIdentity } from "@/features/secrets/webVaultIdentity";
import { humanLines } from "@/features/marketing/lib/copy-payloads";
import { ensureAccessEnv } from "@/features/access-gate/accessEnv";
import { ensureAccessUiEnv, registerAccessRouter } from "@/features/access-gate/accessUiEnv";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- the sheet's slots take loose props by design */
type Slot = ComponentType<any>;

let configured = false;

export function ensureSharingHost(): void {
  if (configured) return;
  configured = true;
  ensureAccessEnv();
  ensureAccessUiEnv();
  configureSharing({
    client: () => createClient(),
    callServer: (call: ShareServerCall) => {
      // The web's callApi is a thunk: the store runs it and answers the call's result.
      const store = getStore();
      if (!store) {
        return Promise.resolve({ error: { message: "The app store is not ready yet, so the server was not called.", status: 0 } });
      }
      return store.dispatch(callApi(call as Parameters<typeof callApi>[0])) as unknown as Promise<ShareServerResult>;
    },
    getActiveOrgId: () => getActiveOrgId(),
    ensureOrgId: (organizationId) => ensureOrgId(organizationId ?? undefined),
    resolveEntityHref: (token, id) => resolveEntityDoors(token, id).href,
    isKnownEntity: (token) => Boolean(tryGetEntityInfo(token)),
    appUrl: () => (typeof window !== "undefined" ? window.location.origin : ""),
    searchEngineIndexed: {
      get: (resourceType, resourceId) => getSearchEngineIndexedState(resourceType, resourceId),
      set: (resourceType, resourceId, indexed) => setSearchEngineIndexed(resourceType, resourceId, indexed),
    },
  });
  configureShareSheetUi({
    toast: (options) => {
      toast(options as Parameters<typeof toast>[0]);
    },
    useCurrentUserId: () => useAppSelector(selectUserId),
    useOrganizations: () => useNavTree().orgs.map((o) => ({ id: o.id, name: o.name })),
    useUserConnections: (options) => useUserConnections(options) as never,
    confirm: (options) => confirm(options as Parameters<typeof confirm>[0]),
    CopyButtons: CopyButtons as Slot,
    csvExportItem,
    jsonExportItem,
    usePageCapture: usePageCapture as never,
    dialogCapture: dialogCapture as never,
    PageCaptureButton: PageCaptureButton as Slot,
    ErrorAlchemyMenu: ErrorAlchemyMenu as Slot,
    InfoHint: InfoHint as Slot,
    EntityDoorControls: EntityDoorControls as Slot,
    EntityRef: EntityRef as Slot,
    UserAvatarDisplay: UserAvatarDisplay as Slot,
    ConnectionsReadNotice: ConnectionsReadNotice as Slot,
    UserSearchField: UserSearchField as Slot,
    vaultIdentity: webVaultIdentity,
    humanLines: humanLines as never,
  });
}

ensureSharingHost();

export function SharingHost(): null {
  ensureSharingHost();
  const router = useRouter();
  // The access screens navigate with the app's router (set here: a router only exists in a component).
  useEffect(() => registerAccessRouter(router), [router]);
  return null;
}
