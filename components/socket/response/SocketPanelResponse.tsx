"use client";

import React, { useState } from "react";
import {
    Card,
    CardHeader,
    CardTitle,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui";
import { useAppSelector } from "@/lib/redux/hooks";
import {
    selectTaskFirstListenerId,
    selectResponseTextByListenerId,
    selectResponseDataByListenerId,
} from "@/lib/redux/socket-io";
import { MarkdownCopyButton } from "@/components/matrx/buttons/MarkdownCopyButton";

// Import panel components from the registry
import { createDynamicPanelWrapper } from "@/components/playground/results/DynamicPanelRender";
import {
    FileCode,
    Baseline,
    AlignCenterVertical,
    LayoutTemplate,
} from "lucide-react";

// Import the viewer components directly
import SectionViewer from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/SectionViewer";
import SectionViewerWithSidebar from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/SectionViewerWithSidebar";
import SectionsViewer from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/sections-viewer";
import LinesViewer from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/lines-viewer";
import SectionViewerV2 from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/section-viewer-V2";
import FullScreenMarkdownEditor from "@/components/mardown-display/chat-markdown/FullScreenMarkdownEditor";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";
import { selectFirstPrimaryResponseDataByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";

// Create the raw text panel wrapper
const RawTextPanel = createDynamicPanelWrapper(({ content }: { content: string }) => (
    <pre className="p-4 whitespace-pre-wrap overflow-y-auto font-mono text-sm h-full">{content}</pre>
));

// Create a simplified compiled data panel that doesn't require PanelGroup
const CompiledDataPanel = createDynamicPanelWrapper(({ content }: { content: any }) => (
    <div className="flex-1 p-2 overflow-y-auto overflow-x-hidden scrollbar-thin relative h-full">
        <MarkdownRenderer content={content} type="message" role="assistant" fontSize={12} />
    </div>
));

// Create wrapper components for the viewer panels that use taskId
const SectionViewerPanel = createDynamicPanelWrapper(
    ({ content, taskId }: { content: any; taskId?: string }) => {
        const responseData = useAppSelector((state) => 
            taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null
        );
        
        const classifiedOutput = responseData?.response?.metadata?.classified_output;
        
        if (Array.isArray(classifiedOutput)) {
            return <SectionViewer data={classifiedOutput} />;
        }
        
        if (Array.isArray(content)) {
            return <SectionViewer data={content} />;
        }
        
        if (content?.classified_output && Array.isArray(content.classified_output)) {
            return <SectionViewer data={content.classified_output} />;
        }
        
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No classified sections available to display
            </div>
        );
    }
);

const SectionViewerV2Panel = createDynamicPanelWrapper(
    ({ content, taskId }: { content: any; taskId?: string }) => {
        const responseData = useAppSelector((state) => 
            taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null
        );
        
        const classifiedOutput = responseData?.response?.metadata?.classified_output;
        
        if (Array.isArray(classifiedOutput)) {
            return <SectionViewerV2 data={classifiedOutput} />;
        }
        
        if (Array.isArray(content)) {
            return <SectionViewerV2 data={content} />;
        }
        
        if (content?.classified_output && Array.isArray(content.classified_output)) {
            return <SectionViewerV2 data={content.classified_output} />;
        }
        
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No classified sections available to display
            </div>
        );
    }
);

const LinesViewerPanel = createDynamicPanelWrapper(
    ({ content, taskId }: { content: any; taskId?: string }) => {
        const responseData = useAppSelector((state) => 
            taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null
        );
        
        const linesOutput = responseData?.response?.metadata?.lines;
        
        if (Array.isArray(linesOutput)) {
            return <LinesViewer data={linesOutput} />;
        }
        
        if (Array.isArray(content)) {
            return <LinesViewer data={content} />;
        }
        
        if (content?.lines && Array.isArray(content.lines)) {
            return <LinesViewer data={content.lines} />;
        }
        
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No lines available to display
            </div>
        );
    }
);

const SectionsViewerPanel = createDynamicPanelWrapper(
    ({ content, taskId }: { content: any; taskId?: string }) => {
        const responseData = useAppSelector((state) => 
            taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null
        );
        
        const sectionsOutput = responseData?.response?.metadata?.sections;
        
        if (Array.isArray(sectionsOutput)) {
            return <SectionViewerWithSidebar data={sectionsOutput} />;
        }
        
        if (Array.isArray(content)) {
            return <SectionViewerWithSidebar data={content} />;
        }
        
        if (content?.sections && Array.isArray(content.sections)) {
            return <SectionViewerWithSidebar data={content.sections} />;
        }
        
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No sections available to display
            </div>
        );
    }
);

