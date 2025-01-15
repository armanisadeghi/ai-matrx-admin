'use client';

import React, { useCallback, useRef, useState } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, ImperativePanelGroupHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui';
import { Plus } from 'lucide-react';
import { MatrxRecordId, MessageTemplateDataOptional } from '@/types';
import ConfirmationDialog, { DialogType } from './ConfirmationDialog';
import { useMessageTemplatesWithNew } from '../hooks/dev/useMessageWithNew';
import { AddMessagePayload, useAddMessage } from '../hooks/messages/useAddMessage';
import ManagedMessageEditor from './CardWithProvider';
import { useAppSelector, useEntityTools } from '@/lib/redux';
import MessageEditor from '@/features/rich-text-editor/provider/withMessageEditor';

const INITIAL_PANELS: ExtendedMessageData[] = [
    {
        id: 'system-1',
        matrxRecordId: 'system-1',
        role: 'system',
        type: 'text',
        content: '',
    },
    {
        id: 'user-1',
        matrxRecordId: 'user-1',
        role: 'user',
        type: 'text',
        content: '',
    },
];

type ExtendedMessageData = MessageTemplateDataOptional & {
    matrxRecordId: MatrxRecordId;
};

function EditorContainer() {
    const { messageMatrxIds, deleteMessageById } = useMessageTemplatesWithNew();
    const { addMessage } = useAddMessage();

    const selectors = useEntityTools('messageTemplate').selectors;
    const matchingChildRecords = useAppSelector((state) => selectors.selectRecordsWithKeys(state, messageMatrxIds)) as Array<ExtendedMessageData>;

    const messages = matchingChildRecords;
    const hasRealData = matchingChildRecords.length > 0;
    const displayMessages = hasRealData ? matchingChildRecords : INITIAL_PANELS;

    const [collapsedPanels, setCollapsedPanels] = useState<Set<MatrxRecordId>>(new Set());
    const [hiddenEditors, setHiddenEditors] = useState<Set<MatrxRecordId>>(new Set());
    const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
    const panelRefs = useRef<Map<MatrxRecordId, ImperativePanelHandle>>(new Map());

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState<DialogType>('delete');
    const [activeEditorId, setActiveEditorId] = useState<MatrxRecordId | null>(null);

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

    const toggleEditor = useCallback(
        (id: string) => {
            const panelRef = panelRefs.current.get(id);
            const isCurrentlyCollapsed = collapsedPanels.has(id);

            if (isCurrentlyCollapsed) {
                panelRef?.resize(10);
                handlePanelExpand(id);
            } else {
                panelRef?.resize(3);
                handlePanelCollapse(id);
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

    const openDialog = (type: DialogType, id: string) => {
        setDialogType(type);
        setActiveEditorId(id);
        setDialogOpen(true);
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
                    const isCollapsed = collapsedPanels.has(message.matrxRecordId);

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
                                {hasRealData ? (
                                    <ManagedMessageEditor
                                        matrxRecordId={message.matrxRecordId}
                                        deleteMessageById={deleteMessageById}
                                        isCollapsed={isCollapsed}
                                        onToggleEditor={() => toggleEditor(message.matrxRecordId)}
                                    />
                                ) : (
                                    <MessageEditor
                                        id={message.id}
                                        className='w-full h-full border rounded-md'
                                        initialContent={message.content}
                                    />
                                )}
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
