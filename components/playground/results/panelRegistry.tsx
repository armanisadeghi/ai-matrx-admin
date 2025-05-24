"use client";

import {
    MessageSquare,
    FileText,
    Code2,
    Gem,
    FormInput,
    Image,
    Sparkles,
    FileCode,
    LayoutTemplate,
    AlignCenterVertical,
    Calendar,
    ClipboardList,
    Braces,
    User,
    Settings,
    Eye,
    Baseline,
} from "lucide-react";
import { ResultPanel } from "./ResultPanel";
import { EnhancedResultsPanel } from "./EnhancedResultsPanel";
import { CodePanel } from "./CodePanel";
import { PanelConfig } from "./types";
import { lazy } from "react";

// Import the new dynamic panel system
import { createDynamicPanelWrapper } from "./DynamicPanelRender";

// Import the actual rendering components
import EnhancedMarkdownCard from "@/components/mardown-display/EnhancedMarkdownCard";
import MultiSectionMarkdownCard from "@/components/mardown-display/MultiSectionMarkdownCard";
import QuestionnaireRenderer from "@/components/mardown-display/QuestionnaireRenderer";
import JsonDisplay from "@/components/mardown-display/JsonDisplay";
import CandidateProfileBlock from "@/components/mardown-display/blocks/candidate-profiles/CandidateProfileBlock";
import ParseExtractorOptions from "@/components/official/processor-extractor/ParseExtractorOptions";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";

// Dynamically import EventComponent
const EventComponent = lazy(() => import("@/components/brokers/output/EventComponent"));

// Create panel components using the new dynamic system
const RawTextPanel = createDynamicPanelWrapper(({ content }: { content: string }) => (
    <pre className="p-4 whitespace-pre-wrap overflow-y-auto font-mono text-sm h-full">{content}</pre>
));

const EnhancedMarkdownCardPanel = createDynamicPanelWrapper(
    ({ content: parsed, ...props }: { content: any; [key: string]: any }) => <EnhancedMarkdownCard parsed={parsed} {...props} />,
    "enhanced",
    { theme: "professional", fontSize: 16, className: "" }
);

const MultiSectionMarkdownCardPanel = createDynamicPanelWrapper(
    ({ content: parsed, ...props }: { content: any; [key: string]: any }) => <MultiSectionMarkdownCard parsed={parsed} {...props} />,
    "separated",
    { theme: "professional", fontSize: 16, className: "" }
);

const EventComponentPanel = createDynamicPanelWrapper(
    ({ content }: { content: any }) => <EventComponent sections={content.sections} tables={[]} />,
    "markdownContent"
);

const QuestionnaireRendererPanel = createDynamicPanelWrapper(
    ({ content: data }: { content: any }) => <QuestionnaireRenderer data={data} theme="professional" />,
    "separated"
);

const JsonDisplayStructuredPanel = createDynamicPanelWrapper(
    ({ content }: { content: string }) => (
        <JsonDisplay
            content={content}
            parseFunction={(content: string) => {
                // Import and use the parser directly since we need the original parseFunction interface
                    const { separatedMarkdownParser } = require("@/components/mardown-display/markdown-classification/processors/custom/parser-separated");
                return separatedMarkdownParser(content);
            }}
        />
    )
    // No parser = raw content, JsonDisplay handles parsing internally
);

const JsonDisplayParsedPanel = createDynamicPanelWrapper(
    ({ content }: { content: string }) => (
        <JsonDisplay
            content={content}
            parseFunction={(content: string) => {
                // Import and use the parser directly
                const { parseMarkdownSimple } = require("@/components/mardown-display/markdown-classification/processors/custom/simple-markdown-parser");
                return parseMarkdownSimple(content);
            }}
        />
    )
    // No parser = raw content, JsonDisplay handles parsing internally
);

const CandidateProfileBlockPanel = createDynamicPanelWrapper(
    ({ content }: { content: string }) => (
        <div className="flex items-center justify-start p-3 pt-0 w-full">
            <CandidateProfileBlock content={content} />
        </div>
    )
    // No parser = raw content
);

const ParseExtractorOptionsPanel = createDynamicPanelWrapper(
    ({ content }: { content: string }) => {
        // Import the actual parser functions
        const { parseMarkdownSimple } = require("@/components/mardown-display/markdown-classification/processors/custom/simple-markdown-parser");
        const { separatedMarkdownParser } = require("@/components/mardown-display/markdown-classification/processors/custom/parser-separated");

        return (
            <ParseExtractorOptions
                content={content}
                processors={[
                    { name: "markdown-content", label: "Markdown Content Parser", fn: parseMarkdownSimple },
                    { name: "separated-markdown", label: "Separated Markdown Parser", fn: separatedMarkdownParser },
                ]}
            />
        );
    }
    // No parser = raw content for ParseExtractorOptions to handle internally
);

