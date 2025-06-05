'use client';

import { ReactFlowProvider } from "reactflow";

export default function WorkflowLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReactFlowProvider>
      {children}
    </ReactFlowProvider>
  );
}
