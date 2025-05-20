"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectTaskFirstListenerId } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { selectResponseTextByListenerId, selectResponseEndedByListenerId } from "@/lib/redux/socket-io";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";
import FullscreenWrapper from "@/components/matrx/FullscreenWrapper";
import AppletLayoutManager from "@/features/applet/runner/layouts/AppletLayoutManager";
import { brokerActions, brokerSelectors } from "@/lib/redux/brokerSlice";
import { hasCoordinator } from "@/components/mardown-display/markdown-classification/markdown-coordinator";
import DirectMarkdownRenderer from "@/components/mardown-display/markdown-classification/DirectMarkdownRenderer";
import AdminToolsMenu from "./AdminToolsMenu";

interface ResponseLayoutManagerProps {
  appletId: string;
  taskId: string;
  coordinatorId: string;
  handleSubmit: () => void;
}

export const ADMIN_USER_IDS = [
  "4cf62e4e-2679-484f-b652-034e697418df",
  "8f7f17ba-935b-4967-8105-7c6b554f41f1",
  "6555aa73-c647-4ecf-8a96-b60e315b6b18",
];


export default function ResponseLayoutManager({ appletId, taskId, coordinatorId, handleSubmit }: ResponseLayoutManagerProps) {
  const dispatch = useAppDispatch();
  const firstListenerId = useAppSelector((state) => selectTaskFirstListenerId(state, taskId));
  const textResponse = useAppSelector(selectResponseTextByListenerId(firstListenerId));
  const isTaskComplete = useAppSelector(selectResponseEndedByListenerId(firstListenerId));
  const hasCustomView = useMemo(() => hasCoordinator(coordinatorId), [coordinatorId]);

  const userIsCreator = useAppSelector((state) => brokerSelectors.selectValue(state, "APPLET_USER_IS_ADMIN"));
  const isAdmin = useAppSelector((state) => brokerSelectors.selectValue(state, "GLOBAL_USER_IS_ADMIN"));

  useEffect(() => {
    if (isTaskComplete) {
        dispatch(brokerActions.setValue({
            brokerId: `response-${appletId}`,
            value: textResponse
        }));
    }
}, [isTaskComplete, textResponse, dispatch, appletId]);

  return (
    <div className="w-full overflow-y-auto px-2 h-full space-y-2 scrollbar-none">
      <AppletLayoutManager
        appletId={appletId}
        layoutTypeOverride="flat-accordion"
        initialExpanded={false}
        handleSubmit={handleSubmit}
      />
      <FullscreenWrapper
        buttonPosition="top-right-inside"
        expandButtonTitle="View in fullscreen"
        closeButtonTitle="Exit fullscreen"
      >
        <div className="w-full max-w-4xl mx-auto p-4">
          {/* For regular markdown or non-custom views */}
          {!hasCustomView && (
            <MarkdownRenderer content={textResponse} type="message" className="bg-slate-50 dark:bg-slate-900" />
          )}

          {/* For custom views - always show the DirectMarkdownRenderer but pass isLoading */}
          {hasCustomView && (
            <DirectMarkdownRenderer 
              markdown={textResponse} 
              coordinatorId={coordinatorId}
              className="bg-slate-50 dark:bg-slate-900" 
              isLoading={!isTaskComplete}
              source="applet"
              sourceId={appletId}
            />
          )}
        </div>
      </FullscreenWrapper>

      {isTaskComplete && (userIsCreator || isAdmin) && (
        <div className="fixed right-4 top-1/3 z-10">
          <AdminToolsMenu
            taskId={taskId}
            initialMarkdown={textResponse}
          />
        </div>
      )}
    </div>
  );
}
