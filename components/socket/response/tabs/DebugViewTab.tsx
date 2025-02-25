import React from 'react';
import { TabsContent, ScrollArea } from "@/components/ui";
import { CopyButton } from "@/components/matrx/buttons/CopyButton";

interface DebugViewTabProps {
    responses: any[];
    streamingResponse: string;
    rawResponse: string;
    safeStringify: (value: any, indent?: number) => string;
}

const DebugViewTab = ({ responses, streamingResponse, rawResponse, safeStringify }: DebugViewTabProps) => {
    return (
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
    );
};

export default DebugViewTab;