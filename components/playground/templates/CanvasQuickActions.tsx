'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sparkles,
    BookOpen,
    Code,
    BarChart3,
    GitBranch,
    HelpCircle,
    Clock,
    Target,
    TrendingUp,
    FileQuestion,
    Layers,
    Network,
    Lightbulb,
    Plus
} from 'lucide-react';
import { useDatabaseContentBlocks } from '@/hooks/useContentBlocks';
import { cn } from '@/lib/utils';

interface CanvasAction {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    category: 'interactive' | 'visual' | 'analysis' | 'education';
    templateType: string;
    color: string;
}

const canvasActions: CanvasAction[] = [
    {
        id: 'quiz',
        name: 'Multiple Choice Quiz',
        description: 'Create an interactive quiz with explanations',
        icon: <FileQuestion className="w-5 h-5" />,
        category: 'education',
        templateType: 'multiple-choice-quiz',
        color: 'blue'
    },
    {
        id: 'flashcards',
        name: 'Flashcard Set',
        description: 'Generate study flashcards for memorization',
        icon: <Layers className="w-5 h-5" />,
        category: 'education',
        templateType: 'flashcards',
        color: 'purple'
    },
    {
        id: 'timeline',
        name: 'Interactive Timeline',
        description: 'Create a visual timeline with phases',
        icon: <Clock className="w-5 h-5" />,
        category: 'visual',
        templateType: 'simple-timeline',
        color: 'green'
    },
    {
        id: 'comparison',
        name: 'Comparison Table',
        description: 'Compare multiple options side-by-side',
        icon: <BarChart3 className="w-5 h-5" />,
        category: 'analysis',
        templateType: 'comparison-table',
        color: 'orange'
    },
    {
        id: 'decision-tree',
        name: 'Decision Tree',
        description: 'Build a decision-making flowchart',
        icon: <GitBranch className="w-5 h-5" />,
        category: 'analysis',
        templateType: 'decision-tree',
        color: 'red'
    },
    {
        id: 'diagram',
        name: 'Process Diagram',
        description: 'Create flowcharts and process diagrams',
        icon: <Network className="w-5 h-5" />,
        category: 'visual',
        templateType: 'diagram',
        color: 'cyan'
    },
    {
        id: 'troubleshooting',
        name: 'Troubleshooting Guide',
        description: 'Step-by-step problem resolution',
        icon: <HelpCircle className="w-5 h-5" />,
        category: 'analysis',
        templateType: 'troubleshooting',
        color: 'amber'
    },
    {
        id: 'research',
        name: 'Research Report',
        description: 'Comprehensive research analysis',
        icon: <BookOpen className="w-5 h-5" />,
        category: 'analysis',
        templateType: 'deep-research',
        color: 'indigo'
    },
    {
        id: 'progress',
        name: 'Progress Tracker',
        description: 'Track learning or project progress',
        icon: <TrendingUp className="w-5 h-5" />,
        category: 'interactive',
        templateType: 'progress-tracker',
        color: 'emerald'
    }
];

interface CanvasQuickActionsProps {
    onSelectAction?: (action: CanvasAction) => void;
    className?: string;
}

export function CanvasQuickActions({
    onSelectAction,
    className
}: CanvasQuickActionsProps) {
    const { contentBlocks, loading } = useDatabaseContentBlocks(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const categories = [
        { id: 'all', label: 'All' },
        { id: 'interactive', label: 'Interactive' },
        { id: 'visual', label: 'Visual' },
        { id: 'analysis', label: 'Analysis' },
        { id: 'education', label: 'Education' }
    ];

    const filteredActions = canvasActions.filter(
        action => selectedCategory === 'all' || action.category === selectedCategory
    );

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; text: string; hover: string }> = {
            blue: {
                bg: 'bg-blue-100 dark:bg-blue-900',
                text: 'text-blue-600 dark:text-blue-400',
                hover: 'hover:bg-blue-50 dark:hover:bg-blue-800'
            },
            purple: {
                bg: 'bg-purple-100 dark:bg-purple-900',
                text: 'text-purple-600 dark:text-purple-400',
                hover: 'hover:bg-purple-50 dark:hover:bg-purple-800'
            },
            green: {
                bg: 'bg-green-100 dark:bg-green-900',
                text: 'text-green-600 dark:text-green-400',
                hover: 'hover:bg-green-50 dark:hover:bg-green-800'
            },
            orange: {
                bg: 'bg-orange-100 dark:bg-orange-900',
                text: 'text-orange-600 dark:text-orange-400',
                hover: 'hover:bg-orange-50 dark:hover:bg-orange-800'
            },
            red: {
                bg: 'bg-red-100 dark:bg-red-900',
                text: 'text-red-600 dark:text-red-400',
                hover: 'hover:bg-red-50 dark:hover:bg-red-800'
            },
            cyan: {
                bg: 'bg-cyan-100 dark:bg-cyan-900',
                text: 'text-cyan-600 dark:text-cyan-400',
                hover: 'hover:bg-cyan-50 dark:hover:bg-cyan-800'
            },
            amber: {
                bg: 'bg-amber-100 dark:bg-amber-900',
                text: 'text-amber-600 dark:text-amber-400',
                hover: 'hover:bg-amber-50 dark:hover:bg-amber-800'
            },
            indigo: {
                bg: 'bg-indigo-100 dark:bg-indigo-900',
                text: 'text-indigo-600 dark:text-indigo-400',
                hover: 'hover:bg-indigo-50 dark:hover:bg-indigo-800'
            },
            emerald: {
                bg: 'bg-emerald-100 dark:bg-emerald-900',
                text: 'text-emerald-600 dark:text-emerald-400',
                hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-800'
            }
        };
        return colors[color] || colors.blue;
    };

    const handleSelectAction = (action: CanvasAction) => {
        // Find the corresponding content block
        const contentBlock = contentBlocks.find(block => 
            block.id.includes(action.templateType)
        );

        onSelectAction?.(action);
    };

    return (
        <div className={cn("flex flex-col h-full bg-white dark:bg-gray-900", className)}>
            {/* Header */}
            <div className="p-6 border-b border-border">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            Canvas Quick Actions
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Generate interactive canvas content instantly
                        </p>
                    </div>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                        <Button
                            key={category.id}
                            variant={selectedCategory === category.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory(category.id)}
                        >
                            {category.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Actions Grid */}
            <ScrollArea className="flex-1">
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredActions.map(action => {
                        const colorClasses = getColorClasses(action.color);
                        return (
                            <Card
                                key={action.id}
                                className={cn(
                                    "group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
                                    "border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500"
                                )}
                                onClick={() => handleSelectAction(action)}
                            >
                                <CardHeader>
                                    <div className="flex items-start gap-3">
                                        <div className={cn("p-2 rounded-lg transition-colors", colorClasses.bg, colorClasses.text)}>
                                            {action.icon}
                                        </div>
                                        <div className="flex-1">
                                            <CardTitle className="text-base mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {action.name}
                                            </CardTitle>
                                            <CardDescription className="text-sm line-clamp-2">
                                                {action.description}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Badge variant="secondary" className="text-xs">
                                        {action.category}
                                    </Badge>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* Footer Help Text */}
            <div className="p-4 border-t border-border bg-gray-50 dark:bg-gray-800">
                <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                    <p>
                        <strong>Tip:</strong> Click any action to insert its template into your current message. 
                        The AI will then generate the content in a format that opens in the canvas panel.
                    </p>
                </div>
            </div>
        </div>
    );
}

