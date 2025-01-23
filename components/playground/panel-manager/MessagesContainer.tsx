'use client';

import React, { useCallback, useRef, useState } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, ImperativePanelGroupHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui';
import { Plus } from 'lucide-react';
import { MatrxRecordId } from '@/types';
import ConfirmationDialog, { DialogType } from './ConfirmationDialog';
import { AddMessagePayload, useAddMessage } from '../hooks/messages/useAddMessage';
import { RelationshipHook } from '@/app/entities/hooks/relationships/useRelationships';
import { useRecipeMessages } from '../hooks/useRecipeMessages';
import { ProcessedRecipeMessages } from './types';
import MessageEditor from './MessageEditor';

const INITIAL_PANELS: ProcessedRecipeMessages[] = [
    {
        id: 'system-1',
        matrxRecordId: 'system-1',
        role: 'system',
        type: 'text',
        content: '',
        order: 0,
    },
    {
        id: 'user-1',
        matrxRecordId: 'user-1',
        role: 'user',
        type: 'text',
        content: '',
        order: 1,
    },
];



interface MessagesContainerProps {
    relationshipHook: RelationshipHook;
    recipeRecordId?: MatrxRecordId;
}

function MessagesContainer({ relationshipHook, recipeRecordId }: MessagesContainerProps) {
    const recipeMessageHook = useRecipeMessages(relationshipHook);;
    const { messages, deleteMessage, handleDragDrop } = recipeMessageHook;
    const { addMessage } = useAddMessage();

    const [collapsedPanels, setCollapsedPanels] = useState<Set<MatrxRecordId>>(new Set());
    const [hiddenEditors, setHiddenEditors] = useState<Set<MatrxRecordId>>(new Set());
    const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
    const panelRefs = useRef<Map<MatrxRecordId, ImperativePanelHandle>>(new Map());

    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState<DialogType>('delete');
    const [activeEditorId, setActiveEditorId] = useState<MatrxRecordId | null>(null);

    const addNewSection = useCallback(() => {
        const lastSection = messages[messages.length - 1];
        const lastRole = lastSection?.role || 'system';
        const nextRole = lastRole === 'user' ? 'assistant' : 'user';

        const newSection: AddMessagePayload = {
            role: nextRole,
            type: 'text',
            content: 'test message',
            order: messages.length,
        };

        addMessage(newSection);
    }, [messages, addMessage]);

    const registerPanelRef = (messageRecordId: MatrxRecordId, ref: ImperativePanelHandle | null) => {
        if (ref) {
            panelRefs.current.set(messageRecordId, ref);
        } else {
            panelRefs.current.delete(messageRecordId);
        }
    };

    const handlePanelCollapse = (messageRecordId: MatrxRecordId) => {
        setCollapsedPanels((prev) => {
            const newSet = new Set(prev);
            newSet.add(messageRecordId);
            return newSet;
        });
        setHiddenEditors((prev) => {
            const newSet = new Set(prev);
            newSet.add(messageRecordId);
            return newSet;
        });
    };

    const handlePanelExpand = (messageRecordId: MatrxRecordId) => {
        setCollapsedPanels((prev) => {
            const newSet = new Set(prev);
            newSet.delete(messageRecordId);
            return newSet;
        });
        setHiddenEditors((prev) => {
            const newSet = new Set(prev);
            newSet.delete(messageRecordId);
            return newSet;
        });
    };

    const toggleEditor = useCallback(
        (messageRecordId: MatrxRecordId) => {
            const panelRef = panelRefs.current.get(messageRecordId);
            const isCurrentlyCollapsed = collapsedPanels.has(messageRecordId);

            if (isCurrentlyCollapsed) {
                panelRef?.resize(10);
                handlePanelExpand(messageRecordId);
            } else {
                panelRef?.resize(3);
                handlePanelCollapse(messageRecordId);
            }
        },
        [handlePanelExpand, handlePanelCollapse]
    );

    const handleDialogConfirm = () => {
        if (!activeEditorId) return;

        switch (dialogType) {
            case 'delete':
                console.log('Deleting message:', activeEditorId);
                break;
            case 'unsaved':
                console.log('Confirming exit with unsaved changes for:', activeEditorId);
                break;
            case 'linkBroker':
                console.log('Confirming broker link for:', activeEditorId);
                break;
        }

        setDialogOpen(false);
        setActiveEditorId(null);
    };

    const openDialog = (type: DialogType, messageRecordId: MatrxRecordId) => {
        setDialogType(type);
        setActiveEditorId(messageRecordId);
        setDialogOpen(true);
    };

    return (
        <>
            <PanelGroup
                id='(messages-panel-group)'
                direction='vertical'
                className='h-full'
                ref={panelGroupRef}
            >
                {(messages.length ? messages : [
                    { id: 'system-1', role: 'system', order: 0 },
                    { id: 'user-1', role: 'user', order: 1 }
                ]).map((message, index, array) => {
                    const isLastPanel = index === array.length - 1;
                    const remainingSize = 100 - (array.length - 1) * 10;
                    const isCollapsed = collapsedPanels.has(message.matrxRecordId);

                    return (
                        <React.Fragment key={message.id}>
                            <Panel
                                ref={(ref: ImperativePanelHandle | null) => registerPanelRef(message.matrxRecordId, ref)}
                                id={message.matrxRecordId}
                                defaultSize={isLastPanel ? remainingSize : 10}
                                minSize={10}
                                maxSize={100}
                                collapsible={true}
                                collapsedSize={3}
                                onCollapse={() => handlePanelCollapse(message.matrxRecordId)}
                                onExpand={() => handlePanelExpand(message.matrxRecordId)}
                                order={index + 1}
                            >
                                <MessageEditor
                                    messageRecordId={message.matrxRecordId}
                                    message={message}
                                    deleteMessage={deleteMessage}
                                    isCollapsed={isCollapsed}
                                    onToggleEditor={() => toggleEditor(message.matrxRecordId)}
                                    onDragDrop={handleDragDrop}
                                />
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
                    Add {messages[messages.length - 1]?.role === 'user' ? 'Assistant' : 'User'} Message
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

export default MessagesContainer;
