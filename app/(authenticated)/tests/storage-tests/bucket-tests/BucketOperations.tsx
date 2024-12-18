// components/storage-testing/BucketOperations.tsx

import {useState, useEffect, useRef} from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StorageClient } from '@/utils/supabase/bucket-manager';
import {FileList} from "@/app/(authenticated)/tests/storage-tests/bucket-tests/FileList";

interface BucketOperationsProps {
    onBucketSelect: (bucket: string) => void;
    addLog: (message: string, type: 'success' | 'error' | 'info') => void;
    onBucketsChange: () => void;
}

export default function BucketOperations({ onBucketSelect, addLog, onBucketsChange }: BucketOperationsProps) {
    const [newBucketName, setNewBucketName] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [buckets, setBuckets] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadBuckets();
    }, []);

    const handleBucketSelect = (bucket: string) => {
        setSelectedBucket(bucket);
        onBucketSelect(bucket);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedBucket) return;

        const storage = new StorageClient(selectedBucket);
        try {
            const { data, error } = await storage.upload(file.name, file, {
                cacheControl: '3600',
                upsert: true
            });

            if (error) throw error;
            addLog(`File uploaded successfully to ${data.path}`, 'success');
        } catch (error) {
            addLog(`Upload failed: ${error.message}`, 'error');
        }
    };

    const loadBuckets = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const { data, error } = await StorageClient.listBuckets();
            if (error) throw error;
            setBuckets(data.map(bucket => bucket.name));
            addLog('Buckets loaded successfully', 'success');
        } catch (error) {
            setError(error.message);
            addLog(`Failed to load buckets: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const createBucket = async () => {
        if (!newBucketName.trim()) {
            addLog('Bucket name cannot be empty', 'error');
            return;
        }

        try {
            const { data, error } = await StorageClient.createBucket(newBucketName, {
                public: isPublic,
                allowedMimeTypes: null, // You can make this configurable if needed
                fileSizeLimit: null // You can make this configurable if needed
            });

            if (error) throw error;

            addLog(`Bucket "${newBucketName}" created successfully`, 'success');
            setNewBucketName('');
            setIsPublic(false);
            onBucketsChange();
        } catch (error) {
            addLog(`Failed to create bucket: ${error.message}`, 'error');
        }
    };

    const deleteBucket = async (bucketName: string) => {
        if (!confirm(`Are you sure you want to delete bucket "${bucketName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const { error } = await StorageClient.deleteBucket(bucketName);
            if (error) throw error;
            addLog(`Bucket "${bucketName}" deleted successfully`, 'success');
            onBucketsChange();
        } catch (error) {
            addLog(`Failed to delete bucket: ${error.message}`, 'error');
        }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="newBucketName">New Bucket Name</Label>
                                <Input
                                    id="newBucketName"
                                    value={newBucketName}
                                    onChange={(e) => setNewBucketName(e.target.value)}
                                    placeholder="Enter bucket name"
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="isPublic">Public Access</Label>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="isPublic"
                                        checked={isPublic}
                                        onCheckedChange={setIsPublic}
                                    />
                                    <Label htmlFor="isPublic" className="cursor-pointer">
                                        {isPublic ? 'Public' : 'Private'}
                                    </Label>
                                </div>
                            </div>
                        </div>
                        <Button
                            onClick={createBucket}
                            disabled={!newBucketName.trim() || isLoading}
                        >
                            Create Bucket
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Existing Buckets</h3>
                            <Button
                                variant="outline"
                                onClick={loadBuckets}
                                disabled={isLoading}
                                className="min-w-[100px]"
                            >
                                {isLoading ? 'Loading...' : 'Refresh'}
                            </Button>
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid gap-2">
                            {isLoading ? (
                                <div className="text-center py-4 text-muted-foreground">
                                    Loading buckets...
                                </div>
                            ) : buckets.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground">
                                    No buckets found. Create one to get started.
                                </div>
                            ) : (
                                buckets.map((bucket) => (
                                    <div
                                        key={bucket}
                                        className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 transition-colors"
                                    >
                                        <span className="font-mono">{bucket}</span>
                                        <div className="space-x-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => onBucketSelect(bucket)}
                                                className="min-w-[80px]"
                                            >
                                                Select
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={() => deleteBucket(bucket)}
                                                className="min-w-[80px]"
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
            {selectedBucket && (
                <>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium">
                                        Files in {selectedBucket}
                                    </h3>
                                    <div className="space-x-2">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            Upload File
                                        </Button>
                                    </div>
                                </div>
                                <FileList
                                    bucketName={selectedBucket}
                                    addLog={addLog}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
