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
import React from "react";

// Import the new dynamic panel system
import { createDynamicPanelWrapper } from "./DynamicPanelRender";

// Import Redux hooks and selectors
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFirstPrimaryResponseDataByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import EnhancedChatMarkdown from "@/components/mardown-display/chat-markdown/EnhancedChatMarkdown";

// Import the actual rendering components
import EnhancedMarkdownCard from "@/components/mardown-display/EnhancedMarkdownCard";
import MultiSectionMarkdownCard from "@/components/mardown-display/MultiSectionMarkdownCard";
import QuestionnaireRenderer from "@/components/mardown-display/QuestionnaireRenderer";
import JsonDisplay from "@/components/mardown-display/JsonDisplay";
import CandidateProfileBlock from "@/components/mardown-display/blocks/candidate-profiles/CandidateProfileBlock";
import ParseExtractorOptions from "@/components/official/processor-extractor/ParseExtractorOptions";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";
import FullScreenMarkdownEditor from "@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor";
import SectionViewer from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/SectionViewer";
import SectionViewerWithSidebar from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/SectionViewerWithSidebar";
import SectionsViewer from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/sections-viewer";
import LinesViewer from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/lines-viewer";
import SectionViewerV2 from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/section-viewer-V2";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";

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

const jsonDataResponsePanel = createDynamicPanelWrapper(
    ({ taskId }: { taskId?: string }) => {
        const responseData = useAppSelector((state) => (taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null));

        const data = responseData?.response?.metadata;

        return <RawJsonExplorer pageData={data} ignorePrefix="data" withSelect={true} />;
    },
    "jsonDataResponse"
);


const EventComponentPanel = createDynamicPanelWrapper(
    ({ content }: { content: any }) => <EventComponent sections={content.sections} tables={[]} />,
    "markdownContent"
);

const QuestionnaireRendererPanel = createDynamicPanelWrapper(
    ({ content: data, taskId }: { content: any; taskId?: string }) => <QuestionnaireRenderer data={data} theme="professional" taskId={taskId} />,
    "separated"
);