const HeadersViewerPanel = createDynamicPanelWrapper(
    ({ content, taskId }: { content: any; taskId?: string }) => {
        const responseData = useAppSelector((state) => 
            taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null
        );
        
        const sectionsByHeader = responseData?.response?.metadata?.sections_by_header;
        
        if (Array.isArray(sectionsByHeader)) {
            return <SectionViewerWithSidebar data={sectionsByHeader} />;
        }
        
        if (Array.isArray(content)) {
            return <SectionViewerWithSidebar data={content} />;
        }
        
        if (content?.sections_by_header && Array.isArray(content.sections_by_header)) {
            return <SectionViewerWithSidebar data={content.sections_by_header} />;
        }
        
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No sections by header available to display
            </div>
        );
    }
);

const SectionTextsViewerPanel = createDynamicPanelWrapper(
    ({ content, taskId }: { content: any; taskId?: string }) => {
        const responseData = useAppSelector((state) => 
            taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null
        );
        
        const sectionTextsOutput = responseData?.response?.metadata?.section_texts;
        
        if (Array.isArray(sectionTextsOutput)) {
            return <SectionsViewer data={sectionTextsOutput} />;
        }
        
        if (Array.isArray(content)) {
            return <SectionsViewer data={content} />;
        }
        
        if (content?.section_texts && Array.isArray(content.section_texts)) {
            return <SectionsViewer data={content.section_texts} />;
        }
        
        return (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No section texts available to display
            </div>
        );
    }
);

const FullScreenMarkdownEditorPanel = createDynamicPanelWrapper(
    ({ content, taskId }: { content: string; taskId?: string }) => {
        const [isOpen, setIsOpen] = useState(false);
        
        const responseData = useAppSelector((state) => 
            taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null
        );
        
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
                        "rich",
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
);

interface SocketPanelResponseProps {
    taskId: string;
}

export function SocketPanelResponse({ taskId }: SocketPanelResponseProps) {
    const [activeTab, setActiveTab] = useState("compiled");

    // Get response data using the same selectors as SocketAccordionResponse
    const firstListenerId = useAppSelector((state) => selectTaskFirstListenerId(state, taskId));
    const textResponse = useAppSelector(selectResponseTextByListenerId(firstListenerId));
    const dataResponse = useAppSelector(selectResponseDataByListenerId(firstListenerId));

    // Define the tabs we want to show
    const tabs = [
        {
            id: "Rendered",
            label: "Rendered",
            icon: FileCode,
            component: CompiledDataPanel,
            props: { 
                content: textResponse, 
                taskId
            }
        },
        {
            id: "raw",
            label: "Raw Text",
            icon: Baseline,
            component: RawTextPanel,
            props: { 
                content: textResponse, 
                taskId
            }
        },
        {
            id: "fullScreenEditor",
            label: "Full Screen Editor",
            icon: FileCode,
            component: FullScreenMarkdownEditorPanel,
            props: { content: textResponse, taskId }
        },
        {
            id: "sectionViewer",
            label: "Section Viewer",
            icon: AlignCenterVertical,
            component: SectionViewerPanel,
            props: { content: textResponse, taskId }
        },
        {
            id: "sectionViewerV2",
            label: "Section Viewer V2",
            icon: LayoutTemplate,
            component: SectionViewerV2Panel,
            props: { content: textResponse, taskId }
        },
        {
            id: "linesViewer",
            label: "Lines Viewer",
            icon: LayoutTemplate,
            component: LinesViewerPanel,
            props: { content: textResponse, taskId }
        },
        {
            id: "sectionsViewer",
            label: "Sections Viewer",
            icon: LayoutTemplate,
            component: SectionsViewerPanel,
            props: { content: textResponse, taskId }
        },
        {
            id: "headersViewer",
            label: "Headers Viewer",
            icon: LayoutTemplate,
            component: HeadersViewerPanel,
            props: { content: textResponse, taskId }
        },
        {
            id: "sectionTextsViewer",
            label: "Section Texts Viewer",
            icon: LayoutTemplate,
            component: SectionTextsViewerPanel,
            props: { content: textResponse, taskId }
        }
    ];

    return (
        <Card className="mt-1 bg-gray-100 dark:bg-gray-800 rounded-3xl border border-gray-300 dark:border-gray-600">
            <CardHeader className="p-0">
                <div className="flex items-center justify-between px-2 py-4">
                    <CardTitle>Panel Response</CardTitle>
                    <div className="flex items-center gap-2">
                        <MarkdownCopyButton markdownContent={textResponse} className="ml-2" />
                    </div>
                </div>
            </CardHeader>
            
            <div className="px-2 py-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-2 gap-1 bg-transparent flex-wrap">
                        {tabs.map((tab) => (
                            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    
                    {tabs.map((tab) => (
                        <TabsContent key={tab.id} value={tab.id} className="mt-4">
                            <div className="w-full h-96 border border-gray-300 dark:border-gray-600 rounded-lg">
                                <tab.component {...tab.props as any} />
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </Card>
    );
}

export default SocketPanelResponse;