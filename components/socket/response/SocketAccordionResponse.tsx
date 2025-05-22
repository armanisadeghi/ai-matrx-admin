import {
    Card,
    CardHeader,
    CardTitle,
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    ScrollArea,
} from "@/components/ui";
import { useState, useMemo, useEffect } from "react";
import { MarkdownCopyButton } from "@/components/matrx/buttons/MarkdownCopyButton";
import DebugViewTab from "./tabs/DebugViewTab";
import PropertiesBrowserTab from "./tabs/PropertiesBrowserTab";
import StructuredDataTab from "./tabs/StructuredDataTab";
import RecursivePropertiesBrowser from "./tabs/RecursivePropertiesBrowser";
import JsonToCollapsible from "@/components/matrx/matrx-collapsible/json-to-collapsible";
import StreamTextTab from "./tabs/StreamTextTab";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";
import FullscreenWrapper from "@/components/matrx/FullscreenWrapper";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import FullscreenMarkdownEditor from "@/components/mardown-display/markdown-classification/FullscreenMarkdownEditor";
import {
    selectTaskResponsesByTaskId,
    selectResponseTextByListenerId,
    selectResponseDataByListenerId,
    selectResponseInfoByListenerId,
    selectResponseErrorsByListenerId,
    selectHasResponseErrorsByListenerId,
    selectResponseEndedByListenerId,
    selectAllResponses,
} from "@/lib/redux/socket-io";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { selectTaskFirstListenerId } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { brokerActions } from "@/lib/redux/brokerSlice";
import ProcessorExtractor from "@/components/official/processor-extractor/ProcessorExtractor";

