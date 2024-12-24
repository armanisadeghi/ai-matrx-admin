'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import StorageDebugger from '@/utils/file-operations/StorageDebugger';

interface DebugEvent {
    operation: string;
    request: unknown;
    response: unknown;
}

const DebuggerConsole = () => {
    const [events, setEvents] = useState<DebugEvent[]>([]);

    useEffect(() => {
        const debuggerInstance = StorageDebugger.getInstance();

        const handleOperation = (event: DebugEvent) => {
            setEvents(prev => [event, ...prev]);
        };

        debuggerInstance.on('operation', handleOperation);
        return () => {
            debuggerInstance.off('operation', handleOperation);
        };
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Debug Console</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea>
                    <div>
                        {events.map((event, index) => (
                            <Card key={index} className="mb-4">
                                <div className="p-4">
                                    <div className="font-medium">{event.operation}</div>
                                    <div>
                                        <div>
                                            <span className="font-medium">Request: </span>
                                            <pre className="whitespace-pre-wrap overflow-x-auto">
                                                {JSON.stringify(event.request, null, 2)}
                                            </pre>
                                        </div>
                                        <div>
                                            <span className="font-medium">Response: </span>
                                            <pre className="whitespace-pre-wrap overflow-x-auto">
                                                {JSON.stringify(event.response, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default DebuggerConsole;