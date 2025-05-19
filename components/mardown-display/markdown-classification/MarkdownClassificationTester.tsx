"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Button } from "@/components/ui";

import { markdownSamples, getAllMarkdownSampleIds } from "./sample-data/markdown-samples";
import { getCoordinatorSelectOptions, getCoordinatorConfig, getSampleDataIds, getDefaultViewId } from "./markdown-coordinator";
import { PROCESSOR_REGISTRY } from "./processors/processor-registry";
import MarkdownInput from "./MarkdownInput";
import MarkdownProcessingTabs from "./MarkdownProcessingTabs";
import { ViewId, getViewSelectOptions } from "./custom-views/view-registry";
import { prepareMarkdownForRendering } from "./markdown-processing-utils";
import { AstNode } from "./processors/types";

interface MarkdownClassificationTesterProps {
    initialMarkdown?: string;
    initialCoordinatorId?: string;
    showSelectors?: boolean;
}

const MarkdownClassificationTester = ({
    initialMarkdown,
    initialCoordinatorId = "candidate_profile",
    showSelectors = true,
}: MarkdownClassificationTesterProps) => {
    const { mode } = useTheme();

    // Main state
    const [markdown, setMarkdown] = useState<string>(initialMarkdown || "");
    const [parsedMarkdown, setParsedMarkdown] = useState<string>(initialMarkdown || "");
    const [ast, setAst] = useState<AstNode | null>(null);
    const [processedData, setProcessedData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Selection state
    const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<string>(initialCoordinatorId);
    const [selectedSampleId, setSelectedSampleId] = useState<string>("");
    const [selectedProcessorId, setSelectedProcessorId] = useState<string>("");
    const [selectedViewId, setSelectedViewId] = useState<ViewId | null>(null);

    // Get all available sample IDs
    const allSampleIds = useMemo(() => {
        return getAllMarkdownSampleIds();
    }, []);

    // Update selected options when coordinator changes
    useEffect(() => {
        const coordinator = getCoordinatorConfig(selectedCoordinatorId);
        if (coordinator) {
            // Set default sample if available
            const sampleIds = getSampleDataIds(selectedCoordinatorId);
            if (sampleIds.length > 0) {
                setSelectedSampleId(sampleIds[0]);
                // Load sample data
                if (markdownSamples[sampleIds[0]]) {
                    const sampleText = markdownSamples[sampleIds[0]];
                    setMarkdown(sampleText);
                    setParsedMarkdown(sampleText);
                }
            }

            // Set default processor
            setSelectedProcessorId(coordinator.processor);

            // Set default view
            const defaultViewId = getDefaultViewId(selectedCoordinatorId);
            if (defaultViewId) {
                setSelectedViewId(defaultViewId);
            }
        }
    }, [selectedCoordinatorId]);

    // Always update preview when markdown changes
    useEffect(() => {
        setParsedMarkdown(markdown);
    }, [markdown]);

    // Process markdown when selections change
    useEffect(() => {
        if (!markdown || !selectedCoordinatorId) return;

        parseMarkdown();
    }, [markdown, selectedCoordinatorId, selectedViewId, selectedProcessorId]);

    async function parseMarkdown() {
        try {
            setIsLoading(true);
            const result = await prepareMarkdownForRendering(markdown, selectedCoordinatorId, selectedViewId as ViewId);

            setAst(result.ast);
            setProcessedData(result.processedData);
        } catch (error) {
            console.error("Error parsing Markdown:", error);
        } finally {
            setIsLoading(false);
        }
    }

    // Handle coordinator change
    function handleCoordinatorChange(value: string) {
        setIsLoading(true);
        setSelectedCoordinatorId(value);
    }

    // Handle sample selection
    function handleSampleSelect(sampleKey: string) {
        setIsLoading(true);
        setSelectedSampleId(sampleKey);
        if (markdownSamples[sampleKey]) {
            const newMarkdown = markdownSamples[sampleKey];
            setMarkdown(newMarkdown);
            setParsedMarkdown(newMarkdown);
        }
    }

    // Handle processor change
    function handleProcessorChange(value: string) {
        setIsLoading(true);
        setSelectedProcessorId(value);
        parseMarkdown();
    }

    // Handle view change
    function handleViewChange(value: ViewId) {
        setIsLoading(true);
        setSelectedViewId(value);
        parseMarkdown();
    }

    // Handle manual parse button click
    function handleParseClick() {
        setIsLoading(true);
        parseMarkdown();
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Controls */}
            {showSelectors && (
                <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex flex-wrap items-center gap-2">
                    {/* Coordinator Selector */}
                    <div className="flex-1 min-w-[200px]">
                        <Select value={selectedCoordinatorId} onValueChange={handleCoordinatorChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a coordinator" />
                            </SelectTrigger>
                            <SelectContent>
                                {getCoordinatorSelectOptions().map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sample Data Selector */}
                    <div className="flex-1 min-w-[200px]">
                        <Select value={selectedSampleId} onValueChange={handleSampleSelect}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a sample" />
                            </SelectTrigger>
                            <SelectContent>
                                {allSampleIds.map((sampleId) => (
                                    <SelectItem key={sampleId} value={sampleId}>
                                        {sampleId.replace(/([A-Z])/g, " $1").trim()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Processor Selector */}
                    <div className="flex-1 min-w-[200px]">
                        <Select value={selectedProcessorId} onValueChange={handleProcessorChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a processor" />
                            </SelectTrigger>
                            <SelectContent>
                                {PROCESSOR_REGISTRY.map((processor) => (
                                    <SelectItem key={processor.id} value={processor.id}>
                                        {processor.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* View Selector */}
                    <div className="flex-1 min-w-[200px]">
                        <Select value={selectedViewId || undefined} onValueChange={(value) => handleViewChange(value as ViewId)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a view" />
                            </SelectTrigger>
                            <SelectContent>
                                {getViewSelectOptions().map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={handleParseClick} className="whitespace-nowrap" aria-label="Parse Markdown">
                        Parse Markdown
                    </Button>
                </div>
            )}


            <div className="flex flex-1 overflow-hidden">
                {/* Left Side: Markdown Input & Preview */}
                <MarkdownInput markdown={markdown} parsedMarkdown={parsedMarkdown} onMarkdownChange={setMarkdown} mode={mode} />

                {/* Right Side: Processing Tabs */}
                <MarkdownProcessingTabs
                    ast={ast}
                    parsedMarkdown={parsedMarkdown}
                    processedData={processedData}
                    selectedCoordinatorId={selectedCoordinatorId}
                    selectedViewId={selectedViewId}
                    mode={mode}
                    onParse={handleParseClick}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
};

export default MarkdownClassificationTester;
