/**
 * The app's inputs to the access SCREENS in `@ai-matrx/sharing/access/react` — injected once, at
 * boot, by providers/SharingHost.tsx right after `ensureAccessEnv()` (the pure half,
 * `@ai-matrx/data/access`). The screens live in the package; this file only hands them the sign-in
 * link, the current person, toasts, the router, links, the Alchemy error menu, entity and person
 * doors, trash restore, feedback, the CMS and setting doors, the summon overlay doors the "can't
 * remove it" screen (`cantRemoveDialog`) opens through, and the voice textarea.
 */
import { createElement, lazy, Suspense, useMemo } from "react";
import {
  configureAccessUi,
  type AccessResourceActionRequestAction,
  type AccessSettingRequestAction,
  type AccessUiEntityInfo,
  type AccessUiRouter,
  type AccessUiTextareaProps,
} from "@ai-matrx/sharing/access/react";
import { EntityRef } from "@ai-matrx/records-ui/entity-ref";
import { presentOrganizationRefusal } from "@ai-matrx/chat/host/org";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/boot";
import AppLink from "@/components/navigation/AppLink";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { UserIdentity } from "@/components/user/UserIdentity";
import { useLoginHref } from "@/hooks/auth/useLoginHref";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectDisplayName, selectUserEmail, selectUserId } from "@/lib/redux/selectors/userSelectors";
import { getStoreSingleton } from "@/lib/redux/store-singleton";
import { toast } from "@/lib/toast";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { submitFeedback } from "@/actions/feedback.actions";
import type { CmsAccessGateToken } from "@/features/cms/accessGateTokens";
import { createCmsAccessRequest } from "@/features/cms/services/cmsAccessRequests";
import { getResourceActionRequestAction } from "@/features/messaging/actions/resourceActionRequestRegistry";
import {
  getSettingRequestAction,
  REQUEST_ACCESS_MANUAL_ACTION,
} from "@/features/messaging/actions/settingRequestActionRegistry";
import { tryGetEntityInfo } from "@/features/scopes/registry/entityRegistry";
import { settingDoorHref } from "@/features/settings/doors/settingDoorTarget";
import { restoreFromTrash } from "@/features/trash/service";
import { resolveRecordUnavailableCapture } from "@/lib/records/recordUnavailable";

let configured = false;

/**
 * The live Next router, registered by the mounted `<SharingHost />` (a router only exists inside a
 * component). Before it registers — or on a render without one — the access screens fall back to a
 * full page load: slower, never wrong.
 */
type AppRouter = { push(href: string): void; back(): void; refresh(): void };
let liveRouter: AppRouter | null = null;

/** Called by `<SharingHost />` with the Next router; returns the undo for the effect cleanup. */
export function registerAccessRouter(router: AppRouter): () => void {
  liveRouter = router;
  return () => {
    if (liveRouter === router) liveRouter = null;
  };
}

const accessRouter: AccessUiRouter = {
  push: (href) => (liveRouter ? liveRouter.push(href) : window.location.assign(href)),
  back: () => (liveRouter ? liveRouter.back() : window.history.back()),
  refresh: () => (liveRouter ? liveRouter.refresh() : window.location.reload()),
};

/** Injects the app's inputs into `@ai-matrx/sharing/access/react` (once). */
export function ensureAccessUiEnv(): void {
  if (configured) return;
  configured = true;
  configureAccessUi({
    useLoginHref: () => useLoginHref(),
    useCurrentUser: useAccessCurrentUser,
    toast,
    Link: AppLink as never,
    router: accessRouter,
    confirm: (options) => confirm(options as Parameters<typeof confirm>[0]),
    Textarea: AccessTextarea,
    renderUserIdentity: (props) => createElement(UserIdentity, props as Parameters<typeof UserIdentity>[0]),
    renderEntityRef: (props) => createElement(EntityRef, props),
    renderErrorMenu: (props) => createElement(ErrorAlchemyMenu, props as Parameters<typeof ErrorAlchemyMenu>[0]),
    entityRegistry: { tryGetEntityInfo: (token) => tryGetEntityInfo(token) as AccessUiEntityInfo | null },
    trash: { restore: (token, id) => restoreFromTrash(token, id).then(() => undefined) },
    recordUnavailableCapture: { resolve: (error, resolution) => resolveRecordUnavailableCapture(error, resolution) },
    settingRequestActions: { get: (key) => getSettingRequestAction(key) as AccessSettingRequestAction | undefined },
    manualRequestActionKey: REQUEST_ACCESS_MANUAL_ACTION,
    resourceActionRequests: {
      get: (key) => getResourceActionRequestAction(key) as AccessResourceActionRequestAction | undefined,
    },
    cms: {
      createAccessRequest: (args) => createCmsAccessRequest({ ...args, token: args.token as CmsAccessGateToken }),
    },
    settingDoorHref: (target) => settingDoorHref(target as Parameters<typeof settingDoorHref>[0]),
    reportFeedback: (input) => submitFeedback(input as Parameters<typeof submitFeedback>[0]),
    presentOrganizationRefusal: (error, options) => presentOrganizationRefusal(error, options),
    overlays: {
      open: (overlayId, instanceId, data) => {
        getStoreSingleton()?.dispatch(openOverlay({ overlayId, instanceId, data } as never));
      },
      close: (overlayId, instanceId) => {
        getStoreSingleton()?.dispatch(closeOverlay({ overlayId, instanceId } as never));
      },
    },
  });
}

/** The person using an access screen, from the auth slice (stable while it does not change). */
function useAccessCurrentUser() {
  const id = useAppSelector(selectUserId);
  const displayName = useAppSelector(selectDisplayName);
  const email = useAppSelector(selectUserEmail);
  return useMemo(() => ({ id, displayName, email }), [id, displayName, email]);
}

/** The app's voice-enabled textarea, fetched only when an access screen shows a note field. */
const LazyProTextarea = lazy(() =>
  import("@/components/official/ProTextarea").then((m) => ({ default: m.ProTextarea })),
);
function AccessTextarea(props: AccessUiTextareaProps) {
  return createElement(Suspense, { fallback: null }, createElement(LazyProTextarea, props));
}
