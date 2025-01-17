'use client';

import React, { useCallback, useRef, useState } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, ImperativePanelGroupHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui';
import { Plus } from 'lucide-react';
import { MatrxRecordId } from '@/types';
import ConfirmationDialog, { DialogType } from './ConfirmationDialog';
import { useMessageTemplatesWithNew } from '../hooks/dev/useMessageWithNew';
import { AddMessagePayload, useAddMessage } from '../hooks/messages/useAddMessage';
import ManagedMessageEditor from './MessageEditorWithProvider';


function MessagesContainer() {
    const recipeMessageHook = useMessageTemplatesWithNew();
    const { messages, messageMatrxIds, deleteMessageById } = recipeMessageHook;
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
            content: '',
            order: messages.length,
        };

        addMessage(newSection);
    }, [messages, addMessage]);

    const registerPanelRef = (matrxRecordId: MatrxRecordId, ref: ImperativePanelHandle | null) => {
        if (ref) {
            panelRefs.current.set(matrxRecordId, ref);
        } else {
            panelRefs.current.delete(matrxRecordId);
        }
    };

    const handlePanelCollapse = (matrxRecordId: MatrxRecordId) => {
        setCollapsedPanels((prev) => {
            const newSet = new Set(prev);
            newSet.add(matrxRecordId);
            return newSet;
        });
        setHiddenEditors((prev) => {
            const newSet = new Set(prev);
            newSet.add(matrxRecordId);
            return newSet;
        });
    };

    const handlePanelExpand = (matrxRecordId: MatrxRecordId) => {
        setCollapsedPanels((prev) => {
            const newSet = new Set(prev);
            newSet.delete(matrxRecordId);
            return newSet;
        });
        setHiddenEditors((prev) => {
            const newSet = new Set(prev);
            newSet.delete(matrxRecordId);
            return newSet;
        });
    };

    const toggleEditor = useCallback(
        (matrxRecordId: MatrxRecordId) => {
            const panelRef = panelRefs.current.get(matrxRecordId);
            const isCurrentlyCollapsed = collapsedPanels.has(matrxRecordId);

            if (isCurrentlyCollapsed) {
                panelRef?.resize(10);
                handlePanelExpand(matrxRecordId);
            } else {
                panelRef?.resize(3);
                handlePanelCollapse(matrxRecordId);
            }
        },
        [handlePanelExpand, handlePanelCollapse]
    );

    const handleDialogConfirm = () => {
        if (!activeEditorId) return;

        switch (dialogType) {
            case 'delete':
                deleteMessageById(activeEditorId);
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

    const openDialog = (type: DialogType, matrxRecordId: MatrxRecordId) => {
        setDialogType(type);
        setActiveEditorId(matrxRecordId);
        setDialogOpen(true);
    };

    return (
        <>
            <PanelGroup
                direction='vertical'
                className='h-full'
                ref={panelGroupRef}
            >
                {(messages.length ? messages : [
                    { matrxRecordId: 'system-1', role: 'system', order: 0 },
                    { matrxRecordId: 'user-1', role: 'user', order: 1 }
                ]).map((message, index, array) => {
                    const isLastPanel = index === array.length - 1;
                    const remainingSize = 100 - (array.length - 1) * 10;
                    const isCollapsed = collapsedPanels.has(message.matrxRecordId);

                    return (
                        <React.Fragment key={message.matrxRecordId}>
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
                                <ManagedMessageEditor
                                    matrxRecordId={message.matrxRecordId}
                                    recipeMessageHook={recipeMessageHook}
                                    deleteMessageById={deleteMessageById}
                                    isCollapsed={isCollapsed}
                                    onToggleEditor={() => toggleEditor(message.matrxRecordId)}
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
