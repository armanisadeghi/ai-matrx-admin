/**
 * features/files/components/surfaces/dropbox/section.ts
 *
 * Section identifiers for the Dropbox-style cloud-files shell. One value per
 * primary route so `PageShell` can render every sibling page from the same
 * layout.
 */

export type CloudFilesSection =
  | "all"
  | "folders"
  | "folders-root"
  | "photos"
  | "recents"
  | "shared"
  | "requests"
  | "trash"
  | "starred"
  | "activity";

export interface SectionNavEntry {
  key: CloudFilesSection;
  href: string;
  label: string;
}

export const PRIMARY_SECTIONS: SectionNavEntry[] = [
  // Labeled "Home" because the section renders root-level items only.
  // Recents/Starred surface deeper files through dedicated selectors.
  { key: "all", href: "/cloud-files", label: "Home" },
  { key: "recents", href: "/cloud-files/recents", label: "Recents" },
  { key: "photos", href: "/cloud-files/photos", label: "Photos" },
  { key: "shared", href: "/cloud-files/shared", label: "Shared" },
  {
    key: "requests",
    href: "/cloud-files/requests",
    label: "File requests",
  },
  { key: "trash", href: "/cloud-files/trash", label: "Deleted files" },
];
