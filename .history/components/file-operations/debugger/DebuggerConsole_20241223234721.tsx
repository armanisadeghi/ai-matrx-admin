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

    // Function to format JSON with syntax highlighting
    const formatJSON = (obj: unknown) => {
        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        
        try {
            // Convert the object to a formatted string with proper indentation
            const jsonString = JSON.stringify(obj, null, 2);
            
            // Add syntax highlighting
            return jsonString
                .split('\n')
                .map(line => {
                    // Highlight keys
                    line = line.replace(/"([^"]+)":/g, '<span class="text-blue-500">\"$1\"</span>:');
                    // Highlight string values
                    line = line.replace(/: "([^"]+)"/g, ': <span class="text-green-500">\"$1\"</span>');
                    // Highlight numbers
                    line = line.replace(/: (\d+)/g, ': <span class="text-purple-500">$1</span>');
                    // Highlight booleans
                    line = line.replace(/: (true|false)/g, ': <span class="text-yellow-500">$1</span>');
                    // Highlight null
                    line = line.replace(/: (null)/g, ': <span class="text-red-500">$1</span>');
                    return line;
                })
                .join('\n');
        } catch (error) {
            return String(obj);
        }
    };

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
        <Card className="w-full h-full flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle>Debug Console</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow min-h-0">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-4">
                        {events.map((event, index) => (
                            <Card key={index} className="p-4 bg-muted hover:bg-muted/80 transition-colors">
                                <div className="space-y-2">
                                    <div className="font-medium text-primary">{event.operation}</div>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="font-medium mb-1 text-sm text-muted-foreground">Request:</div>
                                            <pre 
                                                className="font-mono text-xs bg-background rounded-lg p-3 overflow-x-auto"
                                                dangerouslySetInnerHTML={{ 
                                                    __html: formatJSON(event.request) 
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <div className="font-medium mb-1 text-sm text-muted-foreground">Response:</div>
                                            <pre 
                                                className="font-mono text-xs bg-background rounded-lg p-3 overflow-x-auto"
                                                dangerouslySetInnerHTML={{ 
                                                    __html: formatJSON(event.response) 
                                                }}
                                            />
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