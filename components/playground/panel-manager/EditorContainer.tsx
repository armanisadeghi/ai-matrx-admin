'use client';

import React, { useCallback, useRef, useState } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, ImperativePanelGroupHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Button, Card } from '@/components/ui';
import { Plus } from 'lucide-react';
import { MessageTemplateDataOptional } from '@/types';
import ConfirmationDialog, { DialogType } from './ConfirmationDialog';
import MessageTemplateHeader from './MessageTemplateHeader';
import MessageEditor from '@/features/rich-text-editor/provider/withMessageEditor';
import { useMessageTemplatesWithNew } from '../hooks/dev/useMessageWithNew';
import { AddMessagePayload, useAddMessage } from '../hooks/messages/useAddMessage';

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
    const { messages, deleteMessageById } = useMessageTemplatesWithNew();

    const displayMessages = messages.length ? messages : INITIAL_PANELS;
    const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set());
    const [hiddenEditors, setHiddenEditors] = useState<Set<string>>(new Set());
    const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
    const panelRefs = useRef<Map<string, ImperativePanelHandle>>(new Map());

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState<DialogType>('delete');
    const [activeEditorId, setActiveEditorId] = useState<string | null>(null);

    const { addMessage } = useAddMessage();

    const addNewSection = useCallback(() => {
        const lastSection = displayMessages[displayMessages.length - 1];
        const lastRole = lastSection.role;
        const nextRole = lastRole === 'user' ? 'assistant' : 'user';

        const newSection: AddMessagePayload = {
            role: nextRole,
            type: 'text',
            content: '',
            order: displayMessages.length,
        };

        addMessage(newSection);
    }, [displayMessages, addMessage]);

    
    const registerPanelRef = (id: string, ref: ImperativePanelHandle | null) => {
        if (ref) {
            panelRefs.current.set(id, ref);
        } else {
            panelRefs.current.delete(id);
        }
    };

    const handlePanelCollapse = (id: string) => {
        setCollapsedPanels((prev) => {
            const newSet = new Set(prev);
            newSet.add(id);
            return newSet;
        });
        setHiddenEditors((prev) => {
            const newSet = new Set(prev);
            newSet.add(id);
            return newSet;
        });
    };

    const handlePanelExpand = (id: string) => {
        setCollapsedPanels((prev) => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
        setHiddenEditors((prev) => {
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

    const handleDialogConfirm = () => {
        if (!activeEditorId) return;

        switch (dialogType) {
            case 'delete':
                // Placeholder for delete logic
                deleteMessageById(activeEditorId);
                break;
            case 'unsaved':
                // Placeholder for handling unsaved changes
                console.log('Confirming exit with unsaved changes for:', activeEditorId);
                break;
            case 'linkBroker':
                // Placeholder for broker linking logic
                console.log('Confirming broker link for:', activeEditorId);
                break;
        }

        setDialogOpen(false);
        setActiveEditorId(null);
    };

    const openDialog = (type: DialogType, editorId: string) => {
        setDialogType(type);
        setActiveEditorId(editorId);
        setDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        openDialog('delete', id);
    };

    const handleSave = (id: string) => {
        // Placeholder for save functionality
        console.log('Saving editor:', id);
    };

    const handleAddMedia = (id: string) => {
        // Placeholder for media functionality
        console.log('Adding media to editor:', id);
    };

    const handleLinkBroker = (id: string) => {
        openDialog('linkBroker', id);
    };

    return (
        <>
            <PanelGroup
                direction='vertical'
                className='h-full'
                ref={panelGroupRef}
            >
                {displayMessages.map((message, index) => {
                    const isLastPanel = index === displayMessages.length - 1;
                    const remainingSize = 100 - (displayMessages.length - 1) * 10;
                    const isCollapsed = collapsedPanels.has(message.id);

                    return (
                        <React.Fragment key={message.id}>
                            <Panel
                                ref={(ref: ImperativePanelHandle | null) => registerPanelRef(message.id, ref)}
                                id={message.id}
                                defaultSize={isLastPanel ? remainingSize : 10}
                                minSize={10}
                                maxSize={100}
                                collapsible={true}
                                collapsedSize={3}
                                onCollapse={() => handlePanelCollapse(message.id)}
                                onExpand={() => handlePanelExpand(message.id)}
                                order={index + 1}
                            >
                                <Card className='h-full p-0 overflow-hidden bg-background border-elevation2'>
                                    <MessageTemplateHeader
                                        id={message.id}
                                        role={message.role}
                                        isCollapsed={isCollapsed}
                                        onAddMedia={handleAddMedia}
                                        onLinkBroker={handleLinkBroker}
                                        onDelete={handleDelete}
                                        onSave={handleSave}
                                        onToggleCollapse={toggleEditor}
                                    />

                                    <div
                                        className={`transition-all duration-200 ${
                                            hiddenEditors.has(message.id) ? 'h-0 overflow-hidden' : 'h-[calc(100%-2rem)]'
                                        }`}
                                    >
                                        <MessageEditor
                                            id={message.id}
                                            className='w-full h-full border rounded-md'
                                            initialContent={message.content}
                                        />
                                    </div>
                                </Card>
                            </Panel>
                            {!isLastPanel && <PanelResizeHandle />}
                        </React.Fragment>
                    );
                })}

                <Button
                    variant='ghost'
                    className='w-full mt-2'
                    onClick={addNewSection}
                >
                    <Plus className='h-4 w-4 mr-2' />
                    Add {displayMessages[displayMessages.length - 1]?.role === 'user' ? 'Assistant' : 'User'} Message
                </Button>
            </PanelGroup>

            <ConfirmationDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onConfirm={handleDialogConfirm}
                type={dialogType}
            />
        </>
    );
}

export default EditorContainer;
