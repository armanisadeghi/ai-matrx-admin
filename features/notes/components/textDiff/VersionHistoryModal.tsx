// features/notes/components/textDiff/VersionHistoryModal.tsx

'use client';

import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Clock,
    RotateCcw,
    FileText,
    User,
    AlertCircle,
} from 'lucide-react';
import { fetchNoteVersions, restoreNoteVersion } from '../../service/noteVersionsService';
import type { NoteVersion } from '../../service/noteVersionsService';
import { SideBySideDiff } from './InlineDiffHighlight';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface VersionHistoryModalProps {
    noteId: string;
    currentContent: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRestore?: () => void;
}

export function VersionHistoryModal({
    noteId,
    currentContent,
    open,
    onOpenChange,
    onRestore,
}: VersionHistoryModalProps) {
    const [versions, setVersions] = useState<NoteVersion[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            loadVersions();
        }
    }, [open, noteId]);

    const loadVersions = async () => {
        setIsLoading(true);
        try {
            const data = await fetchNoteVersions(noteId);
            setVersions(data);
            if (data.length > 0) {
                setSelectedVersion(data[0]);
            }
        } catch (error) {
            console.error('Failed to load versions:', error);
            toast({
                title: 'Error',
                description: 'Failed to load version history',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (version: NoteVersion) => {
        if (!confirm(`Restore version ${version.version_number}? This will create a new version with the restored content.`)) {
            return;
        }

        setIsRestoring(true);
        try {
            await restoreNoteVersion(noteId, version.version_number);
            toast({
                title: 'Version Restored',
                description: `Successfully restored version ${version.version_number}`,
            });
            onOpenChange(false);
            if (onRestore) {
                onRestore();
            }
        } catch (error) {
            console.error('Failed to restore version:', error);
            toast({
                title: 'Error',
                description: 'Failed to restore version',
                variant: 'destructive',
            });
        } finally {
            setIsRestoring(false);
        }
    };

    const getChangeTypeLabel = (changeType: string) => {
        switch (changeType) {
            case 'manual':
                return { label: 'Manual Edit', variant: 'secondary' as const };
            case 'ai_edit':
                return { label: 'AI Edit', variant: 'default' as const };
            case 'ai_accept_all':
                return { label: 'AI Accept All', variant: 'default' as const };
            case 'ai_accept_partial':
                return { label: 'AI Partial Accept', variant: 'default' as const };
            default:
                return { label: 'Unknown', variant: 'outline' as const };
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Version History
                    </DialogTitle>
                    <DialogDescription>
                        View and restore previous versions of this note
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                            <p className="text-sm text-muted-foreground">
                                Loading versions...
                            </p>
                        </div>
                    </div>
                ) : versions.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-2">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                            <p className="text-sm text-muted-foreground">
                                No version history available yet
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Versions are created automatically when you save changes
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
                        {/* Version List */}
                        <div className="col-span-4 border rounded-lg p-2">
                            <ScrollArea className="h-full pr-2">
                                <div className="space-y-2">
                                    {/* Current version */}
                                    <div
                                        className={cn(
                                            'p-3 rounded-md border cursor-pointer transition-colors',
                                            !selectedVersion && 'bg-primary/10 border-primary'
                                        )}
                                        onClick={() => setSelectedVersion(null)}
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <Badge variant="default">Current</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Current working version
                                        </p>
                                    </div>

                                    {/* Historical versions */}
                                    {versions.map((version) => {
                                        const changeInfo = getChangeTypeLabel(version.change_type);
                                        return (
                                            <div
                                                key={version.id}
                                                className={cn(
                                                    'p-3 rounded-md border cursor-pointer transition-colors hover:bg-muted/50',
                                                    selectedVersion?.id === version.id &&
                                                        'bg-primary/10 border-primary'
                                                )}
                                                onClick={() => setSelectedVersion(version)}
                                            >
                                                <div className="flex items-start justify-between mb-1">
                                                    <Badge variant="outline">
                                                        v{version.version_number}
                                                    </Badge>
                                                    <Badge variant={changeInfo.variant}>
                                                        {changeInfo.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                                                    {version.label}
                                                </p>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDistanceToNow(new Date(version.created_at), {
                                                        addSuffix: true,
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Diff View */}
                        <div className="col-span-8 border rounded-lg flex flex-col">
                            {selectedVersion ? (
                                <>
                                    <div className="p-3 border-b flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                                Version {selectedVersion.version_number}
                                                <Badge
                                                    variant={
                                                        getChangeTypeLabel(selectedVersion.change_type)
                                                            .variant
                                                    }
                                                >
                                                    {
                                                        getChangeTypeLabel(selectedVersion.change_type)
                                                            .label
                                                    }
                                                </Badge>
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(selectedVersion.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleRestore(selectedVersion)}
                                            disabled={isRestoring}
                                            className="gap-1"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                            Restore This Version
                                        </Button>
                                    </div>

                                    <ScrollArea className="flex-1 p-4">
                                        <SideBySideDiff
                                            oldText={selectedVersion.content}
                                            newText={currentContent}
                                        />
                                    </ScrollArea>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center space-y-2">
                                        <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                                        <p className="text-sm text-muted-foreground">
                                            Select a version to view changes
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <Separator />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>Up to 10 versions are stored per note</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
