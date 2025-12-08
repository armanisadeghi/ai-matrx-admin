"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Search, Loader2, Database, Folder, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/utils/supabase/client";
import { getFileDetailsByUrl, type EnhancedFileDetails } from "@/utils/file-operations/constants";

// Types
type StorageFile = {
    name: string;
    id: string | null;
    type: "file" | "folder";
    metadata?: {
        size?: number;
        mimetype?: string;
        [key: string]: any;
    } | null;
};

type FileSelection = {
    url: string;
    type: string;
    details: EnhancedFileDetails;
};

interface FilesResourcePickerProps {
    onBack: () => void;
    onSelect: (selection: FileSelection) => void;
    allowedBuckets?: string[]; // Optional: filter to specific buckets
}

// Utility functions
function formatSize(bytes: number | undefined): string {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Bucket list hook
function useStorageBuckets() {
    const [buckets, setBuckets] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        async function fetchBuckets() {
            try {
                const { data, error } = await supabase.storage.listBuckets();
                if (error) throw error;
                setBuckets(data.map(bucket => bucket.name));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch buckets');
            } finally {
                setLoading(false);
            }
        }
        fetchBuckets();
    }, []);

    return { buckets, loading, error };
}

// Storage list hook
function useStorageList(bucketName: string, path: string = '') {
    const [items, setItems] = useState<StorageFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!bucketName) {
            setItems([]);
            return;
        }

        async function loadItems() {
            setLoading(true);
            setError('');
            try {
                const { data, error } = await supabase
                    .storage
                    .from(bucketName)
                    .list(path);

                if (error) throw error;

                const formattedItems: StorageFile[] = (data || []).map(item => ({
                    name: item.name,
                    id: item.id,
                    type: item.id === null ? 'folder' : 'file',
                    metadata: item.metadata
                }));

                // Sort: folders first, then alphabetically
                setItems(formattedItems.sort((a, b) => {
                    if (a.type === 'folder' && b.type === 'file') return -1;
                    if (a.type === 'file' && b.type === 'folder') return 1;
                    return a.name.localeCompare(b.name);
                }));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load contents');
            } finally {
                setLoading(false);
            }
        }

        loadItems();
    }, [bucketName, path]);

    return { items, loading, error };
}

