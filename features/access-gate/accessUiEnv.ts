/**
 * The app's inputs to the access SCREENS in `@ai-matrx/sharing/access/react` — injected once, at
 * boot, by providers/SharingHost.tsx right after `ensureAccessEnv()` (the pure half,
 * `@ai-matrx/data/access`). The screens live in the package; this file only hands them the sign-in
 * link, the current person, toasts, the overlay doors the "can't remove it" screen
 * (`cantRemoveDialog`) opens through, the voice textarea and the error-copy menu.
 */
import { createElement, lazy, Suspense, useMemo } from "react";
import { configureAccessUi, type AccessUiTextareaProps } from "@ai-matrx/sharing/access/react";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/boot";
import { useLoginHref } from "@/hooks/auth/useLoginHref";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectDisplayName, selectUserEmail, selectUserId } from "@/lib/redux/selectors/userSelectors";
import { getStoreSingleton } from "@/lib/redux/store-singleton";
import { toast } from "@/lib/toast";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

let configured = false;

/** Injects the app's inputs into `@ai-matrx/sharing/access/react` (once). */
export function ensureAccessUiEnv(): void {
  if (configured) return;
  configured = true;
  configureAccessUi({
    useLoginHref: () => useLoginHref(),
    useCurrentUser: useAccessCurrentUser,
    toast,
    Textarea: AccessTextarea,
    renderErrorMenu: ({ error }) => createElement(ErrorAlchemyMenu, { error }),
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
