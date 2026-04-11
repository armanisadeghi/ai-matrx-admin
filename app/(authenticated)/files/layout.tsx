import React from "react";
import { createRouteMetadata } from "@/utils/route-metadata";
import { ClientFilesLayout } from "./ClientFilesLayout";

export const metadata = createRouteMetadata("/files", {
  title: "Files",
  description:
    "Manage and organize your files with our powerful file management system",
  additionalMetadata: {
    keywords: [
      "files",
      "file management",
      "storage",
      "documents",
      "media",
      "upload",
    ],
  },
});

export default function FilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientFilesLayout>{children}</ClientFilesLayout>;
}
