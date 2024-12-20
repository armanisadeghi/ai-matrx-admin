'use client'

import { useStorageExplorer } from '@/hooks/file-operations/useStorageExplorer';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState } from 'react';
import StorageHeader from "@/components/file-operations/StorageHeader";
import StorageOperations from '@/components/file-operations/StorageOperations';
import { StatusDisplay, ItemDetailsDisplay } from '@/components/file-operations/StatusDisplay';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LogEntry {
    message: string;
    type: 'success' | 'error' | 'info';
    timestamp: string;
}

interface ApiDebugEntry {
    operation: string;
    request?: unknown;
    response: unknown;
    error?: unknown;
    timestamp: string;
}

export default function StorageTestingPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [statusView, setStatusView] = useState<'overview' | 'details'>('overview');
    const [apiDebugEntries, setApiDebugEntries] = useState<ApiDebugEntry[]>([]);
    const [debugView, setDebugView] = useState<'formatted' | 'raw'>('formatted');

    const addLog = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setLogs(prev => [{
            message,
            type,
            timestamp: new Date().toISOString()
        }, ...prev]);
    };

    const addApiDebugEntry = (operation: string, response: unknown, error?: unknown, request?: unknown) => {
        setApiDebugEntries(prev => [{
            operation,
            request,
            response,
            error,
            timestamp: new Date().toISOString()
        }, ...prev]);
    };

    const storageExplorer = useStorageExplorer({
        onLog: addLog,
        onApiResponse: addApiDebugEntry
    });

    const {
        currentBucket,
        currentPath,
        isLoading,
        error,
        items,
        selectedItem
    } = storageExplorer;

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertDescription>
                    Failed to initialize storage: {error}
                </AlertDescription>
            </Alert>
        );
    }

    const renderDebugContent = (entry: ApiDebugEntry) => {
        if (debugView === 'raw') {
            return (
                <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(entry, null, 2)}
                </pre>
            );
        }

        return (
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="font-medium">{entry.operation}</span>
                    <span className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                </div>
                {entry.request && (
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Request:</div>
                        <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                            {JSON.stringify(entry.request, null, 2)}
                        </pre>
                    </div>
                )}
                <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Response:</div>
                    <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                        {JSON.stringify(entry.response, null, 2)}
                    </pre>
                </div>
                {entry.error && (
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-destructive">Error:</div>
                        <pre className="text-xs bg-destructive/10 text-destructive p-2 rounded-md overflow-x-auto">
                            {JSON.stringify(entry.error, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col space-y-2">
            <StorageHeader
                explorer={storageExplorer}
                logs={logs}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
                <div className="md:col-span-3">
                    <Card className="p-4">
                        {currentBucket ? (
                            <StorageOperations
                                explorer={storageExplorer}
                            />
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Please select a bucket to begin
                            </div>
                        )}
                    </Card>
                    <Card className="flex-1">
                        <div className="border-b p-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-medium">API Debug Console</h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setApiDebugEntries([])}
                                        className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20"
                                    >
                                        Clear
                                    </button>
                                    <select
                                        value={debugView}
                                        onChange={(e) => setDebugView(e.target.value as 'formatted' | 'raw')}
                                        className="text-xs px-2 py-1 rounded border bg-background"
                                    >
                                        <option value="formatted">Formatted</option>
                                        <option value="raw">Raw</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <ScrollArea className="h-[600px]">
                            <div className="p-4 space-y-4">
                                {apiDebugEntries.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        No API calls recorded yet. Perform storage operations to see the responses.
                                    </div>
                                ) : (
                                    apiDebugEntries.map((entry, index) => (
                                        <Card key={index} className="p-4">
                                            {renderDebugContent(entry)}
                                        </Card>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </Card>

                </div>

                <div className="lg:col-span-1 space-y-3">
                    <Tabs value={statusView} onValueChange={(v: 'overview' | 'details') => setStatusView(v)}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="details" disabled={!selectedItem}>
                                Details
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="mt-2">
                            <StatusDisplay
                                currentBucket={currentBucket}
                                currentPath={currentPath}
                                items={items}
                                selectedItem={selectedItem}
                            />
                        </TabsContent>

                        <TabsContent value="details" className="mt-2">
                            {selectedItem && (
                                <ItemDetailsDisplay item={selectedItem} />
                            )}
                        </TabsContent>
                    </Tabs>

                    <Card className="p-4">
                        <h3 className="font-medium mb-2">Recent Activity</h3>
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                                {logs.map((log, index) => (
                                    <div
                                        key={index}
                                        className={`text-sm p-2 rounded ${
                                            log.type === 'error'
                                                ? 'bg-destructive/10 text-destructive'
                                                : log.type === 'success'
                                                    ? 'bg-green-500/10 text-green-500'
                                                    : 'bg-muted'
                                        }`}
                                    >
                                        <div className="text-xs opacity-70">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </div>
                                        {log.message}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </Card>
                </div>
            </div>

        </div>
    );
}