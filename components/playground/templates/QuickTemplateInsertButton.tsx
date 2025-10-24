'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    FileText,
    Code,
    Palette,
    Plus,
    Star,
    Clock,
    ChevronRight
} from 'lucide-react';
import { useDatabaseContentBlocks } from '@/hooks/useContentBlocks';
import { ContentBlock } from '@/features/rich-text-editor/config/contentBlocks';
import { cn } from '@/lib/utils';

interface QuickTemplateInsertButtonProps {
    onInsert?: (template: ContentBlock) => void;
    messageRole?: 'system' | 'user' | 'assistant';
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
}

export function QuickTemplateInsertButton({
    onInsert,
    messageRole,
    variant = 'ghost',
    size = 'sm',
    className
}: QuickTemplateInsertButtonProps) {
    const { contentBlocks, categoryConfigs, loading } = useDatabaseContentBlocks(true);
    const [recentTemplates, setRecentTemplates] = useState<string[]>([]);

    // Load recent templates from localStorage
    useEffect(() => {
        const recent = localStorage.getItem('recentTemplates');
        if (recent) {
            try {
                setRecentTemplates(JSON.parse(recent));
            } catch (e) {
                console.error('Error loading recent templates:', e);
            }
        }
    }, []);

    // Get smart suggestions based on message role
    const suggestedTemplates = useMemo(() => {
        if (!messageRole) return [];

        const roleKeywords = {
            system: ['thinking', 'prompt', 'ai-prompt', 'instructions'],
            user: ['question', 'request', 'input'],
            assistant: ['response', 'flashcard', 'quiz', 'timeline', 'research', 'diagram', 'comparison']
        };

        const keywords = roleKeywords[messageRole] || [];
        
        return contentBlocks
            .filter(block => 
                keywords.some(keyword => 
                    block.id.includes(keyword) || 
                    block.label.toLowerCase().includes(keyword) ||
                    block.category === 'ai-prompts'
                )
            )
            .slice(0, 5);
    }, [contentBlocks, messageRole]);

    // Get recent templates
    const recentTemplateObjects = useMemo(() => {
        return recentTemplates
            .map(id => contentBlocks.find(block => block.id === id))
            .filter(Boolean)
            .slice(0, 5) as ContentBlock[];
    }, [contentBlocks, recentTemplates]);

    // Group templates by category
    const groupedTemplates = useMemo(() => {
        const groups: Record<string, ContentBlock[]> = {};
        contentBlocks.forEach(block => {
            if (!groups[block.category]) {
                groups[block.category] = [];
            }
            groups[block.category].push(block);
        });
        return groups;
    }, [contentBlocks]);

    const handleInsert = (template: ContentBlock) => {
        // Add to recent
        const updated = [template.id, ...recentTemplates.filter(id => id !== template.id)].slice(0, 10);
        setRecentTemplates(updated);
        localStorage.setItem('recentTemplates', JSON.stringify(updated));

        onInsert?.(template);
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'structure':
                return <FileText className="w-3 h-3" />;
            case 'formatting':
                return <Palette className="w-3 h-3" />;
            case 'special':
                return <Sparkles className="w-3 h-3" />;
            case 'ai-prompts':
                return <Code className="w-3 h-3" />;
            default:
                return <FileText className="w-3 h-3" />;
        }
    };

    if (loading) {
        return (
            <Button variant={variant} size={size} disabled className={className}>
                <Sparkles className="w-4 h-4 mr-1 animate-pulse" />
                Templates
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={variant} size={size} className={className}>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Templates
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
                {/* Smart Suggestions */}
                {suggestedTemplates.length > 0 && (
                    <>
                        <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                            <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            Suggested for {messageRole} message
                        </DropdownMenuLabel>
                        {suggestedTemplates.map(template => (
                            <DropdownMenuItem
                                key={template.id}
                                onClick={() => handleInsert(template)}
                                className="flex items-start gap-2 py-2"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{template.label}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                        {template.description}
                                    </div>
                                </div>
                                {template.category === 'ai-prompts' && (
                                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                                        AI
                                    </Badge>
                                )}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                    </>
                )}

                {/* Recent Templates */}
                {recentTemplateObjects.length > 0 && (
                    <>
                        <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                            <Clock className="w-3 h-3" />
                            Recently Used
                        </DropdownMenuLabel>
                        {recentTemplateObjects.map(template => (
                            <DropdownMenuItem
                                key={template.id}
                                onClick={() => handleInsert(template)}
                                className="flex items-start gap-2 py-2"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{template.label}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                        {template.description}
                                    </div>
                                </div>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                    </>
                )}

                {/* All Templates by Category */}
                <DropdownMenuLabel className="text-xs">All Templates</DropdownMenuLabel>
                {Object.entries(groupedTemplates).map(([category, templates]) => {
                    const categoryConfig = categoryConfigs.find(c => c.id === category);
                    return (
                        <DropdownMenuSub key={category}>
                            <DropdownMenuSubTrigger className="flex items-center gap-2">
                                {getCategoryIcon(category)}
                                <span>{categoryConfig?.label || category}</span>
                                <Badge variant="outline" className="ml-auto text-xs">
                                    {templates.length}
                                </Badge>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-72 max-h-96 overflow-y-auto">
                                {templates.map(template => (
                                    <DropdownMenuItem
                                        key={template.id}
                                        onClick={() => handleInsert(template)}
                                        className="flex items-start gap-2 py-2"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">
                                                {template.label}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                                {template.description}
                                            </div>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

