"use client";

import React from "react";
import { getUnifiedLayoutProps } from "@/app/entities/layout/configs";
import { SingleEntityLayout } from "@/app/entities/layout/SingleEntityLayout";

export default function EntityManagementPage() {
  const entityKey = "recipe";
  const layoutProps = getUnifiedLayoutProps({
    entityKey: entityKey,
    formComponent: "ARMANI_LAYOUT",
    quickReferenceType: "LIST",
    density: "normal",
    isExpanded: true,
    handlers: {},
  });


  return (
    <div className="flex-1 p-0 gap-0 bg-background">

      <SingleEntityLayout {...layoutProps} className="h-full" />
    </div>
  );
}
