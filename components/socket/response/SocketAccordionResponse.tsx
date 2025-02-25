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
} from "@/components/ui";
import { useEffect, useState } from "react";
import { SocketHook } from "@/lib/redux/socket/hooks/useSocket";
import { CopyButton } from "@/components/matrx/buttons/CopyButton";
import DebugViewTab from "./tabs/DebugViewTab";
import StreamOutputTab from "./tabs/StreamOutputTab";
import PropertiesBrowserTab from "./tabs/PropertiesBrowserTab";
import StructuredDataTab from "./tabs/StructuredDataTab";
import RecursivePropertiesBrowser from "./tabs/RecursivePropertiesBrowser";
import JsonToCollapsible from "@/components/matrx/matrx-collapsible/json-to-collapsible";


interface SocketResponseProps {
    socketHook: SocketHook;
}

export function SocketAccordionResponse({ socketHook }: SocketResponseProps) {
    const [accordionValue, setAccordionValue] = useState<string | undefined>(undefined);
    const [selectedObjectIndex, setSelectedObjectIndex] = useState(0);
    const [rawResponse, setRawResponse] = useState<string>("");
    const [displayModes, setDisplayModes] = useState<Record<string, boolean>>({});
    const { streamingResponse, responses, responseRef, isResponseActive } = socketHook;

    useEffect(() => {
        if (isResponseActive) {
            setAccordionValue("response");
        }
    }, [isResponseActive]);

    // Update raw response when streaming or responses change
    useEffect(() => {
        const combined = {
            streamingResponse,
            responses,
        };
        setRawResponse(JSON.stringify(combined, null, 2));
    }, [streamingResponse, responses]);

    // Remove any "STREAM_END" from the streaming response
    const cleanStreamingResponse = streamingResponse.replace(/STREAM_END/g, "");

    // Safe stringify for any JS value
    const safeStringify = (value: any, indent = 2): string => {
        try {
            return JSON.stringify(value, null, indent);
        } catch (error) {
            return `[Unable to stringify: ${error}]`;
        }
    };

    // Get flattened object properties for the properties browser
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

    const selectedObject = responses[selectedObjectIndex] || {};
    const objectProperties = getObjectProperties(selectedObject);

    const toggleDisplayMode = (propPath: string) => {
        setDisplayModes((prev) => ({
            ...prev,
            [propPath]: !prev[propPath],
        }));
    };

    return (
        <Card className="mt-4 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600">
            <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue}>
                <AccordionItem value="response">
                    <CardHeader className="p-0">
                        <div className="flex items-center justify-between px-6 py-4">
                            <AccordionTrigger className="flex-1">
                                <CardTitle>Response</CardTitle>
                            </AccordionTrigger>
                            <div onClick={(e) => e.stopPropagation()}>
                                <CopyButton content={rawResponse} label="Copy Raw" className="ml-2" />
                            </div>
                        </div>
                    </CardHeader>
                    <AccordionContent>
                        <div className="px-6 py-4">
                            <Tabs defaultValue="stream">
                                <TabsList className="mb-2">
                                    <TabsTrigger value="stream">Stream Output</TabsTrigger>
                                    <TabsTrigger value="structured">Structured Data ({responses.length})</TabsTrigger>
                                    <TabsTrigger value="propertiesBrowser" disabled={responses.length === 0}>
                                        Properties Browser
                                    </TabsTrigger>
                                    <TabsTrigger value="properties">Recursive Properties Browser</TabsTrigger>
                                    <TabsTrigger value="jsonToCollapsible">JSON to Collapsible</TabsTrigger>
                                    <TabsTrigger value="debug">Debug View</TabsTrigger>
                                </TabsList>

                                {/* Stream Output Tab */}
                                <StreamOutputTab cleanStreamingResponse={cleanStreamingResponse} responseRef={responseRef} />

                                {/* Structured Data Tab */}
                                <StructuredDataTab responses={responses} safeStringify={safeStringify} />

                                {/* Properties Browser Tab */}
                                <PropertiesBrowserTab
                                    responses={responses}
                                    selectedObjectIndex={selectedObjectIndex}
                                    setSelectedObjectIndex={setSelectedObjectIndex}
                                    selectedObject={selectedObject}
                                    objectProperties={objectProperties}
                                    displayModes={displayModes}
                                    toggleDisplayMode={toggleDisplayMode}
                                    safeStringify={safeStringify}
                                />
                                <RecursivePropertiesBrowser
                                    responses={responses}
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
                                        className="max-w-xl border border-gray-300 dark:border-gray-600 rounded-2xl  p-2 pr-4"
                                    />
                                </TabsContent>

                                {/* Debug View Tab */}
                                <DebugViewTab
                                    responses={responses}
                                    streamingResponse={streamingResponse}
                                    rawResponse={rawResponse}
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
