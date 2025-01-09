'use client';

import React, { useState, useEffect } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useEditorContext } from '../provider/EditorProvider';
import { Switch } from '@/components/ui';
import { ChipDetails } from './ChipDetails';
import { EditorStats } from './EditorStats';


const ChipTabs = ({ chips, editorId }: { chips: any[], editorId: string }) => {
    const [activeChip, setActiveChip] = useState<string>(chips[0]?.id || '');

    return chips.length > 0 ? (
        <Tabs value={activeChip} onValueChange={setActiveChip} className="flex-1">
            <TabsList className="w-full justify-start flex-wrap">
                {chips.map((chip) => (
                    <TabsTrigger key={chip.id} value={chip.id}>
                        {chip.label}
                    </TabsTrigger>
                ))}
            </TabsList>
            <div className="mt-3">
                {chips.map((chip) => (
                    <TabsContent key={chip.id} value={chip.id}>
                        <ChipDetails chip={chip} editorId={editorId} />
                    </TabsContent>
                ))}
            </div>
        </Tabs>
    ) : (
        <div className="text-sm text-muted-foreground">No chips added</div>
    );
};

const EditorContent = ({ editorId }: { editorId: string }) => {
    const [showTokenIds, setShowTokenIds] = useState(false);
    const context = useEditorContext();
    const state = context.getEditorState(editorId);
    
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Current Text Content</label>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show Token IDs</span>
                    <Switch
                        checked={showTokenIds}
                        onCheckedChange={setShowTokenIds}
                    />
                </div>
            </div>
            <Textarea 
                readOnly
                value={context.getTextWithChipsReplaced(editorId, showTokenIds)}
                className="min-h-[100px] font-mono"
            />
            <div className="space-y-1">
                <div className="text-sm font-medium">Raw State</div>
                <pre className="bg-muted/40 rounded-md p-3 text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(state, null, 2)}
                </pre>
            </div>
        </div>
    );
};

const EditorStateVisualizer = () => {
    const context = useEditorContext();
    const [activeEditorId, setActiveEditorId] = useState<string>('');
    const [editorIds, setEditorIds] = useState<string[]>([]);

    useEffect(() => {
        const findRegisteredEditors = () => {
            const potentialEditors = Array.from({ length: 100 }, (_, i) => `editor-${i}`);
            return potentialEditors.filter(id => context.isEditorRegistered(id));
        };

        const interval = setInterval(() => {
            const registeredEditors = findRegisteredEditors();
            setEditorIds(registeredEditors);
            
            if (!activeEditorId && registeredEditors.length > 0) {
                setActiveEditorId(registeredEditors[0]);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [context, activeEditorId]);

    if (editorIds.length === 0) {
        return (
            <Card className="p-3">
                <div className="text-muted-foreground">No registered editors found</div>
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
                        const isVisible = context.getEditorLayout(id)?.isVisible;
                        return (
                            <TabsTrigger
                                key={id}
                                value={id}
                                className="flex items-center gap-2"
                            >
                                <span>{id}</span>
                                {isVisible ? 
                                    <Eye className="h-3 w-3" /> : 
                                    <EyeOff className="h-3 w-3" />
                                }
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                <div className="flex-1 overflow-auto">
                    {editorIds.map((id) => {
                        const state = context.getEditorState(id);
                        return (
                            <TabsContent
                                key={id}
                                value={id}
                                className="flex-1 p-3 space-y-3"
                            >
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
