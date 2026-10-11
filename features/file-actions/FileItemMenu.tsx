"use client";

/** List-row menu: Share button + the shared FileMenu. */

import { FileMenu, type FileMenuProps } from "./FileMenu";

export type FileItemMenuProps = Omit<FileMenuProps, "shareButton" | "trigger" | "shareable">;

export function FileItemMenu(props: FileItemMenuProps) {
  return <FileMenu {...props} shareButton />;
}
