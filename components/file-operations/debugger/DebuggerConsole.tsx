'use client';

import React, { useEffect, useState } from 'react';
import StorageDebugger from '@/utils/supabase/StorageDebugger';

interface DebugEvent {
    operation: string;
    data: unknown;
    error?: unknown;
    duration: number;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

const DebuggerConsole: React.FC = () => {
    const [events, setEvents] = useState<DebugEvent[]>([]);

    useEffect(() => {
        const debuggerInstance = StorageDebugger.getInstance();

        const handleNewEvent = (event: DebugEvent) => {
            setEvents((prevEvents) => [event, ...prevEvents]);
        };

        debuggerInstance.on('operation', handleNewEvent);

        return () => {
            debuggerInstance.off('operation', handleNewEvent);
        };
    }, []);

    return (
        <div className="bg-background text-primary p-4 rounded-md shadow-md">
            <h2 className="text-xl font-bold mb-4">Debugger Console</h2>
            <ul className="space-y-4">
                {events.map((event, index) => (
                    <li key={index} className="p-4 bg-secondary rounded-md shadow">
                        <p><strong>Operation:</strong> {event.operation}</p>
                        <p><strong>Timestamp:</strong> {event.timestamp}</p>
                        <p><strong>Duration:</strong> {event.duration}ms</p>
                        <p><strong>Data:</strong> {JSON.stringify(event.data, null, 2)}</p>
                        {event.error && <p><strong>Error:</strong> {JSON.stringify(event.error, null, 2)}</p>}
                        {event.metadata && <p><strong>Metadata:</strong> {JSON.stringify(event.metadata, null, 2)}</p>}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default DebuggerConsole;
