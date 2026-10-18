import type { AgentRunWindowDefinitionData } from "./agentRunWindow.overlay";
import { getRestorableResourceId } from "./link-helpers";
import { dispatchThunk } from "@/lib/redux/hooks";
import { patchConversation } from "@ai-matrx/chat/agents/redux/execution-system/conversations/conversations.slice";
import { DISPLAY_MODE_TO_OVERLAY_ID } from "@ai-matrx/chat/agents/redux/execution-system/display-mode-overlay";
import { restoreUnsentLaunch } from "@ai-matrx/chat/agents/redux/execution-system/instance-user-input/restore-unsent-launch.thunk";
import { loadConversation } from "@ai-matrx/chat/agents/redux/execution-system/thunks/load-conversation.thunk";
import { followWhatIsStillInFlight } from "@ai-matrx/chat/agents/runtime-reconnect/follow-what-is-still-in-flight";
import { resolveAgentPanelDisplayMode, readAgentPanelSurfaceArg } from "@ai-matrx/chat/window-panels/windows/agents/agentPanelSurfaceAddress";
import { AGENT_RUN_WINDOW_URL_MODE, AGENT_RUN_WINDOW_AGENT_ARG, AGENT_RUN_WINDOW_CONVERSATION_ARG } from "@ai-matrx/chat/window-panels/windows/agents/agentRunWindowAddress";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, args, open }: LinkHydrateContext<AgentRunWindowDefinitionData>) {
    const subject = getRestorableResourceId(id);
    if (!subject) {
      console.warn(
        `[UrlPanelManager] ?panels=agent:${id} names no conversation — ` +
          "expected agent:<conversationId>:m-<mode>.",
      );
      return;
    }

    // The Chat window (`agentRunWindow`) shares this key: it is a WINDOW that
    // hosts conversations, not one conversation's shell, so its subject is its
    // own window instance and the chat it has open rides in the args.
    if (args.m === AGENT_RUN_WINDOW_URL_MODE) {
      dispatch(
        openOverlay({
          overlayId: "agentRunWindow",
          instanceId: subject,
          data: {
            initialAgentId: args[AGENT_RUN_WINDOW_AGENT_ARG] ?? null,
            initialSelectedConversationId:
              args[AGENT_RUN_WINDOW_CONVERSATION_ARG] ?? null,
          },
        }),
      );
      return;
    }

    const conversationId = subject;
    const displayMode = resolveAgentPanelDisplayMode(args.m);
    const overlayId = DISPLAY_MODE_TO_OVERLAY_ID[displayMode];
    if (!overlayId) {
      // A mode with no shell paints nothing. An address that opens nothing has
      // to say so rather than leave a token that looks like it worked.
      console.warn(
        `[UrlPanelManager] ?panels=agent:${id}:m-${args.m} names display mode ` +
          `"${displayMode}", which has no overlay to open.`,
      );
      return;
    }

    // An UNSENT window has no server row to load: rebuild it from the recipe
    // it left in this tab (agent, window, variables, context) under the same
    // id. The launch opens the window itself, and the composer restores the
    // typed text. Only a sent conversation is read from the server.
    if (restoreUnsentLaunch(dispatch, conversationId)) return;

    dispatch(
      openOverlay({
        overlayId,
        instanceId: conversationId,
        data: { conversationId },
      }),
    );

    // `displayOverrides` lands in the SAME dispatch that stamps
    // `metadata.display`, so there is no render in which the stored values are
    // live and the link's are not. Two things are asserted there:
    //   • the display mode the LINK named — it is the more specific intent;
    //   • `autoRun: false` — reopening an address is NEVER a decision to spend
    //     a paid run. Nobody clicked; a refresh must not fire an agent.
    const loading = dispatchThunk(
      dispatch,
      loadConversation({
        conversationId,
        expectMaterialized: true,
        displayOverrides: { displayMode, autoRun: false },
      }),
    );

    // 4. re-bind the page surface the link names (`s-<surface>`), AFTER the
    //    load so the DB-shaped record cannot drop it. Without this the
    //    restored window sent its next turn with no `context` at all — the
    //    stamp is what makes `refreshSurfaceScope` read the page's live values
    //    (agentPanelSurfaceAddress.ts).
    const surfaceName = readAgentPanelSurfaceArg(args);
    if (surfaceName) {
      void Promise.resolve(loading).then(() =>
        dispatch(patchConversation({ conversationId, surfaceName })),
      );
    }

    // 5. follow whatever the server is STILL doing for this conversation —
    //    the same steps every reopen takes after its load
    //    (`useConversationResume`). A reload during the window's first turn
    //    used to stop at the load: the row was not committed yet, the room
    //    stayed empty while the server finished the turn behind it, and the
    //    next send went out as a new conversation and was refused. Run on a
    //    failed load too: a not-yet-readable row is exactly that case.
    const follow = () => followWhatIsStillInFlight(dispatch, conversationId);
    void Promise.resolve(loading).then(follow, follow);
}
