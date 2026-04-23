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
  { key: "all", href: "/cloud-files", label: "All files" },
  { key: "photos", href: "/cloud-files/photos", label: "Photos" },
  { key: "shared", href: "/cloud-files/shared", label: "Shared" },
  {
    key: "requests",
    href: "/cloud-files/requests",
    label: "File requests",
  },
  { key: "trash", href: "/cloud-files/trash", label: "Deleted files" },
];
