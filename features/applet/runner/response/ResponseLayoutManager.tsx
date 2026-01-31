"use client";

import React, { useMemo, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectTaskFirstListenerId } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import {
    selectResponseTextByListenerId,
    selectResponseEndedByListenerId,
    selectResponseDataByListenerId,
    selectResponseInfoByListenerId,
    selectResponseErrorsByListenerId,
} from "@/lib/redux/socket-io";
import MarkdownStream from "@/components/MarkdownStream";
import FullscreenWrapper from "@/components/matrx/FullscreenWrapper";
import AppletLayoutManager from "@/features/applet/runner/layouts/AppletLayoutManager";
import AppletPostActionButtons from "./AppletPostActionButtons";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { hasCoordinator } from "@/components/mardown-display/markdown-classification/markdown-coordinator";
import DirectMarkdownRenderer from "@/components/mardown-display/markdown-classification/DirectMarkdownRenderer";
import { AppletLayoutOption } from "@/types/customAppTypes";

interface ResponseLayoutManagerProps {
    appletId: string;
    appSlug: string;
    taskId: string;
    coordinatorId: string;
    handleSubmit: () => void;
    isPreview?: boolean;
    responseLayoutTypeOverride?: AppletLayoutOption;
    allowEditing?: boolean;
}

export default function ResponseLayoutManager({
    appletId,
    appSlug,
    taskId,
    coordinatorId,
    handleSubmit,
    isPreview = false,
    responseLayoutTypeOverride = "flat-accordion",
    allowEditing = false,
}: ResponseLayoutManagerProps) {
    const dispatch = useAppDispatch();
    const firstListenerId = useAppSelector((state) => selectTaskFirstListenerId(state, taskId));
    const textResponse = useAppSelector(selectResponseTextByListenerId(firstListenerId));
    const dataResponse = useAppSelector(selectResponseDataByListenerId(firstListenerId));
    const infoResponse = useAppSelector(selectResponseInfoByListenerId(firstListenerId));
    const errorsResponse = useAppSelector(selectResponseErrorsByListenerId(firstListenerId));
    const isTaskComplete = useAppSelector(selectResponseEndedByListenerId(firstListenerId));
    const hasCustomView = useMemo(() => hasCoordinator(coordinatorId), [coordinatorId]);

    useEffect(() => {
        console.log("===> [RESPONSE LAYOUT MANAGER] Errors response:", JSON.stringify(errorsResponse, null, 2));
    }, [errorsResponse]);

    useEffect(() => {
        console.log("===> [RESPONSE LAYOUT MANAGER] Info response:", JSON.stringify(infoResponse, null, 2));
    }, [infoResponse]);

    useEffect(() => {
        if (coordinatorId) {
            dispatch(
                brokerActions.setValue({
                    brokerId: `APPLET_COORDINATOR_ID`,
                    value: coordinatorId,
                })
            );
        }
    }, [coordinatorId, dispatch]);

    useEffect(() => {
        if (isPreview) {
            dispatch(
                brokerActions.setValue({
                    brokerId: `APPLET_PREVIEW_MODE`,
                    value: true,
                })
            );
        }
    }, [isPreview, dispatch, appletId]);

    useEffect(() => {
        if (isTaskComplete) {
            dispatch(
                brokerActions.setValue({
                    brokerId: `APPLET_RESPONSE_${appletId}`,
                    value: textResponse,
                })
            );
        }
    }, [isTaskComplete, textResponse, dispatch, appletId]);

    return (
        <div className="w-full overflow-y-auto px-2 h-full space-y-2 scrollbar-none pb-12">
            <AppletLayoutManager
                appletId={appletId}
                appSlug={appSlug}
                layoutTypeOverride={responseLayoutTypeOverride}
                initialExpanded={false}
                handleSubmit={handleSubmit}
                isPreview={isPreview}
            />
            <div className="space-y-6">
                <FullscreenWrapper
                    buttonPosition="top-right-inside"
                    expandButtonTitle="View in fullscreen"
                    closeButtonTitle="Exit fullscreen"
                >
                    <div className="w-full max-w-4xl mx-auto p-4">
                        {/* For regular markdown or non-custom views */}
                        {!hasCustomView && (
                            <MarkdownStream
                                content={textResponse}
                                taskId={taskId}
                                type="message"
                                role="assistant"
                                className="bg-textured"
                                isStreamActive={!isTaskComplete}
                                hideCopyButton={true}
                            />
                        )}

                        {/* For custom views - always show the DirectMarkdownRenderer but pass isLoading */}
                        {hasCustomView && (
                            <DirectMarkdownRenderer
                                markdown={textResponse}
                                coordinatorId={coordinatorId}
                                className="bg-textured"
                                isLoading={!isTaskComplete}
                                source="applet"
                                sourceId={appletId}
                            />
                        )}
                    </div>
                    {isTaskComplete && (
                        <div className="w-full max-w-4xl mx-auto px-4">
                            <AppletPostActionButtons
                                appletId={appletId}
                                taskId={taskId}
                                content={textResponse}
                                data={dataResponse}
                                handleEdit={allowEditing ? () => {} : null}
                            />
                        </div>
                    )}
                </FullscreenWrapper>
            </div>
        </div>
    );
}
