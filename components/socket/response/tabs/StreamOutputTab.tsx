import React from 'react';
import { TabsContent, ScrollArea } from "@/components/ui";
import { CopyButton } from "@/components/matrx/buttons/CopyButton";

interface StreamOutputTabProps {
    cleanStreamingResponse: string;
    responseRef: React.RefObject<HTMLDivElement>;
}

const StreamOutputTab = ({ cleanStreamingResponse, responseRef }: StreamOutputTabProps) => {
    return (
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
    );
};

export default StreamOutputTab;