// components/FileManager/FileManagerDebugger.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export const FileManagerDebugger: React.FC = () => {
    const debuggerRef = React.useRef<HTMLDivElement>(null);
    const [logs, setLogs] = React.useState<any[]>([]);

    // Subscribe to debug events
    React.useEffect(() => {
        const handleDebugEvent = (event: CustomEvent) => {
            setLogs(prev => [...prev, event.detail]);
            // Scroll to bottom
            if (debuggerRef.current) {
                debuggerRef.current.scrollTop = debuggerRef.current.scrollHeight;
            }
        };

        window.addEventListener('storage-debug', handleDebugEvent as EventListener);
        return () => {
            window.removeEventListener('storage-debug', handleDebugEvent as EventListener);
        };
    }, []);

    return (
        <Card className="m-4 h-48">
            <ScrollArea className="h-full p-4" ref={debuggerRef}>
                <h3 className="text-lg font-medium mb-2">Debug Log</h3>
                {logs.map((log, index) => (
                    <div key={index} className="text-sm font-mono mb-2">
                        <span className="text-muted-foreground">
                            {new Date(log.timestamp).toISOString()}
                        </span>
                        <span className="mx-2">-</span>
                        <span className={`font-medium ${log.success ? 'text-green-500' : 'text-red-500'}`}>
                            {log.operation}
                        </span>
                        <pre className="mt-1 text-xs">
                            {JSON.stringify(log.data, null, 2)}
                        </pre>
                    </div>
                ))}
            </ScrollArea>
        </Card>
    );
};