const JsonDisplayStructuredPanel = createDynamicPanelWrapper(
    ({ content }: { content: string }) => (
        <JsonDisplay
            content={content}
            parseFunction={(content: string) => {
                // Import and use the parser directly since we need the original parseFunction interface
                const {
                    separatedMarkdownParser,
                } = require("@/components/mardown-display/markdown-classification/processors/custom/parser-separated");
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
                const {
                    parseMarkdownSimple,
                } = require("@/components/mardown-display/markdown-classification/processors/custom/simple-markdown-parser");
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
        const {
            parseMarkdownSimple,
        } = require("@/components/mardown-display/markdown-classification/processors/custom/simple-markdown-parser");
        const {
            separatedMarkdownParser,
        } = require("@/components/mardown-display/markdown-classification/processors/custom/parser-separated");

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





const FullScreenMarkdownEditorPanel = createDynamicPanelWrapper(
    ({ content, taskId }: { content: string; taskId?: string }) => {
        const [isOpen, setIsOpen] = React.useState(true);

        const responseData = useAppSelector((state) => (taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null));


        const analysisData = responseData?.response?.metadata || null;

        if (!isOpen) {
            return (
                <div className="w-full h-full flex items-center justify-center">
                    <button
                        onClick={() => setIsOpen(true)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                    >
                        Open Full Screen Editor
                    </button>
                </div>
            );
        }

        return (
            <div className="w-full h-full">
                <FullScreenMarkdownEditor
                    isOpen={isOpen}
                    initialContent={content}
                    analysisData={analysisData}
                    showSaveButton={false}
                    showCancelButton={true}
                    showCopyButton={true}
                    tabs={[
                        "write",
                        "wysiwyg",
                        "preview",
                        "analysis",
                        "metadata",
                        "config",
                        "classified_output",
                        "classified_analyzer",
                        "classified_analyzer_sidebar",
                        "section_viewer_v2",
                        "lines_viewer",
                        "sections_viewer",
                        "headers_viewer",
                        "section_texts_viewer",
                    ]}
                    initialTab="preview"
                    onCancel={() => setIsOpen(false)}
                />
            </div>
        );
    }
    // No parser = raw content
);

const SectionViewerPanel = createDynamicPanelWrapper(
    ({ content, taskId }: { content: any; taskId?: string }) => {
        // Get response data using the selector
        const responseData = useAppSelector((state) => (taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null));

        // Extract classified_output from response metadata
        const classifiedOutput = responseData?.response?.metadata?.classified_output;

        // Check if we have classified output data
        if (Array.isArray(classifiedOutput)) {
            return <SectionViewer data={classifiedOutput} />;
        }

        // Fallback: Check if content is already an array of classified sections
        if (Array.isArray(content)) {
            return <SectionViewer data={content} />;
        }

        // Fallback: If content is an object with classified_output, use that
        if (content?.classified_output && Array.isArray(content.classified_output)) {
            return <SectionViewer data={content.classified_output} />;
        }

        // Fallback for when no valid data is available
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No classified sections available to display
                {taskId && !responseData && <div className="mt-2 text-sm">(No response data found for task: {taskId})</div>}
            </div>
        );
    }
    // No parser = raw content
);

const SectionViewerV2Panel = createDynamicPanelWrapper(
    ({ content, taskId }: { content: any; taskId?: string }) => {
        // Get response data using the selector
        const responseData = useAppSelector((state) => (taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null));

        // Extract classified_output from response metadata
        const classifiedOutput = responseData?.response?.metadata?.classified_output;

        // Check if we have classified output data
        if (Array.isArray(classifiedOutput)) {
            return <SectionViewerV2 data={classifiedOutput} />;
        }

        // Fallback: Check if content is already an array of classified sections
        if (Array.isArray(content)) {
            return <SectionViewerV2 data={content} />;
        }

        // Fallback: If content is an object with classified_output, use that
        if (content?.classified_output && Array.isArray(content.classified_output)) {
            return <SectionViewerV2 data={content.classified_output} />;
        }

        // Fallback for when no valid data is available
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No classified sections available to display
                {taskId && !responseData && <div className="mt-2 text-sm">(No response data found for task: {taskId})</div>}
            </div>
        );
    }
    // No parser = raw content
);

const LinesViewerWithSidebarPanel = createDynamicPanelWrapper(
    ({ content, taskId }: { content: any; taskId?: string }) => {
        // Get response data using the selector
        const responseData = useAppSelector((state) => (taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null));

        // Extract classified_output from response metadata
        const linesOutput = responseData?.response?.metadata?.lines;

        // Check if we have classified output data
        if (Array.isArray(linesOutput)) {
            return <LinesViewer data={linesOutput} />;
        }

        // Fallback: Check if content is already an array of classified sections
        if (Array.isArray(content)) {
            return <LinesViewer data={content} />;
        }

        // Fallback: If content is an object with classified_output, use that
        if (content?.lines && Array.isArray(content.lines)) {
            return <LinesViewer data={content.lines} />;
        }

        // Fallback for when no valid data is available
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No lines available to display
                {taskId && !responseData && <div className="mt-2 text-sm">(No response data found for task: {taskId})</div>}
            </div>
        );
    }
    // No parser = raw content
);

const SectionsViewerWithSidebarPanel = createDynamicPanelWrapper(
    ({ content, taskId }: { content: any; taskId?: string }) => {
        // Get response data using the selector
        const responseData = useAppSelector((state) => (taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null));

        // Extract classified_output from response metadata
        const sectionsOutput = responseData?.response?.metadata?.sections;

        // Check if we have classified output data
        if (Array.isArray(sectionsOutput)) {
            return <SectionViewerWithSidebar data={sectionsOutput} />;
        }

        // Fallback: Check if content is already an array of classified sections
        if (Array.isArray(content)) {
            return <SectionViewerWithSidebar data={content} />;
        }

        // Fallback: If content is an object with classified_output, use that
        if (content?.sections && Array.isArray(content.sections)) {
            return <SectionViewerWithSidebar data={content.sections} />;
        }

        // Fallback for when no valid data is available
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No sections available to display
                {taskId && !responseData && <div className="mt-2 text-sm">(No response data found for task: {taskId})</div>}
            </div>
        );
    }
    // No parser = raw content
);

const HeadersViewerWithSidebarPanel = createDynamicPanelWrapper(
    ({ content, taskId }: { content: any; taskId?: string }) => {
        // Get response data using the selector
        const responseData = useAppSelector((state) => (taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null));

        // Extract classified_output from response metadata
        const sectionsByHeader = responseData?.response?.metadata?.sections_by_header;

        // Check if we have classified output data
        if (Array.isArray(sectionsByHeader)) {
            return <SectionViewerWithSidebar data={sectionsByHeader} />;
        }

        // Fallback: Check if content is already an array of classified sections
        if (Array.isArray(content)) {
            return <SectionViewerWithSidebar data={content} />;
        }

        // Fallback: If content is an object with classified_output, use that
        if (content?.sections_by_header && Array.isArray(content.sections_by_header)) {
            return <SectionViewerWithSidebar data={content.sections_by_header} />;
        }

        // Fallback for when no valid data is available
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No sections by header available to display
                {taskId && !responseData && <div className="mt-2 text-sm">(No response data found for task: {taskId})</div>}
            </div>
        );
    }
    // No parser = raw content
);

