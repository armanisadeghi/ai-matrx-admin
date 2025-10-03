"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectTaskFirstListenerId } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { selectResponseTextByListenerId, selectResponseEndedByListenerId, selectResponseDataByListenerId } from "@/lib/redux/socket-io";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import EnhancedChatMarkdown from "@/components/mardown-display/chat-markdown/EnhancedChatMarkdown";
import FullscreenWrapper from "@/components/matrx/FullscreenWrapper";
import AppletLayoutManager from "@/features/applet/runner/layouts/AppletLayoutManager";
import AppletPostActionButtons from "./AppletPostActionButtons";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { hasCoordinator } from "@/components/mardown-display/markdown-classification/markdown-coordinator";
import DirectMarkdownRenderer from "@/components/mardown-display/markdown-classification/DirectMarkdownRenderer";
import { AppletLayoutOption } from "@/types";
import HtmlPreviewFullScreenEditor from "@/features/html-pages/components/HtmlPreviewFullScreenEditor";
import { removeThinkingContent } from "@/components/matrx/buttons/markdown-copy-utils";
import { useHtmlPreviewState } from "@/features/html-pages/components/useHtmlPreviewState";

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
    const user = useAppSelector(selectUser);
    const firstListenerId = useAppSelector((state) => selectTaskFirstListenerId(state, taskId));
    const textResponse = useAppSelector(selectResponseTextByListenerId(firstListenerId));
    const dataResponse = useAppSelector(selectResponseDataByListenerId(firstListenerId));
    const isTaskComplete = useAppSelector(selectResponseEndedByListenerId(firstListenerId));
    const hasCustomView = useMemo(() => hasCoordinator(coordinatorId), [coordinatorId]);

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editedContent, setEditedContent] = useState(textResponse);

    // Initialize the HTML preview state hook at parent level to preserve state between opens
    const htmlPreviewState = useHtmlPreviewState({
        isOpen: isEditorOpen,
        markdownContent: editedContent,
        user,
    });

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

    useEffect(() => {
        if (!textResponse) return;
        if (isTaskComplete) {
            setEditedContent(removeThinkingContent(textResponse));
        }
    }, [isTaskComplete, textResponse]);

    const handleSaveEdit = (newContent: string) => {
        setEditedContent(newContent);
        setIsEditorOpen(false);
    };

    const handleCancelEdit = () => {
        setIsEditorOpen(false);
    };

    const handleOpenEditor = () => {
        setIsEditorOpen(true);
    };

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
                            <EnhancedChatMarkdown
                                content={textResponse}
                                type="message"
                                role="assistant"
                                className="bg-slate-50 dark:bg-slate-900"
                                isStreamActive={!isTaskComplete}
                            />
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
                    {isTaskComplete && (
                        <div className="w-full max-w-4xl mx-auto px-4">
                            <AppletPostActionButtons appletId={appletId} taskId={taskId} content={textResponse} data={dataResponse} handleEdit={allowEditing ? handleOpenEditor : null} />
                        </div>
                    )}
                </FullscreenWrapper>
            </div>
            {isEditorOpen && editedContent && (
                <HtmlPreviewFullScreenEditor
                    isOpen={isEditorOpen}
                    onClose={handleCancelEdit}
                    htmlPreviewState={htmlPreviewState}
                    title="Edit Response"
                    description="Edit the response markdown and preview/publish as HTML"
                    onSave={handleSaveEdit}
                    showSaveButton={true}
                />
            )}
        </div>
    );
}
