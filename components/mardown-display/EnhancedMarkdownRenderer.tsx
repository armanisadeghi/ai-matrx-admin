import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { AlignCenterVertical, Baseline, Braces, Code, Eye, FileText, LayoutDashboard, LayoutTemplate } from "lucide-react";
import { Card } from "@/components/ui";
import { parseMarkdownContent } from "../brokers/output/markdown-utils";
import EnhancedMarkdownCard from "./EnhancedMarkdownCard";
import { DisplayTheme, SIMPLE_THEME_OPTIONS, THEMES } from "./themes";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { separatedMarkdownParser } from "./parser-separated";
import { enhancedMarkdownParser } from "./enhanced-parser";
import MultiSectionMarkdownCard from "./MultiSectionMarkdownCard";
import JsonDisplay from "./JsonDisplay";
import MarkdownRenderer from "./MarkdownRenderer";
import QuestionnaireRenderer from './QuestionnaireRenderer';

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
    raw: {
        icon: Baseline,
        label: "Raw Text",
        supportedTypes: ["markdown", "json"],
    },
    rendered: {
        icon: Eye,
        label: "Rendered",
        supportedTypes: ["markdown"],
    },
    sectionCards: {
        icon: LayoutDashboard,
        label: "Cards",
        supportedTypes: ["markdown"],
    },
    enhancedSectionCards: {
        icon: LayoutTemplate,
        label: "Enhanced Cards",
        supportedTypes: ["markdown"],
    },
    multiSectionCards: {
        icon: AlignCenterVertical,
        label: "Multi Section Cards",
        supportedTypes: ["markdown"],
    },
    questionnaire: {
        icon: FileText,
        label: "Questionnaire",
        supportedTypes: ["questionnaire"],
    },
    parsedAsJson: {
        icon: Braces,
        label: "Processed",
        supportedTypes: ["json"],
    },
    structured: {
        icon: FileText,
        label: "Structured",
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

    const themeColors = THEMES[currentTheme];
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
            case "questionnaire":
                const parsedContent = separatedMarkdownParser(content);
                return <QuestionnaireRenderer data={parsedContent} theme={currentTheme}/>;
            case "structured":
                return <JsonDisplay content={content} parseFunction={separatedMarkdownParser} />;

            case "parsedAsJson":
                return <JsonDisplay content={content} parseFunction={parseMarkdownContent} />;
            case "rendered":
            default:
                return (
                    <div className='flex-1 p-2 overflow-y-auto overflow-x-hidden scrollbar-thin'>
                        <MarkdownRenderer
                            content={content}
                            type='message'
                            role='assistant'
                            fontSize={fontSize}
                        />
                    </div>
                );
        }
    };

    return (
        <Card className="w-full h-screen flex flex-col">
            {/* Fixed header section */}
            <div className="flex-none border-b border-gray-200 dark:border-gray-700 p-2">
                <div className="flex justify-between items-center">
                    <div className="flex space-x-1">
                        {availableModes.map(([mode, { icon: Icon, label }]) => (
                            <button
                                key={mode}
                                onClick={() => handleModeChange(mode)}
                                className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors
                                    ${activeMode === mode
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
                        <SelectTrigger className="w-[160px] h-8">
                            <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                            {SIMPLE_THEME_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Scrollable content section */}
            <div className={`flex-1 overflow-y-auto p-0 ${themeColors.container.background}`}>
                {renderContent()}
            </div>
        </Card>
    );
};

export default EnhancedContentRenderer;
