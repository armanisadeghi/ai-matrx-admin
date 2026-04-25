"use client";

/**
 * ForkOutcomeToast — sonner-based "fork created, where do you want to go?"
 * affordance.
 *
 * The fork has already happened by the time we show this. The toast offers
 * the user two next actions:
 *   • "Go to new branch" (primary) — dispatches `requestSurfaceNavigation`
 *     so whatever surface kicked off the fork (page, window, widget) does
 *     the right kind of update.
 *   • "Stay here" (cancel) — dismisses the toast. The new branch is still
 *     reachable from the conversation sidebar.
 *
 * Why a toast rather than a blocking dialog: forking is reversible (the
 * user can delete the new conversation), the user is mid-flow, and the
 * choice is between two non-destructive states. A toast keeps the user
 * oriented without breaking their attention.
 */

import { toast } from "sonner";
import type { AppDispatch } from "@/lib/redux/store";
import { requestSurfaceNavigation } from "@/features/agents/redux/surfaces/request-surface-navigation.thunk";

export interface ShowForkOutcomeToastArgs {
  dispatch: AppDispatch;
  surfaceKey: string;
  newConversationId: string;
}

export function showForkOutcomeToast({
  dispatch,
  surfaceKey,
  newConversationId,
}: ShowForkOutcomeToastArgs): void {
  toast("Branch created", {
    description: "Everything up to this message was duplicated.",
    duration: 8000,
    action: {
      label: "Go to new branch",
      onClick: () => {
        void dispatch(
          requestSurfaceNavigation({
            surfaceKey,
            conversationId: newConversationId,
            reason: "fork",
          }),
        );
      },
    },
    cancel: {
      label: "Stay here",
      onClick: () => {
        // No-op — toast dismisses itself. User stays on the source
        // conversation; the new branch is still reachable via the sidebar.
      },
    },
  });
}
