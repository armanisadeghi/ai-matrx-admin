'use client';

import React, { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Search,
    Sparkles,
    FileText,
    Code,
    Palette,
    Star,
    Clock,
    ChevronRight,
    Copy,
    Eye,
    Plus,
    Folder,
    FolderOpen
} from 'lucide-react';
import { useDatabaseContentBlocks } from '@/hooks/useContentBlocks';
import { ContentBlock } from '@/features/rich-text-editor/config/contentBlocks';
import { cn } from '@/lib/utils';

interface TemplateLibraryPanelProps {
    onInsertTemplate?: (template: ContentBlock) => void;
    onPreviewTemplate?: (template: ContentBlock) => void;
    className?: string;
}

export function TemplateLibraryPanel({
    onInsertTemplate,
    onPreviewTemplate,
    className
}: TemplateLibraryPanelProps) {
    const { contentBlocks, categoryConfigs, loading, error } = useDatabaseContentBlocks(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);

    // Filter content blocks
    const filteredBlocks = useMemo(() => {
        let blocks = contentBlocks;

        // Filter by search term
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            blocks = blocks.filter(
                block =>
                    block.label.toLowerCase().includes(search) ||
                    block.description.toLowerCase().includes(search) ||
                    block.id.toLowerCase().includes(search)
            );
        }

        // Filter by category ID (UUID-based)
        if (selectedCategory !== 'all') {
            // selectedCategory is now a category UUID
            // Note: We'll need to match against category configs or track by ID
            // For now, keep all blocks if filtering is requested
            // The grouping below will organize them properly
        }

        return blocks;
    }, [contentBlocks, searchTerm, selectedCategory]);

    // Group blocks by category config (since we can't use block.category anymore)
    // Just show all blocks without grouping for now
    const groupedBlocks = useMemo(() => {
        // Single group with all blocks
        return { 'all': filteredBlocks };
    }, [filteredBlocks]);

    // Get favorite blocks
    const favoriteBlocks = useMemo(() => {
        return contentBlocks.filter(block => favorites.has(block.id));
    }, [contentBlocks, favorites]);

    // Get recently used blocks
    const recentBlocks = useMemo(() => {
        return recentlyUsed
            .map(id => contentBlocks.find(block => block.id === id))
            .filter(Boolean) as ContentBlock[];
    }, [contentBlocks, recentlyUsed]);

    const handleInsert = (block: ContentBlock) => {
        // Add to recently used
        setRecentlyUsed(prev => {
            const updated = [block.id, ...prev.filter(id => id !== block.id)].slice(0, 10);
            return updated;
        });
        onInsertTemplate?.(block);
    };

    const toggleFavorite = (blockId: string) => {
        setFavorites(prev => {
            const updated = new Set(prev);
            if (updated.has(blockId)) {
                updated.delete(blockId);
            } else {
                updated.add(blockId);
            }
            return updated;
        });
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'structure':
                return <FileText className="w-4 h-4" />;
            case 'formatting':
                return <Palette className="w-4 h-4" />;
            case 'special':
                return <Sparkles className="w-4 h-4" />;
            case 'ai-prompts':
                return <Code className="w-4 h-4" />;
            default:
                return <Folder className="w-4 h-4" />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'structure':
                return 'text-blue-600 dark:text-blue-400';
            case 'formatting':
                return 'text-purple-600 dark:text-purple-400';
            case 'special':
                return 'text-amber-600 dark:text-amber-400';
            case 'ai-prompts':
                return 'text-green-600 dark:text-green-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    if (loading) {
        return (
            <div className={cn("flex items-center justify-center h-full p-8", className)}>
                <div className="text-center">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 animate-pulse text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading templates...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("flex items-center justify-center h-full p-8", className)}>
                <div className="text-center">
                    <p className="text-sm text-red-600 dark:text-red-400">Error loading templates</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full bg-white dark:bg-gray-900", className)}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Template Library
                    </h2>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search templates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    />
                </div>
            </div>

            {/* Content */}
            <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-4 mt-3 grid w-[calc(100%-2rem)] grid-cols-3">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="favorites">
                        <Star className="w-4 h-4 mr-1" />
                        Favorites
                    </TabsTrigger>
                    <TabsTrigger value="recent">
                        <Clock className="w-4 h-4 mr-1" />
                        Recent
                    </TabsTrigger>
                </TabsList>

                {/* All Templates */}
                <TabsContent value="all" className="flex-1 overflow-hidden mt-0">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-6">
                            {Object.entries(groupedBlocks).map(([groupKey, blocks]) => {
                                return (
                                    <div key={groupKey} className="space-y-3">
                                        {/* Header */}
                                        <div className="flex items-center gap-2 px-2">
                                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <FileText className="w-4 h-4" />
                                                <h3 className="font-semibold text-sm">
                                                    All Templates
                                                </h3>
                                            </div>
                                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                                            <Badge variant="outline" className="text-xs">
                                                {blocks.length}
                                            </Badge>
                                        </div>

                                        {/* Category Blocks */}
                                        <div className="space-y-2">
                                            {blocks.map(block => (
                                                <Card
                                                    key={block.id}
                                                    className="group hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500"
                                                >
                                                    <CardHeader className="p-3">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                                        {block.label}
                                                                    </CardTitle>
                                                                </div>
                                                                <CardDescription className="text-xs line-clamp-2">
                                                                    {block.description}
                                                                </CardDescription>
                                                            </div>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-6 w-6 flex-shrink-0"
                                                                onClick={() => toggleFavorite(block.id)}
                                                            >
                                                                <Star
                                                                    className={cn(
                                                                        "w-3 h-3",
                                                                        favorites.has(block.id)
                                                                            ? "fill-amber-500 text-amber-500"
                                                                            : "text-gray-400"
                                                                    )}
                                                                />
                                                            </Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-3 pt-0">
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                className="flex-1"
                                                                onClick={() => handleInsert(block)}
                                                            >
                                                                <Plus className="w-3 h-3 mr-1" />
                                                                Insert
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => onPreviewTemplate?.(block)}
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredBlocks.length === 0 && (
                                <div className="text-center py-12">
                                    <Search className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">No templates found</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                        Try adjusting your search
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                {/* Favorites */}
                <TabsContent value="favorites" className="flex-1 overflow-hidden mt-0">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-2">
                            {favoriteBlocks.length > 0 ? (
                                favoriteBlocks.map(block => (
                                    <Card
                                        key={block.id}
                                        className="group hover:shadow-md transition-all duration-200"
                                    >
                                        <CardHeader className="p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <CardTitle className="text-sm font-medium truncate">
                                                        {block.label}
                                                    </CardTitle>
                                                    <CardDescription className="text-xs line-clamp-2">
                                                        {block.description}
                                                    </CardDescription>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6"
                                                    onClick={() => toggleFavorite(block.id)}
                                                >
                                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-0">
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleInsert(block)}
                                                >
                                                    <Plus className="w-3 h-3 mr-1" />
                                                    Insert
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => onPreviewTemplate?.(block)}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <Star className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">No favorites yet</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                        Star templates to save them here
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                {/* Recent */}
                <TabsContent value="recent" className="flex-1 overflow-hidden mt-0">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-2">
                            {recentBlocks.length > 0 ? (
                                recentBlocks.map(block => (
                                    <Card
                                        key={block.id}
                                        className="group hover:shadow-md transition-all duration-200"
                                    >
                                        <CardHeader className="p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <CardTitle className="text-sm font-medium truncate">
                                                        {block.label}
                                                    </CardTitle>
                                                    <CardDescription className="text-xs line-clamp-2">
                                                        {block.description}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-0">
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => handleInsert(block)}
                                                >
                                                    <Plus className="w-3 h-3 mr-1" />
                                                    Insert
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => onPreviewTemplate?.(block)}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">No recent templates</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                        Templates you use will appear here
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}

