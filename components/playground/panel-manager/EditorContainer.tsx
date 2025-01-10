import React, { useRef, useState } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, ImperativePanelGroupHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Button, Card } from '@/components/ui';
import { Plus, Expand, Minimize2 } from 'lucide-react';
import { EditorWithProviders } from '@/features/rich-text-editor/withManagedEditor';
import { MessageTemplateDataOptional } from '@/types';
import { useMessageTemplates } from '../hooks/useMessageTemplates';

const INITIAL_PANELS: MessageTemplateDataOptional[] = [
    {
        id: 'system-1',
        role: 'system',
        type: 'text',
        content: '',
    },
    {
        id: 'user-1',
        role: 'user',
        type: 'text',
        content: '',
    },
];

interface EditorContainerProps {
    onMessageAdd?: (message: MessageTemplateDataOptional) => void;
}

function EditorContainer({ onMessageAdd }: EditorContainerProps) {
    const { messages } = useMessageTemplates();
    const displayMessages = messages.length ? messages : INITIAL_PANELS;
    
    const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set());
    const [hiddenEditors, setHiddenEditors] = useState<Set<string>>(new Set());
    const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
    const panelRefs = useRef<Map<string, ImperativePanelHandle>>(new Map());

    const registerPanelRef = (id: string, ref: ImperativePanelHandle | null) => {
        if (ref) {
            panelRefs.current.set(id, ref);
        } else {
            panelRefs.current.delete(id);
        }
    };

    const handlePanelCollapse = (id: string) => {
        setCollapsedPanels(prev => {
            const newSet = new Set(prev);
            newSet.add(id);
            return newSet;
        });
        setHiddenEditors(prev => {
            const newSet = new Set(prev);
            newSet.add(id);
            return newSet;
        });
    };

    const handlePanelExpand = (id: string) => {
        setCollapsedPanels(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
        setHiddenEditors(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
    };

    const toggleEditor = (id: string) => {
        const panelRef = panelRefs.current.get(id);
        const isCurrentlyCollapsed = collapsedPanels.has(id);
        
        if (isCurrentlyCollapsed) {
            panelRef?.resize(10);
        } else {
            panelRef?.resize(3);
        }
    };

    const addNewSection = () => {
        const lastSection = displayMessages[displayMessages.length - 1];
        const lastRole = lastSection.role;
        const nextRole = lastRole === 'user' ? 'assistant' : 'user';
        const roleCount = displayMessages.filter((s) => s.role === nextRole).length + 1;

        const newSection: MessageTemplateDataOptional = {
            id: `${nextRole}-${roleCount}`,
            role: nextRole,
            type: 'text',
            content: '',
        };

        onMessageAdd?.(newSection);
    };

    return (
        <PanelGroup
            direction="vertical"
            className="h-full"
            ref={panelGroupRef}
        >
            {displayMessages.map((section, index) => {
                const isLastPanel = index === displayMessages.length - 1;
                const remainingSize = 100 - (displayMessages.length - 1) * 10;
                const isCollapsed = collapsedPanels.has(section.id);

                return (
                    <React.Fragment key={section.id}>
                        <Panel
                            ref={(ref: ImperativePanelHandle | null) => registerPanelRef(section.id, ref)}
                            defaultSize={isLastPanel ? remainingSize : 10}
                            minSize={10}
                            maxSize={100}
                            collapsible={true}
                            collapsedSize={3}
                            onCollapse={() => handlePanelCollapse(section.id)}
                            onExpand={() => handlePanelExpand(section.id)}
                            order={index + 1}
                        >
                            <Card className="h-full p-0 overflow-hidden bg-background border-elevation2">
                                <div className="flex justify-between items-center px-2 py-1 border-b">
                                    <div className="text-sm text-muted-foreground">{section.role.toUpperCase()}</div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => toggleEditor(section.id)}
                                    >
                                        {isCollapsed ? (
                                            <Expand className="h-4 w-4" />
                                        ) : (
                                            <Minimize2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>

                                <div className={`transition-all duration-200 ${hiddenEditors.has(section.id) ? 'h-0 overflow-hidden' : 'h-[calc(100%-2rem)]'}`}>
                                    <EditorWithProviders
                                        id={section.id}
                                        className="w-full h-full border rounded-md"
                                        initialContent={section.content}
                                    />
                                </div>
                            </Card>
                        </Panel>
                        {!isLastPanel && <PanelResizeHandle />}
                    </React.Fragment>
                );
            })}

            <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={addNewSection}
            >
                <Plus className="h-4 w-4 mr-2" />
                Add {displayMessages[displayMessages.length - 1]?.role === 'user' ? 'Assistant' : 'User'} Message
            </Button>
        </PanelGroup>
    );
}

export default EditorContainer;