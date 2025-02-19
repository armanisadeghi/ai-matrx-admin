import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import EnhancedMarkdownCard from "./EnhancedMarkdownCard";
import MultiSectionMarkdownCard from "./MultiSectionMarkdownCard";
import MarkdownRenderer from "./MarkdownRenderer";
import QuestionnaireRenderer from "./QuestionnaireRenderer";
import { DisplayTheme, THEMES } from "./themes";
import { UseRunRecipeAppletReturn } from "@/hooks/run-recipe/useRunApps";
import parseMarkdown from "./parser-options";
import JsonDataDisplay from "./data-display/JsonDataDisplay";

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
    themeName?: any;
}

const SimpleContentRenderer = ({
    prepareRecipeHook,
    layout,
    fontSize = 16,
    role = "assistant",
    className = "",
    themeName = "professional",
}: SimpleContentRendererProps) => {
    const [layoutMode, setLayoutMode] = useState<LayoutType>(layout);
    const [activeThemeName, setActiveThemeName] = useState<DisplayTheme>(themeName);

    useEffect(() => {
        setLayoutMode(layout);
    }, []);

    useEffect(() => {
        setActiveThemeName(themeName);
    }, []);

    const themeData = useMemo(() => THEMES[activeThemeName], [activeThemeName]);

    const { streamingResponses } = prepareRecipeHook;
    const content = streamingResponses[0] || "";
    const parsedContent = parseMarkdown(content, layoutMode);

    const renderContent = (parsedContent) => {
        switch (layoutMode) {
            case "raw":
                return <pre className="p-4 whitespace-pre-wrap overflow-y-auto font-mono text-sm">{parsedContent}</pre>;
            case "enhancedSectionCards":
                try {
                    return <EnhancedMarkdownCard parsed={parsedContent} theme={themeName} fontSize={fontSize} className={className} />;
                } catch (error) {
                    console.error("Failed to parse content for section cards:", error);
                    return <div className="text-red-500">Failed to parse content</div>;
                }
            case "multiSectionCards":
                try {
                    return <MultiSectionMarkdownCard parsed={parsedContent} theme={themeName} fontSize={fontSize} className={className} />;
                } catch (error) {
                    console.error("Failed to parse content for section cards:", error);
                    return <div className="text-red-500">Failed to parse content</div>;
                }
            case "sectionCards":
                try {
                    return <EventComponent sections={parsedContent.sections} tables={[]} />;
                } catch (error) {
                    console.error("Failed to parse content for section cards:", error);
                    return <div className="text-red-500">Failed to parse content</div>;
                }
            case "questionnaire":
                return <QuestionnaireRenderer data={parsedContent} theme={themeData} />;
            case "structured":
            case "parsedAsJson":
                return <JsonDataDisplay parsedContent={parsedContent} />;
            case "rendered":
            default:
                return (
                    <div className="flex-1 p-2 overflow-y-auto overflow-x-hidden scrollbar-thin">
                        <MarkdownRenderer content={parsedContent} type="message" role="assistant" fontSize={fontSize} />
                    </div>
                );
        }
    };

    return (
        <div className="w-full h-screen flex flex-col p-0">
            <div className={`flex-1 overflow-y-auto p-0 ${themeData.container.background}`}>{renderContent(parsedContent)}</div>
        </div>
    );
};

export default SimpleContentRenderer;