const SectionTextsViewerWithSidebarPanel = createDynamicPanelWrapper(
    ({ content, taskId }: { content: any; taskId?: string }) => {
        // Get response data using the selector
        const responseData = useAppSelector((state) => (taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null));

        // Extract classified_output from response metadata
        const sectionTextsOutput = responseData?.response?.metadata?.section_texts;

        // Check if we have classified output data
        if (Array.isArray(sectionTextsOutput)) {
            return <SectionsViewer data={sectionTextsOutput} />;
        }

        // Fallback: Check if content is already an array of classified sections
        if (Array.isArray(content)) {
            return <SectionsViewer data={content} />;
        }

        // Fallback: If content is an object with classified_output, use that
        if (content?.section_texts && Array.isArray(content.section_texts)) {
            return <SectionsViewer data={content.section_texts} />;
        }

        // Fallback for when no valid data is available
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No section texts available to display
                {taskId && !responseData && <div className="mt-2 text-sm">(No response data found for task: {taskId})</div>}
            </div>
        );
    }
    // No parser = raw content
);

export const PANEL_REGISTRY: Record<string, PanelConfig> = {
    markdown: {
        id: "markdown",
        component: ResultPanel,
        icon: FileText,
        label: "Formatted Markdown",
        value: "markdown",
        defaultProps: {},
    },
    raw: {
        id: "raw",
        component: RawTextPanel,
        icon: Baseline,
        label: "Raw Text",
        value: "raw",
        defaultProps: {},
    },
    parseExtractorOptions: {
        id: "parseExtractorOptions",
        component: ParseExtractorOptionsPanel,
        icon: Settings,
        label: "Review the structured data to find the exact data you need",
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
    jsonDataResponse: {
        id: "jsonDataResponse",
        component: jsonDataResponsePanel,
        icon: Braces,
        label: "JSON Data Response",
        value: "jsonDataResponse",
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
    fullScreenMarkdownEditor: {
        id: "fullScreenMarkdownEditor",
        component: FullScreenMarkdownEditorPanel,
        icon: FileText,
        label: "Full Screen Markdown Editor (Advanced multi-tab editor with analysis, metadata, and classified content viewing)",
        value: "fullScreenMarkdownEditor",
        defaultProps: {},
    },
    sectionViewer: {
        id: "sectionViewer",
        component: SectionViewerPanel,
        icon: AlignCenterVertical,
        label: "Section Viewer (Displays classified markdown sections with visual formatting and icons)",
        value: "sectionViewer",
        defaultProps: {},
    },
    sectionViewerWithSidebar: {
        id: "sectionViewerWithSidebar",
        component: SectionViewerV2Panel,
        icon: LayoutTemplate,
        label: "Section Viewer V2",
        value: "sectionViewerWithSidebar",
        defaultProps: {},
    },
    linesViewerWithSidebar: {
        id: "linesViewerWithSidebar",
        component: LinesViewerWithSidebarPanel,
        icon: LayoutTemplate,
        label: "Lines Viewer",
        value: "linesViewerWithSidebar",
        defaultProps: {},
    },
    sectionsViewerWithSidebar: {
        id: "sectionsViewerWithSidebar",
        component: SectionsViewerWithSidebarPanel,
        icon: LayoutTemplate,
        label: "Big Sections Headers Together",
        value: "sectionsViewerWithSidebar",
        defaultProps: {},
    },

    headersViewerWithSidebar: {
        id: "headersViewerWithSidebar",
        component: HeadersViewerWithSidebarPanel,
        icon: LayoutTemplate,
        label: "Sections by Header",
        value: "headersViewerWithSidebar",
        defaultProps: {},
    },

    sectionTextsviewerWithSidebar: {
        id: "sectionTextsViewerWithSidebar",
        component: SectionTextsViewerWithSidebarPanel,
        icon: LayoutTemplate,
        label: "Section Texts",
        value: "sectionTextsViewerWithSidebar",
        defaultProps: {},
    },
};
