import type { OverlayId } from "@/features/window-panels/registry/overlay-ids";
import type { MenuIconKey } from "./menuIconRegistry";

export interface OverlayMenuItemConfig {
  overlayId: OverlayId;
  icon: MenuIconKey;
  label: string;
  className?: string;
}

export const QUICK_ACCESS_ITEMS: OverlayMenuItemConfig[] = [
  { overlayId: "quickNotes", icon: "StickyNote", label: "Quick Note" },
  { overlayId: "quickTasks", icon: "CheckSquare", label: "Quick Task" },
  { overlayId: "quickChat", icon: "MessageSquare", label: "Quick Chat" },
  { overlayId: "quickData", icon: "Database", label: "Quick Data" },
  { overlayId: "cloudFilesWindow", icon: "FolderOpen", label: "Quick Files" },
  { overlayId: "quickChatHistory", icon: "Gem", label: "Chat History" },
  { overlayId: "quickUtilities", icon: "LayoutGrid", label: "Utilities Hub" },
];

export const COMMUNICATION_ITEMS: OverlayMenuItemConfig[] = [
  { overlayId: "announcements", icon: "Megaphone", label: "Announcements" },
  { overlayId: "feedbackDialog", icon: "Bug", label: "Submit Feedback" },
];

export const SETTINGS_ITEMS: OverlayMenuItemConfig[] = [
  { overlayId: "userPreferences", icon: "Settings", label: "Preferences" },
];
