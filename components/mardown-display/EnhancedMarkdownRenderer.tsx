import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Braces, Code, Eye, FileText, LayoutDashboard, LayoutTemplate } from "lucide-react";
import { Card } from "@/components/ui";
import { parseMarkdownContent } from "../brokers/output/markdown-utils";
import { parseMarkdownTable } from "./parse-markdown-table";
import EnhancedMarkdownCard from "./EnhancedMarkdownCard";
import { DisplayTheme, SIMPLE_THEME_OPTIONS } from "./themes";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { separatedMarkdownParser } from "./parser-separated";
import { enhancedMarkdownParser } from "./enhanced-parser";
import MultiSectionMarkdownCard from "./MultiSectionMarkdownCard";
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });
const EventComponent = dynamic(() => import("@/components/brokers/output/EventComponent"), { ssr: false });

// Define supported content types and their detection logic
const CONTENT_TYPES = {
    markdown: (content) => {
        // Basic markdown detection - check for common markdown syntax
        return /(?:\*\*|\#|\-\s|\[.+\]\(.+\)|\|.*\|)/.test(content);
    },
    json: (content) => {
        try {
            JSON.parse(content);
            return true;
        } catch {
            return false;
        }
    },
};

// Define view modes configuration
const VIEW_MODES = {
    rendered: {
        icon: Eye,
        label: "Rendered View",
        supportedTypes: ["markdown"],
    },
    raw: {
        icon: Code,
        label: "Raw Text",
        supportedTypes: ["markdown", "json"],
    },
    sectionCards: {
        icon: LayoutDashboard,
        label: "Section Cards",
        supportedTypes: ["markdown"],
    },
    multiSectionCards: {
        icon: LayoutTemplate,
        label: "Multi Section Cards",
        supportedTypes: ["markdown"],
    },
    enhancedSectionCards: {
        icon: LayoutTemplate,
        label: "Enhanced Section Cards",
        supportedTypes: ["markdown"],
    },
    structured: {
        icon: FileText,
        label: "Structured",
        supportedTypes: ["json"],
    },
    parsedAsJson: {
        icon: Braces,
        label: "Parsed as JSON",
        supportedTypes: ["json"],
    },
};

export interface EnhancedContentRendererProps {
    content: string;
    type?: string;
    fontSize?: number;
    role?: string;
    className?: string;
    theme?: DisplayTheme;
    onModeChange?: (mode: string) => void;
    onThemeChange?: (theme: DisplayTheme) => void;
}

const EnhancedContentRenderer = ({
    content,
    type = "message",
    fontSize = 16,
    role = "assistant",
    className = "",
    theme = "professional",
    onModeChange = (mode: string) => {},
    onThemeChange = (theme: DisplayTheme) => {},
}: EnhancedContentRendererProps) => {
    // Detect content type
    const contentType = useMemo(() => {
        for (const [type, detector] of Object.entries(CONTENT_TYPES)) {
            if (detector(content)) return type;
        }
        return "text";
    }, [content]);

    // Get available modes without filtering
    const availableModes = useMemo(() => Object.entries(VIEW_MODES), []);

    // Set initial mode based on content type
    const [activeMode, setActiveMode] = useState(() => {
        const defaultMode = availableModes[0]?.[0] || "raw";
        return defaultMode;
    });

    const [currentTheme, setCurrentTheme] = useState<DisplayTheme>(theme);

    // Handle mode changes
    const handleModeChange = (mode: string) => {
        setActiveMode(mode);
        onModeChange(mode);
    };

    // Handle theme changes
    const handleThemeChange = (newTheme: DisplayTheme) => {
        setCurrentTheme(newTheme);
        onThemeChange?.(newTheme);
    };

    // Memoize markdown components config
    const markdownComponents = useMemo(
        () => ({
            table: ({ node, ...props }) => {
                const tableData = parseMarkdownTable(content);
                if (!tableData) return null;
                return (
                    <div className="overflow-x-auto my-4">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">{/* Table implementation */}</table>
                    </div>
                );
            },
            p: ({ node, ...props }) => <p style={{ fontSize: `${fontSize}px` }} className="mb-2" {...props} />,
        }),
        [fontSize, content]
    );

    const renderContent = () => {
        switch (activeMode) {
            case "raw":
                return <pre className="p-4 whitespace-pre-wrap overflow-y-auto font-mono text-sm">{content}</pre>;
            case "enhancedSectionCards":
                try {
                    const parsedContent = enhancedMarkdownParser(content);
                    return <EnhancedMarkdownCard parsed={parsedContent} theme={currentTheme} fontSize={fontSize} className={className} />;
                } catch (error) {
                    console.error("Failed to parse content for section cards:", error);
                    return <div className="text-red-500">Failed to parse content</div>;
                }
            case "multiSectionCards":
                try {
                    const parsedContent = separatedMarkdownParser(content);
                    return (
                        <MultiSectionMarkdownCard parsed={parsedContent} theme={currentTheme} fontSize={fontSize} className={className} />
                    );
                } catch (error) {
                    console.error("Failed to parse content for section cards:", error);
                    return <div className="text-red-500">Failed to parse content</div>;
                }

            case "sectionCards":
                try {
                    const parsedContent = parseMarkdownContent(content);
                    return <EventComponent sections={parsedContent.sections} tables={[]} />;
                } catch (error) {
                    console.error("Failed to parse content for section cards:", error);
                    return <div className="text-red-500">Failed to parse content</div>;
                }
            case "structured":
                try {
                    const structuredContent = JSON.parse(content);
                    return (
                        <pre className="p-4 whitespace-pre-wrap overflow-y-auto font-mono text-sm">
                            {JSON.stringify(structuredContent, null, 2)}
                        </pre>
                    );
                } catch {
                    return <div className="text-red-500">Invalid JSON content</div>;
                }
            case "parsedAsJson":
                try {
                    const parsedContent = parseMarkdownContent(content);
                    return (
                        <pre className="p-4 whitespace-pre-wrap overflow-y-auto font-mono text-sm">
                            {JSON.stringify(parsedContent, null, 2)}
                        </pre>
                    );
                } catch {
                    return <div className="text-red-500">Invalid JSON content</div>;
                }
            case "rendered":
            default:
                return (
                    <div className="flex-1 p-2 overflow-y-auto overflow-x-hidden">
                        <ReactMarkdown remarkPlugins={[]} components={markdownComponents}>
                            {content}
                        </ReactMarkdown>
                    </div>
                );
        }
    };

    return (
        <Card className="w-full">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2">
                <div className="flex justify-between items-center">
                    <div className="flex space-x-4">
                        {availableModes.map(([mode, { icon: Icon, label }]) => (
                            <button
                                key={mode}
                                onClick={() => handleModeChange(mode)}
                                className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors
                  ${
                      activeMode === mode
                          ? "bg-gray-200 dark:bg-gray-800 text-neutral-700 dark:text-neutral-300"
                          : "hover:bg-gray-200 dark:hover:bg-gray-800"
                  }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                    <Select value={currentTheme} onValueChange={handleThemeChange}>
                        <SelectTrigger className="w-[180px] h-8">
                            <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                            {SIMPLE_THEME_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>{" "}
                </div>
            </div>
            <div className="p-4">{renderContent()}</div>
        </Card>
    );
};

export default EnhancedContentRenderer;
