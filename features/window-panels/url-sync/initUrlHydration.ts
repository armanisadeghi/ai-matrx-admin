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
        conversationId: id,
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

  // Notes Window
  registerPanelHydrator("notes", (dispatch) => {
    dispatch(openOverlay({ overlayId: "notesWindow" }));
  });

  // Feedback Window
  registerPanelHydrator("feedback", (dispatch) => {
    dispatch(openOverlay({ overlayId: "feedbackDialog" }));
  });

  // JSON Truncator
  registerPanelHydrator("json_truncator", (dispatch) => {
    dispatch(openOverlay({ overlayId: "jsonTruncator" }));
  });

  // Quick Tasks Window
  registerPanelHydrator("quick_tasks", (dispatch) => {
    dispatch(openOverlay({ overlayId: "quickTasksWindow" }));
  });

  // Quick Data Window
  registerPanelHydrator("quick_data", (dispatch) => {
    dispatch(openOverlay({ overlayId: "quickDataWindow" }));
  });

  // Quick Files Window
  registerPanelHydrator("files", (dispatch) => {
    dispatch(openOverlay({ overlayId: "quickFilesWindow" }));
  });

  // State Analyzer Window
  registerPanelHydrator("state_analyzer", (dispatch) => {
    dispatch(openOverlay({ overlayId: "adminStateAnalyzerWindow" }));
  });

  // AI Voice Window
  registerPanelHydrator("aiVoiceWindow", (dispatch) => {
    dispatch(openOverlay({ overlayId: "aiVoiceWindow" }));
  });

  // Gallery Window
  registerPanelHydrator("gallery", (dispatch) => {
    dispatch(openOverlay({ overlayId: "galleryWindow" }));
  });

  // News Window
  registerPanelHydrator("news", (dispatch) => {
    dispatch(openOverlay({ overlayId: "newsWindow" }));
  });

  // User Preferences Window
  registerPanelHydrator("user_preferences", (dispatch) => {
    dispatch(openOverlay({ overlayId: "userPreferencesWindow" }));
  });

  // Share Modal Window
  registerPanelHydrator("share_modal", (dispatch) => {
    dispatch(openOverlay({ overlayId: "shareModalWindow" }));
  });

  // Markdown Editor Window
  registerPanelHydrator("markdown_editor", (dispatch) => {
    dispatch(openOverlay({ overlayId: "markdownEditorWindow" }));
  });

  // Email Dialog Window
  registerPanelHydrator("email_dialog", (dispatch) => {
    dispatch(openOverlay({ overlayId: "emailDialogWindow" }));
  });

  // List Manager Window
  registerPanelHydrator("listManager", (dispatch) => {
    dispatch(openOverlay({ overlayId: "listManagerWindow" }));
  });
}
