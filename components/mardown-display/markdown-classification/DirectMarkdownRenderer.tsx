"use client";

import { useState, useEffect } from "react";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { useAppDispatch } from "@/lib/redux/hooks";
import { prepareMarkdownForRendering } from "./markdown-processing-utils";
import { ViewId } from "./custom-views/view-registry";
import ViewRenderer from "./custom-views/ViewRenderer";
import { getDefaultViewId } from "./markdown-coordinator";

interface DirectMarkdownRendererProps {
    markdown: string;
    coordinatorId: string;
    viewId?: ViewId | "default";
    className?: string;
    source?: string;
    sourceId?: string;
    isLoading?: boolean;
}

const DirectMarkdownRenderer = ({
    markdown,
    coordinatorId,
    viewId = "default",
    className = "",
    source,
    sourceId,
    isLoading = false,
}: DirectMarkdownRendererProps) => {
    const [processedData, setProcessedData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [viewInfo, setViewInfo] = useState<any>(null);
    const dispatch = useAppDispatch();

    // Resolve the actual view ID if 'default' is specified
    const resolvedViewId = viewId === "default" 
        ? getDefaultViewId(coordinatorId) as ViewId 
        : viewId as ViewId;

    useEffect(() => {
        if (!markdown || !coordinatorId) {
            return;
        }

        setError(null);

        async function processMarkdown() {
            try {
                const result = await prepareMarkdownForRendering(markdown, coordinatorId, resolvedViewId);
                setProcessedData(result.processedData);
                setViewInfo({
                    coordinatorDefinition: result.coordinatorDefinition,
                    viewComponentInfo: result.viewComponentInfo
                });
            } catch (err) {
                console.error(`[DirectMarkdownRenderer] Processing error for ${coordinatorId}:`, err);
                setError(`Error processing markdown: ${err instanceof Error ? err.message : String(err)}`);
            }
        }

        processMarkdown();
    }, [markdown, coordinatorId, resolvedViewId]);

    useEffect(() => {
        if (source && sourceId && processedData && viewInfo) {
            // Dispatch the main data broker
            dispatch(
                brokerActions.setValue({
                    brokerId: `${coordinatorId}-${sourceId}`,
                    value: processedData.extracted,
                })
            );

            // Only dispatch miscellaneous data if it exists and has content
            if (processedData.miscellaneous) {
                const hasMiscContent = Array.isArray(processedData.miscellaneous)
                    ? processedData.miscellaneous.length > 0
                    : typeof processedData.miscellaneous === "object"
                    ? Object.keys(processedData.miscellaneous).length > 0
                    : Boolean(processedData.miscellaneous);

                if (hasMiscContent) {
                    dispatch(
                        brokerActions.setValue({
                            brokerId: `${coordinatorId}-${sourceId}-miscellaneous`,
                            value: processedData.miscellaneous,
                        })
                    );
                }
            }
        }
    }, [source, sourceId, processedData, viewInfo, dispatch, coordinatorId]);

    if (error) {
        return <div className={`text-red-600 dark:text-red-400 ${className}`}>{error}</div>;
    }

    if (!processedData || !viewInfo) {
        return null;
    }

    // Use the ViewRenderer component to handle view resolution and rendering
    const { viewComponentInfo } = viewInfo;
    return (
        <ViewRenderer
            requestedViewId={resolvedViewId}
            availableViews={viewComponentInfo.availableViews}
            defaultViewId={viewComponentInfo.defaultViewId}
            data={processedData}
            coordinatorId={coordinatorId}
            className={className}
            isLoading={isLoading}
        />
    );
};

export default DirectMarkdownRenderer;
