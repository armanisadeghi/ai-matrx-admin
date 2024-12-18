// components/storage-testing/StorageTestUI.tsx
'use client'

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BucketOperations from './BucketOperations';
import FileOperations from './FileOperations';
import BulkOps from './BulkOps';
import UtilityOperations from './UtilityOperations';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StorageClient } from '@/utils/supabase/bucket-manager';

interface LogEntry {
    message: string;
    type: 'success' | 'error' | 'info';
    timestamp: string;
}

export default function StorageTestUI() {
    const [currentBucket, setCurrentBucket] = useState<string>('');
    const [availableBuckets, setAvailableBuckets] = useState<string[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const addLog = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setLogs(prev => [...prev, {
            message,
            type,
            timestamp: new Date().toISOString()
        }]);
    };

    const loadBuckets = async () => {
        try {
            const { data, error } = await StorageClient.listBuckets();
            if (error) throw error;
            const bucketNames = data.map(bucket => bucket.name);
            setAvailableBuckets(bucketNames);
            addLog('Buckets loaded successfully', 'success');
        } catch (error) {
            addLog(`Failed to load buckets: ${error.message}`, 'error');
        }
    };

    useEffect(() => {
        loadBuckets();
    }, []);

    const handleBucketChange = (value: string) => {
        setCurrentBucket(value);
        addLog(`Switched to bucket: ${value}`, 'info');
    };

    return (
        <div className="flex-1 space-y-4">
            <Card className="border-0 shadow-none rounded-none">
                <CardHeader className="px-4 py-2">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Storage Operations Testing</CardTitle>
                        <div className="w-[200px]">
                            <Select
                                value={currentBucket}
                                onValueChange={handleBucketChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select bucket" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableBuckets.map((bucket) => (
                                        <SelectItem key={bucket} value={bucket}>
                                            {bucket}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-3">
                            <Tabs defaultValue="buckets" className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="buckets">Buckets</TabsTrigger>
                                    <TabsTrigger value="files">Files</TabsTrigger>
                                    <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
                                    <TabsTrigger value="utility">Utilities</TabsTrigger>
                                </TabsList>
                                <TabsContent value="buckets">
                                    <BucketOperations
                                        onBucketSelect={handleBucketChange}
                                        addLog={addLog}
                                        onBucketsChange={loadBuckets}
                                    />
                                </TabsContent>
                                <TabsContent value="files">
                                    <FileOperations
                                        currentBucket={currentBucket}
                                        addLog={addLog}
                                    />
                                </TabsContent>
                                <TabsContent value="bulk">
                                    <BulkOps
                                        currentBucket={currentBucket}
                                        addLog={addLog}
                                    />
                                </TabsContent>
                                <TabsContent value="utility">
                                    <UtilityOperations
                                        currentBucket={currentBucket}
                                        addLog={addLog}
                                    />
                                </TabsContent>
                            </Tabs>
                        </div>
                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader className="py-2">
                                    <CardTitle className="text-sm">Operation Logs</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[calc(100vh-300px)] w-full rounded-md border p-2">
                                        {logs.map((log, index) => (
                                            <div
                                                key={index}
                                                className={`mb-2 p-2 rounded text-sm ${
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
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}