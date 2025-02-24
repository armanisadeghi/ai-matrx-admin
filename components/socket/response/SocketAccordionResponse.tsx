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
    ScrollArea
} from '@/components/ui';
import {RefObject, useEffect, useState} from 'react';
import { SocketHook } from "@/lib/redux/socket/hooks/useSocket";

interface SocketResponseProps {
    socketHook: SocketHook;
}

export function SocketAccordionResponse(
    {
        socketHook
    }: SocketResponseProps) {
    const [accordionValue, setAccordionValue] = useState<string | undefined>(undefined);

    const {
        streamingResponse,
        responses,
        responseRef,
        isResponseActive
    } = socketHook;

    useEffect(() => {
        if (isResponseActive) {
            setAccordionValue('response');
        }
    }, [isResponseActive]);

    // Remove any "STREAM_END" from the streaming response
    const cleanStreamingResponse = streamingResponse.replace(/STREAM_END/g, '');

    return (
        <Card className="mt-4">
            <Accordion
                type="single"
                collapsible
                value={accordionValue}
                onValueChange={setAccordionValue}
            >
                <AccordionItem value="response">
                    <CardHeader className="p-0">
                        <AccordionTrigger className="px-6 py-4">
                            <CardTitle>Response</CardTitle>
                        </AccordionTrigger>
                    </CardHeader>
                    <AccordionContent>
                        <div className="px-6 py-4">
                            <Tabs defaultValue="stream">
                                <TabsList>
                                    <TabsTrigger value="stream">Streaming</TabsTrigger>
                                    <TabsTrigger value="structured">Structured</TabsTrigger>
                                </TabsList>
                                <TabsContent value="stream">
                                    <ScrollArea className="w-full rounded-md border p-4">
                                        <div ref={responseRef} className="whitespace-pre-wrap font-mono">
                                            {cleanStreamingResponse}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                                <TabsContent value="structured">
                                    <ScrollArea className="w-full rounded-md border p-4">
                                        <div className="space-y-2">
                                            {responses.map((response, index) => (
                                                <div key={index} className="font-mono">
                                                    {JSON.stringify(response, null, 2)}
                                                </div>
                                            ))}
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
