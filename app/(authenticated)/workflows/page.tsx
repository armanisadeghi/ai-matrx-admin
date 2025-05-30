// app/(authenticated)/tests/forms/entity-management-smart-fields/page.tsx
"use client";
import MergedEntityLayout from "@/app/entities/layout/MergedEntityLayout";
import React from "react";
import { getUnifiedLayoutProps } from "@/app/entities/layout/configs";

export default function EntityManagementPage() {
  const entityKey = "workflow";
  const layoutProps = getUnifiedLayoutProps({
    entityKey: entityKey,
    formComponent: "STANDARD", // "DEFAULT" | "STANDARD" | "ARMANI" | "MINIMAL" | "RECORD_SELECT" | "RECORD_MULTI_SELECT"
    quickReferenceType: "LIST", // "cards" | "cardsEnhanced" | "accordion" | "accordionEnhanced" | "list" | "select" | "default" | "LIST_WITH_RELATED"
    density: "normal",
    isExpanded: true,
    handlers: {},
  });


  return (
    <div className="flex-1 p-0 gap-0 ">

      <MergedEntityLayout {...layoutProps} className="h-full" />
    </div>
  );
}
