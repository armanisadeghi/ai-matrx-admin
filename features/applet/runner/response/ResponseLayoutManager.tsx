"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Cog } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectTaskFirstListenerId } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { selectResponseTextByListenerId, selectResponseEndedByListenerId } from "@/lib/redux/socket-io";
import SocketAccordionResponse from "@/components/socket/response/SocketAccordionResponse";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";
import FullscreenWrapper from "@/components/matrx/FullscreenWrapper";
import AppletLayoutManager from "@/features/applet/runner/layouts/AppletLayoutManager";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { hasCoordinator } from "@/components/mardown-display/markdown-classification/markdown-coordinator";
import DirectMarkdownRenderer from "@/components/mardown-display/markdown-classification/DirectMarkdownRenderer";

interface ResponseLayoutManagerProps {
  appletId: string;
  taskId: string;
  coordinatorId: string;
  handleSubmit: () => void;
}

export default function ResponseLayoutManager({ appletId, taskId, coordinatorId, handleSubmit }: ResponseLayoutManagerProps) {
  const [showConfig, setShowConfig] = useState(false);
  const dispatch = useAppDispatch();
  const firstListenerId = useAppSelector((state) => selectTaskFirstListenerId(state, taskId));
  const textResponse = useAppSelector(selectResponseTextByListenerId(firstListenerId));
  const isTaskComplete = useAppSelector(selectResponseEndedByListenerId(firstListenerId));
  const hasCustomView = useMemo(() => hasCoordinator(coordinatorId), [coordinatorId]);

  useEffect(() => {
    if (isTaskComplete) {
        dispatch(brokerActions.setValue({
            brokerId: `response-${appletId}`,
            value: textResponse
        }));
    }
}, [isTaskComplete, textResponse, dispatch]);



  const toggleConfig = () => {
    setShowConfig(prev => !prev);
  };

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

      {isTaskComplete && (
        <div className="flex justify-end mb-10">
          <button 
            onClick={toggleConfig}
            className="p-6 rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Toggle configuration"
          >
            <Cog className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
          </button>
        </div>
      )}

      {showConfig && <SocketAccordionResponse taskId={taskId} />}
    </div>
  );
}
