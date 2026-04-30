"use client";

import React from "react";

import { JsonInspector } from "@/components/official-candidate/json-inspector/JsonInspector";
import {
  TAB_INDEX_ID,
  useTabNavigation,
} from "@/components/admin/state-analyzer/stateViewerTabs";

const GenericSliceViewer = ({
  sliceKey,
  state,
}: {
  sliceKey: string;
  state: unknown;
}) => {
  const navigate = useTabNavigation();

  return (
    <JsonInspector
      data={state}
      onBack={navigate ? () => navigate(TAB_INDEX_ID) : undefined}
      backLabel="Back to Tab Index"
    />
  );
};

export default GenericSliceViewer;
