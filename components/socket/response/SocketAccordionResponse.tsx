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
    Input,
    Label,
    Button,
    Textarea,
} from "@/components/ui";
import { useEffect, useState } from "react";
import { SocketHook } from "@/lib/redux/socket/hooks/useSocket";
import { CopyButton } from "@/app/(authenticated)/tests/socket-tests/socket-final-test/components/CopyButton";

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
        setDisplayModes(prev => ({
            ...prev,
            [propPath]: !prev[propPath]
        }));
    };

    return (
        <Card className="mt-4">
            <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue}>
                <AccordionItem value="response">
                    <CardHeader className="p-0">
                        <AccordionTrigger className="px-6 py-4">
                            <CardTitle className="flex items-center gap-4">
                                Response
                                <CopyButton content={rawResponse} label="Copy Raw" className="ml-2" />
                            </CardTitle>
                        </AccordionTrigger>
                    </CardHeader>
                    <AccordionContent>
                        <div className="px-6 py-4">
                            <Tabs defaultValue="stream">
                                <TabsList className="mb-2">
                                    <TabsTrigger value="stream">Stream Output</TabsTrigger>
                                    <TabsTrigger value="structured">Structured Data ({responses.length})</TabsTrigger>
                                    <TabsTrigger value="properties" disabled={responses.length === 0}>
                                        Properties Browser
                                    </TabsTrigger>
                                    <TabsTrigger value="debug">Debug View</TabsTrigger>
                                </TabsList>
                                {/* Stream Output Tab - Shows streaming response text or stringified objects */}
                                <TabsContent value="stream">
                                    <div className="flex justify-end mb-1">
                                        <CopyButton content={cleanStreamingResponse} label="Copy Stream" />
                                    </div>
                                    <ScrollArea className="w-full rounded-md border p-4 h-96">
                                        <div ref={responseRef} className="whitespace-pre-wrap font-mono text-xs">
                                            {cleanStreamingResponse || (
                                                <span className="text-gray-500 italic">No streaming data available</span>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                                {/* Structured Data Tab - Shows parsed JSON objects */}
                                <TabsContent value="structured">
                                    <ScrollArea className="w-full rounded-md border p-4 h-96">
                                        {responses.length > 0 ? (
                                            <div className="space-y-4">
                                                {responses.map((response, index) => (
                                                    <div key={index} className="p-2 border rounded bg-gray-50 dark:bg-gray-800">
                                                        <div className="flex justify-between items-center font-semibold text-xs mb-1 text-gray-600 dark:text-gray-400">
                                                            <span>Response {index + 1}:</span>
                                                            <CopyButton content={safeStringify(response)} />
                                                        </div>
                                                        <pre className="font-mono text-xs whitespace-pre-wrap">
                                                            {safeStringify(response)}
                                                        </pre>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center p-4 text-gray-500 italic">No structured data received</div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>
                                {/* Properties Browser Tab - Shows object properties in a form-like view */}
                                <TabsContent value="properties">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center">
                                            <Label className="mr-2 text-xs">Select Object:</Label>
                                            <select
                                                className="px-2 py-1 text-xs border rounded bg-gray-100 dark:bg-gray-700"
                                                value={selectedObjectIndex}
                                                onChange={(e) => setSelectedObjectIndex(Number(e.target.value))}
                                            >
                                                {responses.map((_, index) => (
                                                    <option key={index} value={index}>
                                                        Response {index + 1}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <CopyButton content={safeStringify(selectedObject)} label="Copy All" />
                                    </div>
                                    <ScrollArea className="w-full rounded-md border p-4 h-96">
                                        {objectProperties.length > 0 ? (
                                            <div className="space-y-2">
                                                {objectProperties.map((prop, idx) => (
                                                    <div key={idx} className="flex flex-col mb-2">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <Label className="text-xs font-medium" htmlFor={`prop-${idx}`}>
                                                                {prop.path}
                                                            </Label>
                                                            <div className="flex items-center">
                                                                <CopyButton
                                                                    className="mr-2"
                                                                    content={
                                                                        typeof prop.value === "object"
                                                                            ? safeStringify(prop.value)
                                                                            : String(prop.value)
                                                                    }
                                                                />
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-6 px-2 text-xs"
                                                                    onClick={() => toggleDisplayMode(prop.path)}
                                                                >
                                                                    {displayModes[prop.path] ? "Use Input" : "Use Textarea"}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="w-full">
                                                            {displayModes[prop.path] ? (
                                                                <Textarea
                                                                    id={`prop-${idx}`}
                                                                    className="text-xs font-mono resize-y min-h-8"
                                                                    value={
                                                                        typeof prop.value === "object"
                                                                            ? safeStringify(prop.value)
                                                                            : String(prop.value)
                                                                    }
                                                                    readOnly
                                                                />
                                                            ) : (
                                                                <Input
                                                                    id={`prop-${idx}`}
                                                                    className="text-xs h-8 font-mono"
                                                                    value={
                                                                        typeof prop.value === "object"
                                                                            ? safeStringify(prop.value)
                                                                            : String(prop.value)
                                                                    }
                                                                    readOnly
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center p-4 text-gray-500 italic">No properties to display</div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>
                                {/* Debug View Tab - Shows combined raw data for debugging */}
                                <TabsContent value="debug">
                                    <ScrollArea className="w-full rounded-md border p-4 h-96">
                                        <div className="space-y-4">
                                            <div className="p-2 border rounded bg-gray-50 dark:bg-gray-800">
                                                <div className="flex justify-between items-center font-semibold text-xs mb-1 text-gray-600 dark:text-gray-400">
                                                    <span>Debug Info:</span>
                                                </div>
                                                <div className="space-y-2 text-xs">
                                                    <div>
                                                        <span className="font-semibold">Responses Count:</span> {responses.length}
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold">Streaming Response Length:</span>{" "}
                                                        {streamingResponse.length} characters
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold">Response Types:</span>{" "}
                                                        {responses.map((r, i) => `[${i}]: ${typeof r}`).join(", ") || "None"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-2 border rounded bg-gray-50 dark:bg-gray-800">
                                                <div className="flex justify-between items-center font-semibold text-xs mb-1 text-gray-600 dark:text-gray-400">
                                                    <span>Raw Streaming Response:</span>
                                                    <CopyButton content={streamingResponse} />
                                                </div>
                                                <pre className="font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                                                    {streamingResponse || <span className="text-gray-500 italic">Empty</span>}
                                                </pre>
                                            </div>
                                            <div className="p-2 border rounded bg-gray-50 dark:bg-gray-800">
                                                <div className="flex justify-between items-center font-semibold text-xs mb-1 text-gray-600 dark:text-gray-400">
                                                    <span>Raw Responses Array:</span>
                                                    <CopyButton content={safeStringify(responses)} />
                                                </div>
                                                <pre className="font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                                                    {safeStringify(responses)}
                                                </pre>
                                            </div>
                                            <div className="p-2 border rounded bg-gray-50 dark:bg-gray-800">
                                                <div className="flex justify-between items-center font-semibold text-xs mb-1 text-gray-600 dark:text-gray-400">
                                                    <span>Complete Raw Response:</span>
                                                    <CopyButton content={rawResponse} />
                                                </div>
                                                <pre className="font-mono text-xs overflow-x-auto whitespace-pre-wrap">{rawResponse}</pre>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
}

export default SocketAccordionResponse;