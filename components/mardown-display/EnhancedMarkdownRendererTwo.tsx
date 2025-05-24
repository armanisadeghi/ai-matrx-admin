import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { AlignCenterVertical, Baseline, Braces, Code, Eye, FileText, LayoutDashboard, LayoutTemplate } from "lucide-react";
import { parseMarkdownSimple } from "./markdown-classification/processors/custom/simple-markdown-parser";
import EnhancedMarkdownCard from "./EnhancedMarkdownCard";
import { DisplayTheme, SIMPLE_THEME_OPTIONS, THEMES } from "./themes";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { separatedMarkdownParser } from "./markdown-classification/processors/custom/parser-separated";
import { enhancedMarkdownParser } from "./markdown-classification/processors/custom/enhanced-parser";
import MultiSectionMarkdownCard from "./MultiSectionMarkdownCard";
import JsonDisplay from "./JsonDisplay";
import MarkdownRenderer from "./MarkdownRenderer";
import QuestionnaireRenderer from "./QuestionnaireRenderer";


const EventComponent = dynamic(() => import("@/components/brokers/output/EventComponent"), { ssr: false });

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
    showTabs?: boolean;
    mode?: string;
    onModeChange?: (mode: string) => void;
    onThemeChange?: (theme: DisplayTheme) => void;
}

const EnhancedContentRendererTwo = ({
    content,
    type = "message",
    fontSize = 16,
    role = "assistant",
    className = "",
    theme = "pinkBlue" as DisplayTheme,
    mode = "rendered",
    onModeChange = (mode: string) => {},
    onThemeChange = (theme: DisplayTheme) => {},
}: EnhancedContentRendererProps) => {
    const availableModes = useMemo(() => Object.entries(VIEW_MODES), []);
    const [options, setOptions] = useState([]);

    useEffect(() => {
        const loadOptions = async () => {
            setOptions(SIMPLE_THEME_OPTIONS);
        };

        loadOptions();
    }, []);

    const [activeMode, setActiveMode] = useState(() => {
        const defaultMode = availableModes[mode];
        return defaultMode;
    });

    useEffect(() => {
        setActiveMode(mode);
    }, []);

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

    console.log("Mode", mode);
    console.log("activeMode", activeMode);

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
                    const parsedContent = parseMarkdownSimple(content);
                    return <EventComponent sections={parsedContent.sections} tables={[]} />;
                } catch (error) {
                    console.error("Failed to parse content for section cards:", error);
                    return <div className="text-red-500">Failed to parse content</div>;
                }
            case "questionnaire":
                const parsedContent = separatedMarkdownParser(content);
                return <QuestionnaireRenderer data={parsedContent} theme={currentTheme} />;
            case "structured":
                return <JsonDisplay content={content} parseFunction={separatedMarkdownParser} />;

            case "parsedAsJson":
                return <JsonDisplay content={content} parseFunction={parseMarkdownSimple} />;
            case "rendered":
                console.log("rendered");
            default:
                return (
                    <div
                        className={`w-full h-full p-0 overflow-y-auto overflow-x-hidden scrollbar-thin ${themeColors.container.background}`}
                    >
                        <MarkdownRenderer content={content} type="message" role="assistant" fontSize={fontSize} />
                    </div>

                );
        }
    };

    return (
        <div className={`w-full h-full gap-0 p-0 ${themeColors.container.background}`}>
            <div className="hidden">
                <Select>
                    <SelectContent>
                        {SIMPLE_THEME_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className={`flex-1 overflow-y-auto gap-0 p-0 ${themeColors.container.background}`}>{renderContent()}</div>
        </div>
    );
};

export default EnhancedContentRendererTwo;
