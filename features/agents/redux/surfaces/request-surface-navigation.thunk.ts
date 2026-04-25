/**
 * requestSurfaceNavigation — surface-agnostic intent for "navigate to this
 * conversation on the surface that triggered this action".
 *
 * Action bars (fork / delete / etc.) call this thunk after the DB write
 * succeeds. The thunk reads the surface registration to decide HOW to
 * route:
 *
 *   - `page`    → write pendingNavigation; the page's effect resolves the
 *                 basePath against its current params and calls
 *                 router.replace, then clears the slot.
 *   - `window`  → dispatch conversation-focus `setFocus` directly. The
 *                 floating window already re-renders on focus changes.
 *   - `widget`  → same as window — focus update only, no URL change.
 *
 * If the surface isn't registered (race during mount, or caller passed an
 * unknown key), this no-ops silently. The caller has already done the DB
 * write; we don't want to throw on a routing miss.
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import { setFocus } from "../execution-system/conversation-focus/conversation-focus.slice";
import {
  setPendingNavigation,
  selectSurfaceRegistration,
  type SurfaceNavigationReason,
} from "./surfaces.slice";

interface RequestSurfaceNavigationArgs {
  surfaceKey: string;
  conversationId: string;
  reason: SurfaceNavigationReason;
}

interface ThunkApi {
  dispatch: AppDispatch;
  state: RootState;
}

export const requestSurfaceNavigation = createAsyncThunk<
  void,
  RequestSurfaceNavigationArgs,
  ThunkApi
>(
  "surfaces/requestNavigation",
  async ({ surfaceKey, conversationId, reason }, { dispatch, getState }) => {
    const registration = selectSurfaceRegistration(surfaceKey)(getState());

    if (!registration) {
      // No-op silently — surface may have unmounted between the action and
      // the navigation request. The DB write already succeeded; nothing to
      // surface to the user.
      return;
    }

    if (registration.kind === "page") {
      dispatch(
        setPendingNavigation({ surfaceKey, conversationId, reason }),
      );
      return;
    }

    // Window / widget consumers — push the new conversationId into the
    // existing focus registry. They re-render reactively.
    dispatch(setFocus({ surfaceKey, conversationId }));
  },
);
