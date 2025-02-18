import React from "react";
import dynamic from "next/dynamic";
import { parseMarkdownContent } from "../brokers/output/markdown-utils";
import { separatedMarkdownParser } from "./parser-separated";
import { enhancedMarkdownParser } from "./enhanced-parser";
import EnhancedMarkdownCard from "./EnhancedMarkdownCard";
import MultiSectionMarkdownCard from "./MultiSectionMarkdownCard";
import JsonDisplay from "./JsonDisplay";
import MarkdownRenderer from "./MarkdownRenderer";
import QuestionnaireRenderer from "./QuestionnaireRenderer";
import { DisplayTheme } from "./themes";

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
    content: string;
    layout: LayoutType;
    fontSize?: number;
    role?: "assistant" | "user";
    className?: string;
    theme?: DisplayTheme;
}

const SimpleContentRenderer = ({
    content,
    layout,
    fontSize = 16,
    role = "assistant",
    className = "",
    theme = "professional",
}: SimpleContentRendererProps) => {
    switch (layout) {
        case "raw":
            return <pre className="p-4 whitespace-pre-wrap overflow-y-auto font-mono text-sm">{content}</pre>;

        case "enhancedSectionCards":
            try {
                const parsedContent = enhancedMarkdownParser(content);
                return <EnhancedMarkdownCard parsed={parsedContent} theme={theme} fontSize={fontSize} className={className} />;
            } catch (error) {
                console.error("Failed to parse content for enhanced section cards:", error);
                return <div className="text-red-500">Failed to parse content</div>;
            }

        case "multiSectionCards":
            try {
                const parsedContent = separatedMarkdownParser(content);
                return <MultiSectionMarkdownCard parsed={parsedContent} theme={theme} fontSize={fontSize} className={className} />;
            } catch (error) {
                console.error("Failed to parse content for multi section cards:", error);
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
            return <QuestionnaireRenderer data={parsedContent} theme={theme} />;

        case "structured":
            return <JsonDisplay content={content} parseFunction={separatedMarkdownParser} />;

        case "parsedAsJson":
            return <JsonDisplay content={content} parseFunction={parseMarkdownContent} />;

        case "rendered":
        default:
            return (
                <div className="flex-1 p-2 overflow-y-auto overflow-x-hidden scrollbar-thin">
                    <MarkdownRenderer content={content} type="message" role={role} fontSize={fontSize} />
                </div>
            );
    }
};

export default SimpleContentRenderer;