// Tree Node Component
function TreeNode({ 
    item, 
    path, 
    bucketName, 
    onFileSelect, 
    level = 0 
}: { 
    item: StorageFile; 
    path: string; 
    bucketName: string; 
    onFileSelect: (path: string, file: StorageFile) => void; 
    level?: number;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const fullPath = path ? `${path}/${item.name}` : item.name;
    
    const { items: children, loading, error } = useStorageList(
        bucketName,
        isOpen && item.type === 'folder' ? fullPath : ''
    );

    const handleClick = () => {
        if (item.type === 'folder') {
            setIsOpen(!isOpen);
        } else {
            onFileSelect(fullPath, item);
        }
    };

    const paddingLeft = level * 1.25;

    return (
        <div>
            <button
                onClick={handleClick}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                style={{ paddingLeft: `${paddingLeft}rem` }}
            >
                <div className="flex items-center min-w-0 w-full">
                    <div className="flex items-center flex-shrink-0">
                        {item.type === 'folder' && (
                            <div className="w-4 h-4 mr-1">
                                {isOpen ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                                ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                                )}
                            </div>
                        )}
                        {item.type === 'folder' ? (
                            <Folder className="h-3.5 w-3.5 mr-2 text-blue-600 dark:text-blue-500" />
                        ) : (
                            <File className="h-3.5 w-3.5 mr-2 text-gray-600 dark:text-gray-400" />
                        )}
                    </div>
                    <span className="text-xs truncate flex-1 text-gray-900 dark:text-gray-100">
                        {item.name}
                    </span>
                    {item.type === 'file' && item.metadata?.size && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                            {formatSize(item.metadata.size)}
                        </span>
                    )}
                </div>
            </button>

            {isOpen && item.type === 'folder' && (
                <div>
                    {loading ? (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 py-1" style={{ paddingLeft: `${(level + 1) * 1.25}rem` }}>
                            Loading...
                        </div>
                    ) : error ? (
                        <div className="text-[10px] text-red-600 dark:text-red-400 py-1" style={{ paddingLeft: `${(level + 1) * 1.25}rem` }}>
                            {error}
                        </div>
                    ) : children.length === 0 ? (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 py-1" style={{ paddingLeft: `${(level + 1) * 1.25}rem` }}>
                            Empty folder
                        </div>
                    ) : (
                        children.map(child => (
                            <TreeNode
                                key={child.name}
                                item={child}
                                path={fullPath}
                                bucketName={bucketName}
                                onFileSelect={onFileSelect}
                                level={level + 1}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// Main Component
export function FilesResourcePicker({ onBack, onSelect, allowedBuckets }: FilesResourcePickerProps) {
    const { buckets: allBuckets, loading: bucketsLoading, error: bucketsError } = useStorageBuckets();
    const [selectedBucket, setSelectedBucket] = useState<string>('');
    const [isViewingBuckets, setIsViewingBuckets] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // Filter buckets if allowedBuckets is provided
    const buckets = useMemo(() => {
        if (!allowedBuckets || allowedBuckets.length === 0) return allBuckets;
        return allBuckets.filter(bucket => allowedBuckets.includes(bucket));
    }, [allBuckets, allowedBuckets]);

    // Get root items for selected bucket
    const { items, loading: itemsLoading } = useStorageList(selectedBucket);

    // Filter buckets by search
    const filteredBuckets = useMemo(() => {
        if (!searchQuery.trim()) return buckets;
        const query = searchQuery.toLowerCase();
        return buckets.filter(bucket => bucket.toLowerCase().includes(query));
    }, [buckets, searchQuery]);

    const handleBucketSelect = (bucket: string) => {
        setSelectedBucket(bucket);
        setIsViewingBuckets(false);
    };

    const handleBackToBuckets = () => {
        setIsViewingBuckets(true);
        setSearchQuery('');
    };

    const handleFileSelect = async (path: string, file: StorageFile) => {
        setIsProcessing(true);
        try {
            // Check if bucket is public by attempting to get public URL
            const { data: publicUrlData } = await supabase
                .storage
                .from(selectedBucket)
                .getPublicUrl(path);

            let fileUrl = publicUrlData.publicUrl;
            let isPublic = true;

            // Try to fetch the public URL to see if it's actually accessible
            try {
                const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
                if (!response.ok) {
                    // If public URL doesn't work, get signed URL
                    isPublic = false;
                    const { data: signedData, error: signedError } = await supabase
                        .storage
                        .from(selectedBucket)
                        .createSignedUrl(path, 3600); // 1 hour expiry

                    if (signedError) throw signedError;
                    fileUrl = signedData.signedUrl;
                }
            } catch {
                // If HEAD request fails, assume private and get signed URL
                isPublic = false;
                const { data: signedData, error: signedError } = await supabase
                    .storage
                    .from(selectedBucket)
                    .createSignedUrl(path, 3600);

                if (signedError) throw signedError;
                fileUrl = signedData.signedUrl;
            }

            // Use the existing file operations utility to get complete file details
            const fileDetails = getFileDetailsByUrl(fileUrl, file.metadata as any);
            
            // Enhance with bucket and path info
            const enhancedDetails: EnhancedFileDetails = {
                ...fileDetails,
                bucket: selectedBucket,
                path: path,
            };

            // Build proper structure for FilePreviewSheet
            onSelect({
                url: fileUrl,
                type: fileDetails.mimetype || 'application/octet-stream',
                details: enhancedDetails
            });
        } catch (error) {
            console.error('Error getting file URL:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-[400px]">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={isViewingBuckets ? onBack : handleBackToBuckets}
                    disabled={isProcessing}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <Database className="w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">
                    {isViewingBuckets ? "Storage Buckets" : selectedBucket}
                </span>
            </div>

            {/* Search */}
            {isViewingBuckets && (
                <div className="px-2 py-2 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search buckets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-7 text-xs pl-7 pr-2 bg-gray-50 dark:bg-zinc-800 border-gray-300 dark:border-gray-700"
                        />
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
                {bucketsLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                ) : bucketsError ? (
                    <div className="text-xs text-red-600 dark:text-red-400 text-center py-8">
                        Error loading buckets
                    </div>
                ) : isViewingBuckets ? (
                    // Show buckets
                    <div className="p-1">
                        {filteredBuckets.length === 0 ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">
                                {searchQuery ? "No buckets found" : "No storage buckets"}
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {filteredBuckets.map((bucket) => (
                                    <button
                                        key={bucket}
                                        onClick={() => handleBucketSelect(bucket)}
                                        className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors group"
                                    >
                                        <Database className="w-4 h-4 flex-shrink-0 text-purple-600 dark:text-purple-500" />
                                        <span className="flex-1 text-xs font-medium text-gray-900 dark:text-gray-100 text-left truncate">
                                            {bucket}
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    // Show file tree
                    <div className="p-1">
                        {itemsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                            </div>
                        ) : items.length === 0 ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">
                                Empty bucket
                            </div>
                        ) : (
                            items.map(item => (
                                <TreeNode
                                    key={item.name}
                                    item={item}
                                    path=""
                                    bucketName={selectedBucket}
                                    onFileSelect={handleFileSelect}
                                />
                            ))
                        )}
                    </div>
                )}
                
                {isProcessing && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                )}
            </div>
        </div>
    );
}

