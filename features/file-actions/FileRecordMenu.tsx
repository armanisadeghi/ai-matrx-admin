"use client";

/** Editor File menu: the shared FileMenu without the Share row (Share lives in the header). */

import { FileMenu, type FileMenuProps } from "./FileMenu";

export type FileRecordMenuProps = Omit<FileMenuProps, "trigger" | "shareable" | "shareButton" | "trashed"> & {
  /** The editor menu bar's "File" trigger (Google layout); default the text "File" button. */
  trigger?: FileMenuProps["trigger"];
  /** Google's File menu has Share; the older editor bar kept it in the header only. */
  shareable?: boolean;
};

export function FileRecordMenu({ trigger = "label", shareable = false, ...props }: FileRecordMenuProps) {
  return <FileMenu {...props} trigger={trigger} shareable={shareable} />;
}