const MarkdownRendererPanel = createDynamicPanelWrapper(
    ({ content }: { content: string }) => (
        <div className="flex-1 p-2 overflow-y-auto overflow-x-hidden scrollbar-thin bg-inherit">
            <MarkdownRenderer content={content} type="message" role="assistant" fontSize={16} />
        </div>
    )
    // No parser = raw content
);

export const PANEL_REGISTRY: Record<string, PanelConfig> = {
    markdown: {
        id: "markdown",
        component: ResultPanel,
        icon: FileText,
        label: "Formatted Markdown (Custom-Formatted using one of the many formats offered by Matrx)",
        value: "markdown",
        defaultProps: {},
    },
    raw: {
        id: "raw",
        component: RawTextPanel,
        icon: Baseline,
        label: "Raw Text (The exact output from the Model)",
        value: "raw",
        defaultProps: {},
    },
    parseExtractorOptions: {
        id: "parseExtractorOptions",
        component: ParseExtractorOptionsPanel,
        icon: Settings,
        label: "A glimpse into the Power of AI Matrx. This component is converting your text content into structured data, which can be traversed with clicks.",
        value: "parseExtractorOptions",
        defaultProps: {},
    },
    enhanced: {
        id: "enhanced",
        component: EnhancedResultsPanel,
        icon: Gem,
        label: "Enhanced (A mixture of different view options)",
        value: "enhanced",
        defaultProps: {},
    },
    dynamic: {
        id: "dynamic",
        component: ResultPanel,
        icon: Sparkles,
        label: "Dynamic",
        value: "dynamic",
        defaultProps: {},
    },
    compiled: {
        id: "compiled",
        component: ResultPanel,
        icon: FileCode,
        label: "Want to see the ACTUAL data sent to the server? This is it.",
        value: "compiled",
        defaultProps: {},
    },

    eventComponent: {
        id: "eventComponent",
        component: EventComponentPanel,
        icon: Calendar,
        label: "Event Cards",
        value: "eventComponent",
        defaultProps: {},
    },
    questionnaireRenderer: {
        id: "questionnaireRenderer",
        component: QuestionnaireRendererPanel,
        icon: ClipboardList,
        label: "Questionnaire",
        value: "questionnaireRenderer",
        defaultProps: {},
    },
    jsonDisplayStructured: {
        id: "jsonDisplayStructured",
        component: JsonDisplayStructuredPanel,
        icon: Braces,
        label: "JSON Structured",
        value: "jsonDisplayStructured",
        defaultProps: {},
    },
    jsonDisplayParsed: {
        id: "jsonDisplayParsed",
        component: JsonDisplayParsedPanel,
        icon: Braces,
        label: "JSON Parsed",
        value: "jsonDisplayParsed",
        defaultProps: {},
    },
    enhancedMarkdownCard: {
        id: "enhancedMarkdownCard",
        component: EnhancedMarkdownCardPanel,
        icon: LayoutTemplate,
        label: "Enhanced Cards",
        value: "enhancedMarkdownCard",
        defaultProps: {},
    },
    multiSectionMarkdownCard: {
        id: "multiSectionMarkdownCard",
        component: MultiSectionMarkdownCardPanel,
        icon: AlignCenterVertical,
        label: "Multi Section Cards",
        value: "multiSectionMarkdownCard",
        defaultProps: {},
    },

    candidateProfileBlock: {
        id: "candidateProfileBlock",
        component: CandidateProfileBlockPanel,
        icon: User,
        label: "Candidate Profile",
        value: "candidateProfileBlock",
        defaultProps: {},
    },
    markdownRenderer: {
        id: "markdownRenderer",
        component: MarkdownRendererPanel,
        icon: Eye,
        label: "Markdown Renderer",
        value: "markdownRenderer",
        defaultProps: {},
    },
    code: {
        id: "code",
        component: CodePanel,
        icon: Code2,
        label: "Code",
        value: "code",
        defaultProps: {},
    },
    form: {
        id: "form",
        component: ResultPanel,
        icon: FormInput,
        label: "Form",
        value: "form",
        defaultProps: {},
    },
    image: {
        id: "image",
        component: ResultPanel,
        icon: Image,
        label: "Image",
        value: "image",
        defaultProps: {},
    },
};
