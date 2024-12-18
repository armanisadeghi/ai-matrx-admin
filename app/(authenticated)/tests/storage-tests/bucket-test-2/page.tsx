// pages/storage-testing/page.tsx
'use client'

import { useStorageExplorer } from '@/hooks/file-operations/useStorageExplorer';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState } from 'react';
import StorageHeader from "@/components/file-operations/StorageHeader";
import StorageOperations from '@/components/file-operations/StorageOperations';
import { StatusDisplay, ItemDetailsDisplay } from '@/components/file-operations/StatusDisplay';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface LogEntry {
    message: string;
    type: 'success' | 'error' | 'info';
    timestamp: string;
}

export default function StorageTestingPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [statusView, setStatusView] = useState<'overview' | 'details'>('overview');

    const addLog = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setLogs(prev => [{
            message,
            type,
            timestamp: new Date().toISOString()
        }, ...prev]);
    };

    const storageExplorer = useStorageExplorer({
        onLog: addLog
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

    return (
        <div className="min-h-screen space-y-2 p-1">
            <StorageHeader
                explorer={storageExplorer}
                logs={logs}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <div className="lg:col-span-3">
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
                </div>

                <div className="lg:col-span-1 space-y-3">
                    <Tabs value={statusView} onValueChange={(v: 'overview' | 'details') => setStatusView(v)}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger
                                value="details"
                                disabled={!selectedItem}
                            >
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
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
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
                    </Card>
                </div>
            </div>
        </div>
    );
}