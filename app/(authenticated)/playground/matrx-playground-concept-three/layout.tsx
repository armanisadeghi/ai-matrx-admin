// /layout.tsx
"use  client";

import { StructuredEditorProvider } from "@/app/contexts/StructuredEditorContext";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <StructuredEditorProvider>{children}</StructuredEditorProvider>;
}
