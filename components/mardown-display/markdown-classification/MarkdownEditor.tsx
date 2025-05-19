"use client";

import { useState, useEffect } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { useTheme } from "@/styles/themes/ThemeProvider";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Button,
} from "@/components/ui";
import { processMarkdownWithConfig } from "./json-config-system/config-processor";
import { basicSample, markdownSamples } from "./markdown-samples";
import { configRegistry } from "./json-config-system/config-registry";
import MarkdownInput from "./MarkdownInput";
import MarkdownProcessingTabs from "./MarkdownProcessingTabs";

interface MdastNode {
    type: string;
    children?: MdastNode[];
    value?: string;
    depth?: number;
    url?: string;
    lang?: string;
    [key: string]: any;
}

interface MarkdownEditorProps {
    initialMarkdown?: string;
    showSampleSelector?: boolean;
    showConfigSelector?: boolean;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ 
    initialMarkdown, 
    showSampleSelector = true, 
    showConfigSelector = true 
}) => {
    const { mode } = useTheme();
    const [markdown, setMarkdown] = useState<string>(initialMarkdown || basicSample);
    const [ast, setAst] = useState<MdastNode | null>(null);
    const [parsedMarkdown, setParsedMarkdown] = useState<string>(initialMarkdown || basicSample);
    const [selectedConfig, setSelectedConfig] = useState<string>("candidateProfile");
    const [processedData, setProcessedData] = useState<any>(null);

    // Always update preview when markdown changes
    useEffect(() => {
        setParsedMarkdown(markdown);
    }, [markdown]);

    // Parse markdown and update everything
    function parseMarkdown(text: string, configKey: string) {
        try {
            const processor = unified().use(remarkParse).use(remarkGfm);
            const tree = processor.parse(text);
            setAst(tree as unknown as MdastNode);

            const config = configRegistry[configKey]?.config;
            if (config) {
                const result = processMarkdownWithConfig({
                    ast: tree as unknown as MdastNode,
                    config,
                });
                setProcessedData(result);
            }
        } catch (error) {
            console.error("Error parsing Markdown:", error);
        }
    }

    // Initial parse
    useEffect(() => {
        parseMarkdown(markdown, selectedConfig);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle configuration change
    function handleConfigChange(value: string) {
        setSelectedConfig(value);
        parseMarkdown(markdown, value);
    }

    // Handle sample selection
    function handleSampleSelect(sampleKey: string) {
        if (markdownSamples[sampleKey]) {
            const newMarkdown = markdownSamples[sampleKey];
            setMarkdown(newMarkdown);
            parseMarkdown(newMarkdown, selectedConfig);
        }
    }

    // Handle manual parse button click
    function handleParseClick() {
        parseMarkdown(markdown, selectedConfig);
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Controls */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2">
                {showSampleSelector && (
                    <div className="flex-1">
                        <Select onValueChange={handleSampleSelect}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a markdown sample" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(markdownSamples).map(([key]) => (
                                    <SelectItem key={key} value={key}>
                                        {key.replace(/([A-Z])/g, " $1").trim()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {showConfigSelector && (
                    <div className="flex-1">
                        <Select value={selectedConfig} onValueChange={handleConfigChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a configuration" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(configRegistry).map(([key, option]) => (
                                    <SelectItem key={key} value={key}>
                                        {option.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <Button 
                    onClick={handleParseClick} 
                    className="whitespace-nowrap" 
                    aria-label="Parse Markdown"
                >
                    Parse Markdown
                </Button>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Side: Markdown Input & Preview */}
                <MarkdownInput 
                    markdown={markdown}
                    parsedMarkdown={parsedMarkdown}
                    onMarkdownChange={setMarkdown}
                    mode={mode}
                />

                {/* Right Side: Processing Tabs */}
                <MarkdownProcessingTabs
                    ast={ast}
                    parsedMarkdown={parsedMarkdown}
                    processedData={processedData}
                    selectedConfig={selectedConfig}
                    mode={mode}
                    onParse={handleParseClick}
                />
            </div>
        </div>
    );
};

export default MarkdownEditor;
