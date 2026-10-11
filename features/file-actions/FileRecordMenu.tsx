"use client";

/** Editor File menu: the shared FileMenu without the Share row (Share lives in the header). */

import { FileMenu, type FileMenuProps } from "./FileMenu";

export type FileRecordMenuProps = Omit<FileMenuProps, "trigger" | "shareable" | "shareButton" | "trashed">;

export function FileRecordMenu(props: FileRecordMenuProps) {
  return <FileMenu {...props} trigger="label" shareable={false} />;
}
