/**
 * features/files/components/surfaces/dropbox/index.ts
 *
 * Barrel for the Dropbox-styled shell pieces. Only the PageShell surface
 * above consumes these — don't import from here in other features.
 */

export { AccessBadge } from "./AccessBadge";
export { ContentHeader } from "./ContentHeader";
export { EmptyState } from "./EmptyState";
export { FileGrid } from "./FileGrid";
export { FileGridCell } from "./FileGridCell";
export { FileTable } from "./FileTable";
export { FileTableRow } from "./FileTableRow";
export { FilterChips } from "./FilterChips";
export type { FilterChipKey } from "./FilterChips";
export { FolderIconWithMembers } from "./FolderIconWithMembers";
export { IconRail } from "./IconRail";
export { NavSidebar } from "./NavSidebar";
export { NavSidebarFlatFolders } from "./NavSidebarFlatFolders";
export { NewMenu } from "./NewMenu";
export { SharedAvatarStack } from "./SharedAvatarStack";
export {
  SidebarModeProvider,
  SidebarModeToggle,
  SIDEBAR_MODE_COOKIE,
  useSidebarMode,
} from "./SidebarModeToggle";
export type { SidebarMode } from "./SidebarModeToggle";
export { TopBar } from "./TopBar";
export { ViewModeToggle } from "./ViewModeToggle";
export { PRIMARY_SECTIONS } from "./section";
export type { CloudFilesSection, SectionNavEntry } from "./section";
