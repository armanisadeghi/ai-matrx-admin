"use client";

import { useState, useEffect, useMemo } from "react";
import { Suspense } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { processMarkdownWithConfig } from "./processors/json-config-system/config-processor";
import { configRegistry } from "./processors/json-config-system/config-registry";
import { getConfigTypeFromKey, getViewForConfig, getViewLoadingComponent } from "./custom-views/registry";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { useAppDispatch } from "@/lib/redux/hooks";
import { processExtractors } from "./processors/json-config-system/extractor-utils";

interface DirectMarkdownRendererProps {
    markdown: string;
    configKey: string;
    viewType?: string;
    className?: string;
    isLoading?: boolean;
    source?: string;
    sourceId?: string;
}

const DirectMarkdownRenderer = ({
    markdown,
    configKey,
    viewType = "default",
    className = "",
    isLoading = false,
    source,
    sourceId,
}: DirectMarkdownRendererProps) => {
    const [processedData, setProcessedData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [lastMarkdown, setLastMarkdown] = useState<string>("");
    const [timeUnchanged, setTimeUnchanged] = useState<number>(0);
    const [failsafeTriggered, setFailsafeTriggered] = useState<boolean>(false);
    const dispatch = useAppDispatch();

    const configType = useMemo(() => getConfigTypeFromKey(configKey), [configKey]);

    useEffect(() => {
        if (source && sourceId && processedData && processedData.extracted) {
            // Dispatch the main data broker
            dispatch(
                brokerActions.setValue({
                    brokerId: `${configType}-${sourceId}`,
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
                            brokerId: `${configType}-${sourceId}-miscellaneous`,
                            value: processedData.miscellaneous,
                        })
                    );
                }
            }

            // Process any extractors defined in the view
            const viewEntry = configType ? getViewForConfig(configType, viewType) : null;
            if (viewEntry && viewEntry.extractors) {
                // Wrap processedData in a data object to match extractor paths
                processExtractors({ data: processedData }, viewEntry.extractors, dispatch, sourceId);
            }
        }
    }, [source, sourceId, processedData, dispatch, configType, viewType]);

    useEffect(() => {
        if (markdown === lastMarkdown) {
            setTimeUnchanged((prev) => {
                const newTime = prev + 1;
                if (newTime >= 3 && !failsafeTriggered && isLoading) {
                    console.warn(
                        "[DirectMarkdownRenderer] Failsafe triggered: Markdown content unchanged for 3 seconds while still loading. Rendering anyway due to known socket task bug where end message is not sent. Please fix this issue."
                    );
                    setFailsafeTriggered(true);
                    return 0;
                }
                return newTime;
            });
        } else {
            setLastMarkdown(markdown);
            setTimeUnchanged(0);
            setFailsafeTriggered(false);
        }

        if (isLoading || !markdown || !configKey || failsafeTriggered) {
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            const config = configRegistry[configKey]?.config;
            if (!config) {
                setError(`Configuration '${configKey}' not found`);
                setProcessing(false);
                return;
            }

            setTimeout(() => {
                try {
                    const processor = unified().use(remarkParse).use(remarkGfm);
                    const tree = processor.parse(markdown);

                    const result = processMarkdownWithConfig({
                        ast: tree as any,
                        config,
                    });

                    setProcessedData(result);
                    setProcessing(false);
                } catch (err) {
                    console.error(`[DirectMarkdownRenderer] Processing error for ${configKey}:`, err);
                    setError(`Error processing markdown: ${err instanceof Error ? err.message : String(err)}`);
                    setProcessing(false);
                }
            }, 50);
        } catch (err) {
            console.error(`[DirectMarkdownRenderer] Config error for ${configKey}:`, err);
            setError(`Error processing markdown: ${err instanceof Error ? err.message : String(err)}`);
            setProcessing(false);
        }
    }, [markdown, configKey, isLoading, configType, viewType, lastMarkdown, failsafeTriggered]);

    if (error) {
        console.error(`[DirectMarkdownRenderer] Rendering error for ${configKey}:`, error);
        return <div className={`text-red-600 dark:text-red-400 ${className}`}>{error}</div>;
    }

    const viewEntry = configType ? getViewForConfig(configType, viewType) : null;

    if (!viewEntry) {
        console.error(`[DirectMarkdownRenderer] View not found for ${configKey}:`, { configType, viewType });
        return (
            <div className={`text-red-600 dark:text-red-400 ${className}`}>
                View not found for configuration type: {configType}, view type: {viewType}
            </div>
        );
    }

    if (isLoading || processing || (!processedData && !failsafeTriggered)) {
        const LoadingComponent = getViewLoadingComponent(configType, viewType);
        return (
            <div className={className}>
                <LoadingComponent />
            </div>
        );
    }

    if (!processedData || !processedData.extracted) {
        console.error(`[DirectMarkdownRenderer] Invalid data for ${configKey}:`, { processedData });
        return (
            <div className={`text-red-600 dark:text-red-400 ${className}`}>
                Invalid data format. Expected an object with an 'extracted' property.
            </div>
        );
    }

    const ViewComponent = viewEntry.component;
    const LoadingComponent = getViewLoadingComponent(configType, viewType);

    return (
        <div className={className}>
            <Suspense
                fallback={
                    <div className={className}>
                        <LoadingComponent />
                    </div>
                }
            >
                <ViewComponent data={processedData} />
            </Suspense>
        </div>
    );
};

export default DirectMarkdownRenderer;
