'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEditorManager } from '../useEditorManager';
import { EditorStats } from './EditorStats';
import EditorContent from './EditorContent';
import ChipTabs from './ChipDetails';

const EditorStateVisualizer = () => {
    const { editorIds, getEditorState, getEditorLayout, isEditorRegistered } = useEditorManager();
    const [activeEditorId, setActiveEditorId] = useState<string>('');

    useEffect(() => {
        if (!activeEditorId && editorIds.length > 0) {
            setActiveEditorId(editorIds[0]);
        }
    }, [editorIds, activeEditorId]);

    if (editorIds.length === 0) {
        return (
            <Card className="p-3">
                <div className="text-muted-foreground">No editors found</div>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Editor State</h2>
                    <Badge variant="outline">
                        {editorIds.length} Editor{editorIds.length !== 1 ? 's' : ''}
                    </Badge>
                </div>
            </div>

            <Tabs
                value={activeEditorId}
                onValueChange={setActiveEditorId}
                className="flex-1 flex flex-col"
            >
                <TabsList className="w-full justify-start flex-wrap px-3 pt-3">
                    {editorIds.map((id) => {
                        const layout = getEditorLayout(id);
                        const isRegistered = isEditorRegistered(id);
                        return (
                            <TabsTrigger
                                key={id}
                                value={id}
                                className="flex items-center gap-2"
                            >
                                <span className={!isRegistered ? 'opacity-50' : ''}>
                                    {id}
                                </span>
                                {layout?.isVisible ? 
                                    <Eye className="h-3 w-3" /> : 
                                    <EyeOff className="h-3 w-3" />
                                }
                                {!isRegistered && (
                                    <Badge 
                                        variant="destructive" 
                                        className="h-4 text-[10px] px-1"
                                    >
                                        unregistered
                                    </Badge>
                                )}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                <div className="flex-1 overflow-auto">
                    {editorIds.map((id) => {
                        const state = getEditorState(id);
                        const isRegistered = isEditorRegistered(id);
                        return (
                            <TabsContent
                                key={id}
                                value={id}
                                className="flex-1 p-3 space-y-3"
                            >
                                {!isRegistered && (
                                    <div className="bg-destructive/10 text-destructive dark:text-destructive-foreground rounded-md p-2 text-sm mb-4">
                                        This editor is not currently registered but still has state or layout data
                                    </div>
                                )}
                                <EditorStats state={state} />
                                <EditorContent editorId={id} />
                                <ChipTabs chips={state.chipData} editorId={id} />
                            </TabsContent>
                        );
                    })}
                </div>
            </Tabs>
        </Card>
    );
};

export default EditorStateVisualizer;