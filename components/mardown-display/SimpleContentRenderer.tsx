import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { parseMarkdownContent } from "../brokers/output/markdown-utils";
import { separatedMarkdownParser } from "./parser-separated";
import { enhancedMarkdownParser } from "./enhanced-parser";
import EnhancedMarkdownCard from "./EnhancedMarkdownCard";
import MultiSectionMarkdownCard from "./MultiSectionMarkdownCard";
import JsonDisplay from "./JsonDisplay";
import MarkdownRenderer from "./MarkdownRenderer";
import QuestionnaireRenderer from "./QuestionnaireRenderer";
import { DisplayTheme, THEMES } from "./themes";
import { UseRunRecipeAppletReturn } from "@/hooks/run-recipe/useRunApps";

const EventComponent = dynamic(() => import("@/components/brokers/output/EventComponent"), { ssr: false });

export type LayoutType =
    | "raw"
    | "rendered"
    | "sectionCards"
    | "enhancedSectionCards"
    | "multiSectionCards"
    | "questionnaire"
    | "parsedAsJson"
    | "structured";

interface SimpleContentRendererProps {
    prepareRecipeHook: UseRunRecipeAppletReturn;
    layout: LayoutType;
    fontSize?: number;
    role?: "assistant" | "user";
    className?: string;
    theme?: any;
}

const SimpleContentRenderer = ({
    prepareRecipeHook,
    layout,
    fontSize = 16,
    role = "assistant",
    className = "",
    theme = "professional",
}: SimpleContentRendererProps) => {
    const themeColors = THEMES[theme];
    const [layoutMode, setLayoutMode] = useState<LayoutType>(layout);
    const [themeName, setThemeName] = useState<DisplayTheme>(theme);

    const { streamingResponses } = prepareRecipeHook;

    const content = streamingResponses[0] || "";

    useEffect(() => {
        setLayoutMode(layout);
    }, []);

    useEffect(() => {
        setThemeName(theme);
    }, []);

    const renderContent = () => {
        switch (layoutMode) {
            case "raw":
                return <pre className="p-4 whitespace-pre-wrap overflow-y-auto font-mono text-sm">{content}</pre>;
            case "enhancedSectionCards":
                try {
                    const parsedContent = enhancedMarkdownParser(content);
                    return <EnhancedMarkdownCard parsed={parsedContent} theme={themeName} fontSize={fontSize} className={className} />;
                } catch (error) {
                    console.error("Failed to parse content for section cards:", error);
                    return <div className="text-red-500">Failed to parse content</div>;
                }
            case "multiSectionCards":
                try {
                    const parsedContent = separatedMarkdownParser(content);
                    return <MultiSectionMarkdownCard parsed={parsedContent} theme={themeName} fontSize={fontSize} className={className} />;
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
                return <QuestionnaireRenderer data={parsedContent} theme={themeColors} />;
            case "structured":
                return <JsonDisplay content={content} parseFunction={separatedMarkdownParser} />;

            case "parsedAsJson":
                return <JsonDisplay content={content} parseFunction={parseMarkdownContent} />;
            case "rendered":
            default:
                return (
                    <div className="flex-1 p-2 overflow-y-auto overflow-x-hidden scrollbar-thin">
                        <MarkdownRenderer content={content} type="message" role="assistant" fontSize={fontSize} />
                    </div>
                );
        }
    };

    return (
        <div className="w-full h-screen flex flex-col p-0">
            <div className={`flex-1 overflow-y-auto p-0 ${themeColors.container.background}`}>
                {renderContent()}
            </div>
        </div>
    );
};

export default SimpleContentRenderer;
