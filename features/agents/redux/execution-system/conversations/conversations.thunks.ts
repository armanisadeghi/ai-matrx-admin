import type { AppThunk } from "@/lib/redux/store";
import {
  destroyInstance,
  destroyInstancesForAgent,
} from "./conversations.slice";

/**
 * Destroys a conversation only when debug-session mode is NOT active.
 * Use this everywhere instead of dispatching `destroyInstance` directly —
 * it ensures debug-retained sessions are never accidentally wiped.
 */
export const destroyInstanceIfAllowed =
  (conversationId: string): AppThunk =>
  (dispatch, getState) => {
    if (getState().conversations.debugSessionActive) return;
    dispatch(destroyInstance(conversationId));
  };

/**
 * Destroys all conversations for an agent only when debug-session mode is
 * NOT active.
 */
export const destroyInstancesForAgentIfAllowed =
  (agentId: string): AppThunk =>
  (dispatch, getState) => {
    if (getState().conversations.debugSessionActive) return;
    dispatch(destroyInstancesForAgent(agentId));
  };
