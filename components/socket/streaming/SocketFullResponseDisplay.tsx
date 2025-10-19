"use client";
import { useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle, ScrollArea, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { CopyButton } from "@/components/matrx/buttons/CopyButton";
import JsonToCollapsible from "@/components/matrx/matrx-collapsible/json-to-collapsible";
import StreamDisplayOverlay from "./StreamDisplayOverlay";
import { MouseEvent } from "react";
import { useAppSelector } from "@/lib/redux";
import { selectResponseByListenerId } from "@/lib/redux/socket-io";

interface SocketFullResponseDisplayProps {
    title?: string;
    listenerId: string;
    isFullscreen?: boolean;
}

// Fullscreen Component
export const FullScreenFullResponseDisplay = ({ title = "All Response Data", listenerId }: { title?: string; listenerId: string }) => {
    const data = useAppSelector(selectResponseByListenerId(listenerId));
    const jsonString = safeStringify(data);
    const hasContent = Array.isArray(data) ? data.length > 0 : data && typeof data === "object" && Object.keys(data).length > 0;

    return (
        <div className="h-full w-full flex flex-col">
            <Tabs defaultValue="json" className="h-full w-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
                    <h2 className="text-lg font-medium">{title}</h2>
                    <TabsList className="bg-inherit space-x-2">
                        <TabsTrigger className="border border-gray-300 dark:border-gray-500 rounded-xl" value="json">
                            JSON
                        </TabsTrigger>
                        <TabsTrigger className="border border-gray-300 dark:border-gray-500 rounded-xl" value="tree">
                            Tree
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="tree" className="h-full w-full">
                    {hasContent ? (
                        <div className="h-full w-full overflow-auto p-4">
                            <JsonToCollapsible title="" data={data} defaultExpanded={true} className="text-sm font-mono" />
                        </div>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center">
                            <span className="text-gray-500 dark:text-gray-400 italic text-sm">No data available</span>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="json" className="h-full w-full border border-red-500">
                    <pre className="p-4 font-mono whitespace-pre-wrap break-words text-gray-800 dark:text-gray-300 text-sm min-h-full">
                        {jsonString}
                    </pre>
                </TabsContent>
            </Tabs>
        </div>
    );
};

// Non-Fullscreen Component
export const CompactFullResponseDisplay = ({ title = "Data Response", listenerId }: { title?: string; listenerId: string }) => {
    const data = useAppSelector(selectResponseByListenerId(listenerId));
    const jsonString = safeStringify(data);
    const hasContent = Array.isArray(data) ? data.length > 0 : data && typeof data === "object" && Object.keys(data).length > 0;

    const handleInteractiveClick = (e: MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <Card className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <StreamDisplayOverlay title={title} className="" expandIconClassName="top-3 right-12">
                <Tabs defaultValue="json" className="h-full w-full flex flex-col" onClick={handleInteractiveClick}>
                    <CardHeader className="p-2 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-4">
                            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</CardTitle>
                            <TabsList className="bg-inherit h-8">
                                <TabsTrigger
                                    className="border border-gray-300 dark:border-gray-500 rounded-xl h-7 px-3 text-xs"
                                    value="json"
                                >
                                    JSON
                                </TabsTrigger>
                                <TabsTrigger
                                    className="border border-gray-300 dark:border-gray-500 rounded-xl h-7 px-3 text-xs"
                                    value="tree"
                                >
                                    Tree
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        {hasContent && <CopyButton content={jsonString} label="" size="sm" />}
                    </CardHeader>

                    <CardContent className="p-3 pt-0 flex-1">
                        <TabsContent value="tree" className="h-56 overflow-auto">
                            {hasContent ? (
                                <div className="h-full w-full rounded-md border border-gray-200 dark:border-gray-700 bg-textured p-3">
                                    <JsonToCollapsible title="" data={data} defaultExpanded={true} className="text-xs font-mono" />
                                </div>
                            ) : (
                                <div className="h-full w-full rounded-md border border-gray-200 dark:border-gray-700 bg-textured p-3 flex items-center justify-center">
                                    <span className="text-gray-500 dark:text-gray-400 italic text-xs">No data available</span>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="json" className="h-56 overflow-auto">
                            <div className="h-full w-full rounded-md border border-gray-200 dark:border-gray-700 bg-textured overflow-auto">
                                {hasContent ? (
                                    <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-words text-gray-800 dark:text-gray-300">
                                        {jsonString}
                                    </pre>
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <span className="text-gray-500 dark:text-gray-400 italic text-xs">No data available</span>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </StreamDisplayOverlay>
        </Card>
    );
};

const FullResponseDisplay = ({ title = "All Response Data", listenerId, isFullscreen = false }: SocketFullResponseDisplayProps) => {
    return isFullscreen ? <FullScreenFullResponseDisplay title={title} listenerId={listenerId} /> : <CompactFullResponseDisplay title={title} listenerId={listenerId} />;
};

const safeStringify = (value: any, indent = 2): string => {
    try {
        return JSON.stringify(value, null, indent);
    } catch (error) {
        return `[Unable to stringify: ${error}]`;
    }
};

export default FullResponseDisplay;
