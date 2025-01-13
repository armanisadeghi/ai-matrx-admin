// EditorStateVisualizer.tsx
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui';
import { useEditorVisualizer } from './useEditorVisualizer';
import ChipDetails from './ChipDetails';


const EditorStats = ({ state }: { state: any }) => (
    <div className="flex gap-4 text-sm">
        <div>
            <span className="text-muted-foreground">Chips:</span>
            <span className="ml-1">{state.chipCounter}</span>
        </div>
        <div>
            <span className="text-muted-foreground">Dragging:</span>
            <span className="ml-1">{state.draggedChip ? 'Yes' : 'No'}</span>
        </div>
        <div>
            <span className="text-muted-foreground">Colors:</span>
            <span className="ml-1">{state.colorAssignments?.size || 0}</span>
        </div>
    </div>
);

const EditorContent = ({ editorId }: { editorId: string }) => {
    const { 
        showTokenIds, 
        toggleTokenIds, 
        getEditorState, 
        getProcessedContent 
    } = useEditorVisualizer();
    
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Current Text Content</label>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show Token IDs</span>
                    <Switch
                        checked={showTokenIds}
                        onCheckedChange={toggleTokenIds}
                    />
                </div>
            </div>
            <Textarea 
                readOnly
                value={getProcessedContent(editorId)}
                className="min-h-[100px] font-mono"
            />
            <div className="space-y-1">
                <div className="text-sm font-medium">Raw State</div>
                <pre className="bg-muted/40 rounded-md p-3 text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(getEditorState(editorId), null, 2)}
                </pre>
            </div>
        </div>
    );
};

const ChipTabs = ({ editorId }: { editorId: string }) => {
    const { getEditorState } = useEditorVisualizer();
    const chips = getEditorState(editorId).chipData;

    return chips.length > 0 ? (
        <Tabs defaultValue={chips[0].id} className="flex-1">
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

const EditorStateVisualizer = () => {
    const { 
        registeredEditors, 
        activeEditorId,
        setActiveEditorId,
        getEditorLayout,
        getEditorState
    } = useEditorVisualizer();

    if (registeredEditors.length === 0) {
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
                        {registeredEditors.length} Editor{registeredEditors.length !== 1 ? 's' : ''}
                    </Badge>
                </div>
            </div>

            <Tabs
                value={activeEditorId}
                onValueChange={setActiveEditorId}
                className="flex-1 flex flex-col"
            >
                <TabsList className="w-full justify-start flex-wrap px-3 pt-3">
                    {registeredEditors.map((id) => {
                        const isVisible = getEditorLayout(id)?.isVisible;
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
                    {registeredEditors.map((id) => {
                        const state = getEditorState(id);
                        return (
                            <TabsContent
                                key={id}
                                value={id}
                                className="flex-1 p-3 space-y-3"
                            >
                                <EditorStats state={state} />
                                <EditorContent editorId={id} />
                                <ChipTabs editorId={id} />
                            </TabsContent>
                        );
                    })}
                </div>
            </Tabs>
        </Card>
    );
};

export default EditorStateVisualizer;