'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SystemPromptDB } from '@/types/system-prompts-db';
import { ArrowRight, AlertTriangle } from 'lucide-react';

interface DiffViewProps {
    oldPrompt: SystemPromptDB;
    newPrompt: Partial<SystemPromptDB>;
    highlightChanges?: boolean;
}

export function DiffView({ oldPrompt, newPrompt, highlightChanges = true }: DiffViewProps) {
    const hasNameChange = newPrompt.name !== undefined && newPrompt.name !== oldPrompt.name;
    const hasDescChange = newPrompt.description !== undefined && newPrompt.description !== oldPrompt.description;
    const hasMessagesChange = newPrompt.messages !== undefined &&
        JSON.stringify(newPrompt.messages) !== JSON.stringify(oldPrompt.messages);
    const hasVariablesChange = newPrompt.variable_defaults !== undefined &&
        JSON.stringify(newPrompt.variable_defaults) !== JSON.stringify(oldPrompt.variable_defaults);
    const hasSettingsChange = newPrompt.settings !== undefined &&
        JSON.stringify(newPrompt.settings) !== JSON.stringify(oldPrompt.settings);

    const hasAnyChanges = hasNameChange || hasDescChange || hasMessagesChange || hasVariablesChange || hasSettingsChange;

    if (!hasAnyChanges) {
        return (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
                <p>No changes detected</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Warning banner */}
            <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                            <p className="font-semibold text-amber-900 dark:text-amber-100">
                                Warning: Updating will affect all users
                            </p>
                            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                                These changes will be immediately visible to all users using this system prompt.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Changes summary */}
            <div className="flex flex-wrap gap-2">
                {hasNameChange && <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-950">Name Changed</Badge>}
                {hasDescChange && <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-950">Description Changed</Badge>}
                {hasMessagesChange && <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-950">Messages Changed</Badge>}
                {hasVariablesChange && <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-950">Variables Changed</Badge>}
                {hasSettingsChange && <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-950">Settings Changed</Badge>}
            </div>

            <ScrollArea className="h-[500px] border rounded-lg">
                <div className="p-4 space-y-6">
                    {/* Name diff */}
                    {hasNameChange && (
                        <DiffSection
                            title="Name"
                            oldValue={oldPrompt.name}
                            newValue={newPrompt.name!}
                        />
                    )}

                    {/* Description diff */}
                    {hasDescChange && (
                        <DiffSection
                            title="Description"
                            oldValue={oldPrompt.description || '(none)'}
                            newValue={newPrompt.description || '(none)'}
                        />
                    )}

                    {/* Messages diff */}
                    {hasMessagesChange && (
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Messages</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">Current</p>
                                    <div className="space-y-2">
                                        {oldPrompt.messages.map((msg, idx) => (
                                            <Card key={idx} className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                                                <CardContent className="p-3">
                                                    <Badge variant="outline" className="mb-2">{msg.role}</Badge>
                                                    <pre className="text-xs whitespace-pre-wrap break-words">
                                                        {msg.content}
                                                    </pre>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">New</p>
                                    <div className="space-y-2">
                                        {newPrompt.messages!.map((msg, idx) => (
                                            <Card key={idx} className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                                                <CardContent className="p-3">
                                                    <Badge variant="outline" className="mb-2">{msg.role}</Badge>
                                                    <pre className="text-xs whitespace-pre-wrap break-words">
                                                        {msg.content}
                                                    </pre>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Variables diff */}
                    {hasVariablesChange && (
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Variables</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">Current</p>
                                    <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                                        <CardContent className="p-3">
                                            <pre className="text-xs whitespace-pre-wrap">
                                                {JSON.stringify(oldPrompt.variable_defaults, null, 2)}
                                            </pre>
                                        </CardContent>
                                    </Card>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">New</p>
                                    <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                                        <CardContent className="p-3">
                                            <pre className="text-xs whitespace-pre-wrap">
                                                {JSON.stringify(newPrompt.variable_defaults, null, 2)}
                                            </pre>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Settings diff */}
                    {hasSettingsChange && (
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Settings</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">Current</p>
                                    <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                                        <CardContent className="p-3">
                                            <pre className="text-xs whitespace-pre-wrap">
                                                {JSON.stringify(oldPrompt.settings, null, 2)}
                                            </pre>
                                        </CardContent>
                                    </Card>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">New</p>
                                    <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                                        <CardContent className="p-3">
                                            <pre className="text-xs whitespace-pre-wrap">
                                                {JSON.stringify(newPrompt.settings, null, 2)}
                                            </pre>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

interface DiffSectionProps {
    title: string;
    oldValue: string;
    newValue: string;
}

function DiffSection({ title, oldValue, newValue }: DiffSectionProps) {
    return (
        <div className="space-y-2">
            <h4 className="font-semibold text-sm">{title}</h4>
            <div className="flex items-center gap-4">
                <Card className="flex-1 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                    <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">Current</p>
                        <p className="text-sm break-words">{oldValue}</p>
                    </CardContent>
                </Card>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Card className="flex-1 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">New</p>
                        <p className="text-sm break-words">{newValue}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
