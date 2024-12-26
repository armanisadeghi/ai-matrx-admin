// /layout.tsx
"use client";

import React from "react";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";

import { FileSystemProvider } from "@/lib/redux/fileSystem/Provider";
import ReduxLogViewer from "@/utils/logger/components/ReduxLogViewer";

export default function Layout({ children }: { children: React.ReactNode }) {
    const allowedBuckets = ["userContent", "Audio", "Images", "Documents", "Code", "any-file"] as const;

  return (
    <FileSystemProvider 
    initialBucket="any-file"
    allowedBuckets={allowedBuckets}
  >

    <div className="flex flex-col h-full">
      <MatrxDynamicPanel
        initialPosition="left"
        defaultExpanded={true}
        expandButtonProps={{
          label: "Redux Logs",
        }}
      >
        <ReduxLogViewer />
      </MatrxDynamicPanel>

      <main className="flex-1">{children}</main>
    </div>
    </FileSystemProvider>

  );
}
