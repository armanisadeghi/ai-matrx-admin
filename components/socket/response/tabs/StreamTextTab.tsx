import React, { useRef } from 'react';
import { TabsContent, ScrollArea } from "@/components/ui";
import { CopyButton } from "@/components/matrx/buttons/CopyButton";

interface StreamOutputTabProps {
    streamingResponse: string;
    responseRef: React.RefObject<HTMLDivElement>;
}

const StreamTextTab = ({ streamingResponse, responseRef }: StreamOutputTabProps) => {
    const accumulatedText = useRef<string>('');

    accumulatedText.current += streamingResponse;

    return (
        <TabsContent value="streamText">
            <div className="flex justify-end mb-1">
                <CopyButton content={accumulatedText.current} />
            </div>
            <ScrollArea className="w-full rounded-md border p-4 h-96">
                <div ref={responseRef} className="whitespace-pre-wrap font-mono text-xs">
                    {accumulatedText.current || (
                        <span className="text-gray-500 italic">No streaming data available</span>
                    )}
                </div>
            </ScrollArea>
        </TabsContent>
    );
};

export default StreamTextTab;