export function SocketAccordionResponse({ taskId }: { taskId: string }) {
    // Change this line to set the default value to "response"
    const [accordionValue, setAccordionValue] = useState<string | undefined>("response");
    const [selectedObjectIndex, setSelectedObjectIndex] = useState(0);
    const [displayModes, setDisplayModes] = useState<Record<string, boolean>>({});
    const dispatch = useAppDispatch();

    const firstListenerId = useAppSelector((state) => selectTaskFirstListenerId(state, taskId));
    const allResponses = useAppSelector(selectAllResponses);
    const socketResponse = useAppSelector(selectTaskResponsesByTaskId(taskId));
    const textResponse = useAppSelector(selectResponseTextByListenerId(firstListenerId));
    const dataResponse = useAppSelector(selectResponseDataByListenerId(firstListenerId));
    const infoResponse = useAppSelector(selectResponseInfoByListenerId(firstListenerId));
    const errorsResponse = useAppSelector(selectResponseErrorsByListenerId(firstListenerId));
    const hasErrors = useAppSelector(selectHasResponseErrorsByListenerId(firstListenerId));
    const hasEnded = useAppSelector(selectResponseEndedByListenerId(firstListenerId));


    // Rest of your component remains the same
    const safeStringify = (value: any, indent = 2): string => {
        try {
            return JSON.stringify(value, null, indent);
        } catch (error) {
            return `[Unable to stringify: ${error}]`;
        }
    };

    const getObjectProperties = (obj: any, prefix = ""): { key: string; path: string; value: any }[] => {
        if (!obj || typeof obj !== "object") return [];
        return Object.entries(obj).flatMap(([key, value]) => {
            const path = prefix ? `${prefix}.${key}` : key;
            if (value && typeof value === "object" && !Array.isArray(value)) {
                return [{ key, path, value }, ...getObjectProperties(value, path)];
            }
            return [{ key, path, value }];
        });
    };

    const selectedObject = useMemo(() => socketResponse[selectedObjectIndex] || {}, [socketResponse, selectedObjectIndex]);
    const objectProperties = useMemo(() => getObjectProperties(selectedObject), [selectedObject]);

    const toggleDisplayMode = (propPath: string) => {
        setDisplayModes((prev) => ({
            ...prev,
            [propPath]: !prev[propPath],
        }));
    };

    return (
        <Card className="mt-1 bg-gray-100 dark:bg-gray-800 rounded-3xl border border-gray-300 dark:border-gray-600">
            <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue}>
                <AccordionItem value="response">
                    <CardHeader className="p-0">
                        <div className="flex items-center justify-between px-2 py-4">
                            <AccordionTrigger className="flex-1">
                                <CardTitle>Response</CardTitle>
                            </AccordionTrigger>
                            <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                                <FullscreenMarkdownEditor
                                    initialMarkdown={textResponse}
                                    triggerLabel="Edit Markdown"
                                    triggerClassName={`border border-gray-300 dark:border-gray-600 rounded-md ${textResponse.length <= 1 ? 'opacity-50 pointer-events-none' : ''}`}
                                    showSampleSelector={false}
                                    showConfigSelector={true}
                                />
                                <MarkdownCopyButton markdownContent={textResponse} className="ml-2" />
                            </div>
                        </div>
                    </CardHeader>
                    <AccordionContent>
                        <div className="px-2 py-4">
                            <Tabs defaultValue="streamText">
                                <TabsList className="mb-2 gap-1 bg-transparent">
                                    <TabsTrigger
                                        value="streamText"
                                    >
                                        Text
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="markdown"
                                    >
                                        Markdown
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="structured"
                                    >
                                        Structured ({socketResponse.length})
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="rawJsonExplorer"
                                    >
                                        Explorer
                                    </TabsTrigger>
                                    <TabsTrigger
                                        disabled={socketResponse.length === 0}
                                        value="propertiesBrowser"
                                    >
                                        Browser
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="properties"
                                    >
                                        Recursive
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="jsonToCollapsible"
                                    >
                                        Collapsible
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="debug"
                                    >
                                        Debug
                                    </TabsTrigger>
                                </TabsList>
                                <StreamTextTab streamingResponse={textResponse} />
                                <TabsContent value="markdown">
                                    <ScrollArea className="w-full rounded-md border p-4 h-full">
                                        {textResponse.length > 1 && (
                                            <FullscreenWrapper
                                                buttonPosition="top-right-inside"
                                                expandButtonTitle="View in fullscreen"
                                                closeButtonTitle="Exit fullscreen"
                                            >
                                                <div className="relative">
                                                    <MarkdownRenderer content={textResponse} type="message" />
                                                </div>
                                            </FullscreenWrapper>
                                        )}
                                    </ScrollArea>
                                </TabsContent>
                                {/* Structured Data Tab */}
                                <StructuredDataTab responses={socketResponse} safeStringify={safeStringify} />
                                {/* Properties Browser Tab */}
                                <PropertiesBrowserTab
                                    responses={socketResponse}
                                    selectedObjectIndex={selectedObjectIndex}
                                    setSelectedObjectIndex={setSelectedObjectIndex}
                                    selectedObject={selectedObject}
                                    objectProperties={objectProperties}
                                    displayModes={displayModes}
                                    toggleDisplayMode={toggleDisplayMode}
                                    safeStringify={safeStringify}
                                />
                                <RecursivePropertiesBrowser
                                    responses={socketResponse}
                                    selectedObjectIndex={selectedObjectIndex}
                                    setSelectedObjectIndex={setSelectedObjectIndex}
                                    selectedObject={selectedObject}
                                    displayModes={displayModes}
                                    toggleDisplayMode={toggleDisplayMode}
                                    safeStringify={safeStringify}
                                />
                                <TabsContent value="jsonToCollapsible">
                                    <JsonToCollapsible
                                        title="JSON to Collapsible"
                                        data={selectedObject}
                                        defaultExpanded={true}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-2xl  p-2 pr-4"
                                    />
                                </TabsContent>
                                <TabsContent value="rawJsonExplorer">
                                    <div className="w-full border border-gray-300 dark:border-gray-600 rounded-2xl p-2">
                                        {useMemo(() => (
                                            <ProcessorExtractor jsonData={selectedObject} configKey={taskId} />
                                        ), [selectedObject])}
                                    </div>
                                </TabsContent>
                                {/* Debug View Tab */}
                                <DebugViewTab
                                    responses={allResponses}
                                    streamingResponse={textResponse}
                                    rawResponse={dataResponse}
                                    safeStringify={safeStringify}
                                />
                            </Tabs>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
}

export default SocketAccordionResponse;
