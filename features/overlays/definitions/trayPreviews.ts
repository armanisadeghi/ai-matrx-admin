/**
 * The app's minimized-window previews (the components stay in the app; the package draws them
 * in the tray chip). Imported for its side effect by the overlay world host.
 */
import { registerTrayPreview } from "@ai-matrx/summon/window-host";
import {
  browserWorkbenchTrayPreview,
  cloudFilesTrayPreview,
  errorInspectorTrayPreview,
  liveRunTrayPreview,
  messagesTrayPreview,
  notesTrayPreview,
  quickTasksTrayPreview,
  scraperTrayPreview,
  shareTrayPreview,
  singleMessageTrayPreview,
  smartCodeEditorTrayPreview,
  transcriptStudioTrayPreview,
} from "@/features/window-panels/registry/tray-previews";

registerTrayPreview("notesWindow", { Preview: notesTrayPreview });
registerTrayPreview("quickTasksWindow", { Preview: quickTasksTrayPreview });
registerTrayPreview("cloudFilesWindow", { Preview: cloudFilesTrayPreview });
registerTrayPreview("scraperWindow", { Preview: scraperTrayPreview });
registerTrayPreview("smartCodeEditorWindow", { Preview: smartCodeEditorTrayPreview });
registerTrayPreview("errorInspectorWindow", { Preview: errorInspectorTrayPreview });
registerTrayPreview("messagesWindow", { Preview: messagesTrayPreview });
registerTrayPreview("singleMessageWindow", { Preview: singleMessageTrayPreview });
registerTrayPreview("browserWorkbenchWindow", { Preview: browserWorkbenchTrayPreview });
registerTrayPreview("shareModalWindow", { Preview: shareTrayPreview });
registerTrayPreview("transcriptStudioWindow", { Preview: transcriptStudioTrayPreview });
registerTrayPreview("liveRunWindow", { Preview: liveRunTrayPreview });
