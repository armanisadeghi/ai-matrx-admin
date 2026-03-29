import { useEffect } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectSessionHasUnsavedChanges } from "@/features/cx-conversation/redux/selectors";

/**
 * Registers a `beforeunload` listener that warns the user when they try to
 * leave/refresh the page while unsaved message edits exist in the session.
 *
 * Only active when `selectSessionHasUnsavedChanges` is true.
 */
export function useUnsavedChangesGuard(sessionId: string) {
  const hasUnsavedChanges = useAppSelector((state) =>
    selectSessionHasUnsavedChanges(state, sessionId),
  );

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);
}
