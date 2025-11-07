"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FolderOpen, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import MultiBucketFileTree from '@/components/file-system/draggable/MultiBucketFileTree';
import { FileSystemNode, AvailableBuckets } from '@/lib/redux/fileSystem/types';
import { FileUploadDialog } from '@/components/file-system/upload/FileUploadDialog';
import FilePreviewSheet from '@/components/ui/file-preview/FilePreviewSheet';
import { getFileDetailsByUrl } from '@/utils/file-operations/constants';
import { useToast } from '@/components/ui';
import FileSystemManager from '@/utils/file-operations/FileSystemManager';
import { useRouter } from 'next/navigation';

interface QuickFilesSheetProps {
    onClose?: () => void;
    className?: string;
    hideHeader?: boolean;
}

export function QuickFilesSheet({ onClose, className, hideHeader = false }: QuickFilesSheetProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'browse' | 'upload'>('browse');
    const [selectedBucket, setSelectedBucket] = useState<AvailableBuckets | null>('userContent');
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<{
        node: FileSystemNode;
        bucket: AvailableBuckets;
    } | null>(null);
    const [fileUrl, setFileUrl] = useState<string>('');
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);
    const { toast } = useToast();

    const handleBucketSelect = useCallback((bucket: AvailableBuckets) => {
        setSelectedBucket(bucket);
    }, []);

    // Fetch file URL when preview file changes
    useEffect(() => {
        if (!previewFile) {
            setFileUrl('');
            return;
        }

        const fetchUrl = async () => {
            setIsLoadingUrl(true);
            try {
                const fileSystemManager = FileSystemManager.getInstance();
                const urlResult = await fileSystemManager.getFileUrl(
                    previewFile.bucket,
                    previewFile.node.storagePath,
                    { expiresIn: 3600 }
                );
                setFileUrl(urlResult.url);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to load file';
                toast({
                    title: 'Error loading file',
                    description: errorMessage,
                    variant: 'destructive',
                });
                setPreviewFile(null);
            } finally {
                setIsLoadingUrl(false);
            }
        };

        fetchUrl();
    }, [previewFile, toast]);

    const handleViewFile = useCallback((node: FileSystemNode) => {
        if (node.contentType === 'FOLDER') return;
        if (!selectedBucket) return;
        
        setPreviewFile({ node, bucket: selectedBucket });
    }, [selectedBucket]);

    const handleClosePreview = useCallback(() => {
        setPreviewFile(null);
        setFileUrl('');
    }, []);

    const handleOpenFullView = useCallback(() => {
        router.push('/files');
        onClose?.();
    }, [router, onClose]);

    return (
        <>
            <div className={`flex flex-col h-full ${className || ''}`}>
                {/* Header with Open in New Tab button */}
                {!hideHeader && (
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <h2 className="text-lg font-semibold">Quick Files</h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleOpenFullView}
                            className="gap-2"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Open Full View
                        </Button>
                    </div>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'browse' | 'upload')} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="w-full grid grid-cols-2 mx-4 mt-3">
                        <TabsTrigger value="browse" className="gap-2">
                            <FolderOpen className="h-4 w-4" />
                            Browse Files
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="gap-2">
                            <Upload className="h-4 w-4" />
                            Upload Files
                        </TabsTrigger>
                    </TabsList>

                    {/* Browse Tab */}
                    <TabsContent value="browse" className="flex-1 flex flex-col overflow-hidden mt-0">
                        <div className="flex-1 flex flex-col p-4 overflow-hidden">
                            <Card className="flex-1 flex flex-col overflow-hidden">
                                <CardHeader className="pb-3 border-b shrink-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <CardTitle className="text-base">All Buckets</CardTitle>
                                        {selectedBucket && (
                                            <Button 
                                                size="sm" 
                                                onClick={() => setIsUploadDialogOpen(true)}
                                                className="h-8"
                                            >
                                                <Upload className="h-4 w-4 mr-1.5" />
                                                Upload
                                            </Button>
                                        )}
                                    </div>
                                    {selectedBucket && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Active: {selectedBucket}
                                        </p>
                                    )}
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto p-0">
                                    <div className="px-2 pb-2 pt-2">
                                        <MultiBucketFileTree 
                                            defaultExpandedBuckets={['userContent']}
                                            onViewFile={handleViewFile}
                                            onBucketSelect={handleBucketSelect}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Upload Tab */}
                    <TabsContent value="upload" className="flex-1 flex flex-col overflow-hidden mt-0">
                        <div className="flex-1 p-4 flex flex-col items-center justify-center">
                            <Card className="w-full max-w-md">
                                <CardContent className="p-6 text-center space-y-4">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                                        <Upload className="h-8 w-8 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2">Upload Files</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Click the button below to upload files to {selectedBucket || 'your storage'}
                                        </p>
                                    </div>
                                    <Button 
                                        onClick={() => setIsUploadDialogOpen(true)}
                                        disabled={!selectedBucket}
                                        size="lg"
                                        className="w-full"
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Choose Files to Upload
                                    </Button>
                                    {!selectedBucket && (
                                        <p className="text-xs text-muted-foreground">
                                            Switch to Browse tab to select a bucket first
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* File Preview Sheet */}
            {previewFile && (
                <FilePreviewSheet
                    isOpen={true}
                    onClose={handleClosePreview}
                    file={{
                        url: fileUrl || '',
                        type: previewFile.node.metadata?.mimetype || 'application/octet-stream',
                        details: fileUrl ? getFileDetailsByUrl(fileUrl, previewFile.node.metadata) : undefined,
                    }}
                />
            )}

            {/* File Upload Dialog */}
            {selectedBucket && (
                <FileUploadDialog
                    isOpen={isUploadDialogOpen}
                    onClose={() => setIsUploadDialogOpen(false)}
                    bucket={selectedBucket}
                />
            )}
        </>
    );
}

