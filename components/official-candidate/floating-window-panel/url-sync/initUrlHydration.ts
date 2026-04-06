import { registerPanelHydrator } from "./UrlPanelRegistry";
import { setDisplayMode } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";

/**
 * Register all known panel URL hydrators.
 * This runs exactly once on client mount.
 */
export function initUrlHydration() {
  // Agent execution floating panels
  registerPanelHydrator("agent", (dispatch, id, args) => {
    dispatch(
      setDisplayMode({
        instanceId: id,
        mode:
          (args.m as "floating-chat" | "modal-full" | "panel") ||
          "floating-chat",
      }),
    );
  });

  // Voice Pad global panel
  registerPanelHydrator("voice", (dispatch) => {
    dispatch(openOverlay({ overlayId: "voicePad" }));
  });

  // Quick notes global panel
  registerPanelHydrator("notes", (dispatch) => {
    dispatch(openOverlay({ overlayId: "quickNotes" }));
  });

  // Feedback global panel
  registerPanelHydrator("feedback", (dispatch) => {
    dispatch(openOverlay({ overlayId: "feedbackDialog" }));
  });

  // JSON Truncator
  registerPanelHydrator("json_truncator", (dispatch) => {
    dispatch(openOverlay({ overlayId: "jsonTruncator" }));
  });

  // Quick tasks
  registerPanelHydrator("tasks", (dispatch) => {
    dispatch(openOverlay({ overlayId: "quickTasks" }));
  });

  // Quick data
  registerPanelHydrator("data", (dispatch) => {
    dispatch(openOverlay({ overlayId: "quickData" }));
  });

  // Quick files
  registerPanelHydrator("files", (dispatch) => {
    dispatch(openOverlay({ overlayId: "quickFiles" }));
  });

  // State Analyzer
  registerPanelHydrator("state_analyzer", (dispatch) => {
    dispatch(openOverlay({ overlayId: "adminStateAnalyzer" }));
  });
}
