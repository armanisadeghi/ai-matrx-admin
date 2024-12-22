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

const DebuggerConsole = ({ height = 'h-96' }) => {
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
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle>Debug Console</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className={`${height} pr-4`}>
                    <div className="space-y-4">
                        {events.map((event, index) => (
                            <Card key={index} className="p-4 bg-muted">
                                <div className="space-y-2">
                                    <div className="font-medium">{event.operation}</div>
                                    <div className="text-sm space-y-1">
                                        <div>
                                            <span className="font-medium">Request: </span>
                                            <span className="font-mono text-xs">
                                            {JSON.stringify(event.request, null, 2)}
                                          </span>
                                        </div>
                                        <div>
                                            <span className="font-medium">Response: </span>
                                            <span className="font-mono text-xs">
                                            {JSON.stringify(event.response, null, 2)}
                                          </span>
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
