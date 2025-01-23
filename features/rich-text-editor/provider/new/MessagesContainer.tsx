'use client';

import React, { useCallback, useRef, useState } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, ImperativePanelGroupHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui';
import { Plus } from 'lucide-react';
import { MatrxRecordId } from '@/types';
import MessageEditor from './MessageEditor';
import { EditorProvider, EditorState } from './messageEditorProvider';

interface MessagesContainerProps {
    messages: EditorState[];  // This should be explicitly typed as EditorState[]
    onDragDrop: (sourceId: MatrxRecordId, destinationId: MatrxRecordId) => void;
    deleteMessage: (messageRecordId: MatrxRecordId) => void;
    onAddSection: () => void;
}

function MessagesContainer({ messages, onDragDrop, deleteMessage, onAddSection }: MessagesContainerProps) {
    const [collapsedPanels, setCollapsedPanels] = useState<Set<MatrxRecordId>>(new Set());
    const [hiddenEditors, setHiddenEditors] = useState<Set<MatrxRecordId>>(new Set());
    const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
    const panelRefs = useRef<Map<MatrxRecordId, ImperativePanelHandle>>(new Map());

    const toggleEditor = useCallback(
        (messageRecordId: MatrxRecordId) => {
            const panelRef = panelRefs.current.get(messageRecordId);
            const isCurrentlyCollapsed = collapsedPanels.has(messageRecordId);

            if (isCurrentlyCollapsed) {
                panelRef?.resize(10);
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
            } else {
                panelRef?.resize(3);
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
            }
        },
        [collapsedPanels]
    );

    return (
        <>
            <PanelGroup
                id='messages-panel-group'
                direction='vertical'
                className='h-full'
                ref={panelGroupRef}
            >
                {messages.map((editor, index, array) => {
                    const isLastPanel = index === array.length - 1;
                    const remainingSize = 100 - (array.length - 1) * 10;
                    const isCollapsed = collapsedPanels.has(editor.matrxRecordId);

                    return (
                        <React.Fragment key={editor.matrxRecordId}>
                            test1
                            <Panel
                                ref={(ref: ImperativePanelHandle | null) => {
                                    if (ref) {
                                        panelRefs.current.set(editor.matrxRecordId, ref);
                                    } else {
                                        panelRefs.current.delete(editor.matrxRecordId);
                                    }
                                }}
                                id={editor.matrxRecordId}
                                defaultSize={isLastPanel ? remainingSize : 10}
                                minSize={10}
                                maxSize={100}
                                collapsible={true}
                                collapsedSize={3}
                                order={editor.order}
                            >
                                test 2
                                <EditorProvider messageMatrxId={editor.matrxRecordId}>
                                    test 3
                                    <MessageEditor
                                        messageRecordId={editor.matrxRecordId}
                                        message={editor}
                                        deleteMessage={deleteMessage}
                                        isCollapsed={isCollapsed}
                                        onToggleEditor={() => toggleEditor(editor.matrxRecordId)}
                                        onDragDrop={onDragDrop}
                                    />
                                </EditorProvider>
                            </Panel>
                            {!isLastPanel && <PanelResizeHandle />}
                        </React.Fragment>
                    );
                })}
            </PanelGroup>

            <Button
                variant='ghost'
                className='w-full mt-2'
                onClick={onAddSection}
            >
                <Plus className='h-4 w-4 mr-2' />
                Add {messages[messages.length - 1]?.role === 'user' ? 'Assistant' : 'User'} Message
            </Button>
        </>
    );
}

export default MessagesContainer;
