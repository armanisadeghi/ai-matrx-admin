"use client";

import { useState, useEffect, useMemo } from "react";
import { Suspense } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { processMarkdownWithConfig } from "./json-config-system/config-processor";
import { configRegistry } from "./json-config-system/config-registry";
import { getConfigTypeFromKey, getViewForConfig, getViewLoadingComponent } from "./custom-views/registry";

interface DirectMarkdownRendererProps {
    markdown: string;
    configKey: string;
    viewType?: string;
    className?: string;
    isLoading?: boolean;
}

const DirectMarkdownRenderer = ({
    markdown,
    configKey,
    viewType = "default",
    className = "",
    isLoading = false,
}: DirectMarkdownRendererProps) => {
    const [processedData, setProcessedData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [lastMarkdown, setLastMarkdown] = useState<string>('');
    const [timeUnchanged, setTimeUnchanged] = useState<number>(0);
    const [failsafeTriggered, setFailsafeTriggered] = useState<boolean>(false);


    const configType = useMemo(() => getConfigTypeFromKey(configKey), [configKey]);

    useEffect(() => {
        if (markdown === lastMarkdown) {
            setTimeUnchanged(prev => {
                const newTime = prev + 1;
                if (newTime >= 3 && !failsafeTriggered && isLoading) {
                    console.warn('[DirectMarkdownRenderer] Failsafe triggered: Markdown content unchanged for 3 seconds while still loading. Rendering anyway due to known socket task bug where end message is not sent. Please fix this issue.');
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
        console.log(`[DirectMarkdownRenderer] Showing loading for ${configKey}:`, { configType, viewType, isLoading, processing, failsafeTriggered });
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
    
    
    // Special handling for candidateProfileStructured to diagnose issue
    if (configKey === 'candidateProfileStructured' && processedData) {

        // Check the expected structure for ModernCandidateProfile
        const expectedKeys = ['name', 'intro', 'key_experiences', 'location', 'compensation', 'availability'];
        const missingKeys = expectedKeys.filter(key => !processedData.extracted[key]);
        
        if (missingKeys.length > 0) {
            console.error('Missing required fields for ModernCandidateProfile:', missingKeys);
        }
        
        if (Array.isArray(processedData.extracted.key_experiences)) {
            console.log('key_experiences is properly formatted as an array with', processedData.extracted.key_experiences.length, 'items');
        } else if (processedData.extracted.key_experiences) {
            console.error('key_experiences is not properly formatted as an array:', typeof processedData.extracted.key_experiences);
        }
        
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
    }
    
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
