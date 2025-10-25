// /layout.tsx
"use client";

import React from "react";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import ReduxLogViewer from "@/utils/logger/components/ReduxLogViewer";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <MatrxDynamicPanel
        initialPosition="left"
        defaultExpanded={false}
        expandButtonProps={{
          label: "Redux Logs",
        }}
      >
        <ReduxLogViewer />
      </MatrxDynamicPanel>

      <main className="flex-1">{children}</main>
    </div>
  );
}
