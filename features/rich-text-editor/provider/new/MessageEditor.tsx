import React, { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useEntityTools } from '@/lib/redux';
import { useUpdateRecord } from '@/app/entities/hooks/crud/useUpdateRecord';
import { Card } from '@/components/ui';
import { MatrxRecordId } from '@/types';
import { DisplayMode, EditorState, useMessageEditor } from './messageEditorProvider';
import MessageToolbar from './MessageToolbar';
import DebugPanel from '@/components/playground/panel-manager/AdminToolbar';
import { ChipData } from '../../types/editor.types';

const DEBUG_STATUS = true;

interface MessageData {
    id: string;
    content: string;
    processedContent: string;
    chips: ChipData[];
}

interface ChipChangeData {
    chipId: string;
    brokerId?: string;
    action: 'add' | 'update' | 'remove';
    data: Partial<ChipData>;
}

interface MessageEditorProps {
    messageRecordId: MatrxRecordId;
    message: EditorState;
    isCollapsed: boolean;
    className?: string;
    onCollapse?: () => void;
    onExpand?: () => void;
    onDelete?: (messageRecordId: MatrxRecordId) => void;
    onMessageUpdate?: (messageData: MessageData) => void;
    onChipUpdate?: (chipData: ChipChangeData) => void;
    onToggleEditor?: (messageRecordId: MatrxRecordId) => void;
    onDragDrop?: (draggedId: MatrxRecordId, targetId: MatrxRecordId) => void;
    deleteMessage?: (childRecordId: MatrxRecordId) => void;
    onOrderChange?: (draggedId: MatrxRecordId, dropTargetId: MatrxRecordId) => void;
}

// Simple textarea-based editor component
const SimpleTextEditor: React.FC<{
    content: string;
    className?: string;
    onBlur: () => void;
    onChange: (content: string) => void;
    displayMode: DisplayMode;
}> = ({ content, className, onBlur, onChange, displayMode }) => {
    return (
        <textarea
            className={`w-full h-full p-4 resize-none focus:outline-none ${className}`}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
        />
    );
};

export const MessageEditor: React.FC<MessageEditorProps> = ({
    messageRecordId,
    message,
    className,
    isCollapsed = false,
    onCollapse,
    onExpand,
    onDelete,
    onMessageUpdate,
    onChipUpdate,
    onToggleEditor,
    onDragDrop,
    onOrderChange,
    deleteMessage,
    ...props
}) => {
    const dispatch = useAppDispatch();
    const { updateRecord } = useUpdateRecord('messageTemplate');
    const [initialRenderHold, setInitialRenderHold] = useState(true);

    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedContent, setLastSavedContent] = useState('');
    const [isEditorHidden, setIsEditorHidden] = useState(isCollapsed);
    const [debugVisible, setDebugVisible] = useState(false);
    const { actions: messageActions } = useEntityTools('messageTemplate');

    const editorContext = useMessageEditor();
    const [displayMode, setDisplayMode] = useState<DisplayMode>(DisplayMode.NAME);
    const [editorContent, setEditorContent] = useState(message.content || '');

    useEffect(() => {
        setIsEditorHidden(isCollapsed);
    }, [isCollapsed]);

    useEffect(() => {
        if (!editorContext?.state) return;

        // Update editor content based on display mode
        let content = '';
        switch (displayMode) {
            case DisplayMode.ENCODED:
                content = editorContext.state.encodedContent;
                break;
            case DisplayMode.NAME:
            case DisplayMode.DEFAULT_VALUE:
            case DisplayMode.ID_ONLY:
                content = editorContext.state.displayContent || '';
                break;
            default:
                content = message.content || '';
        }
        setEditorContent(content);
    }, [editorContext?.state, displayMode, message.content]);

    const handleContentChange = useCallback((newContent: string) => {
        setEditorContent(newContent);
        if (displayMode === DisplayMode.ENCODED) {
            editorContext?.updateEncodedContent(newContent);
        }
    }, [displayMode, editorContext]);

    const updateMessageContent = useCallback(
        (content: string) => {
            dispatch(
                messageActions.updateUnsavedField({
                    recordId: messageRecordId,
                    field: 'content',
                    value: content,
                })
            );
        },
        [messageActions, dispatch, messageRecordId]
    );

    const handleSave = useCallback(() => {
        if (isSaving || initialRenderHold) {
            return;
        }

        let contentToSave;
        if (displayMode === DisplayMode.ENCODED) {
            contentToSave = editorContent;
        } else {
            contentToSave = editorContext?.state.encodedContent || editorContent;
        }

        if (contentToSave === lastSavedContent) {
            return;
        }

        setIsSaving(true);
        updateMessageContent(contentToSave);
        updateRecord(messageRecordId);
        setLastSavedContent(contentToSave);

        setTimeout(() => {
            setIsSaving(false);
        }, 500);
    }, [messageRecordId, updateMessageContent, updateRecord, isSaving, lastSavedContent, editorContent, displayMode, editorContext, initialRenderHold]);

    const handleBlur = useCallback(() => {
        console.log('blur event', messageRecordId);
        handleSave();
    }, [handleSave, messageRecordId]);

    const handleDelete = useCallback(() => {
        console.log('Deleting message:', messageRecordId);
        deleteMessage?.(messageRecordId);
    }, [messageRecordId, deleteMessage]);

    const handleToggleVisibility = useCallback(() => {
        setIsEditorHidden((prev) => !prev);
        onToggleEditor?.(messageRecordId);
    }, [messageRecordId, onToggleEditor]);

    const handleRoleChange = useCallback(
        (messageRecordId: MatrxRecordId, newRole: 'user' | 'assistant' | 'system') => {
            dispatch(
                messageActions.updateUnsavedField({
                    recordId: messageRecordId,
                    field: 'role',
                    value: newRole,
                })
            );
            updateRecord(messageRecordId);
        },
        [dispatch, messageActions, updateRecord]
    );

    const toggleDebug = useCallback(() => {
        setDebugVisible((prev) => !prev);
    }, []);

    // Display mode handlers
    const handleShowEncoded = useCallback(() => {
        setDisplayMode(DisplayMode.ENCODED);
        editorContext?.updateDisplayMode(DisplayMode.ENCODED);
    }, [editorContext]);

    const handleShowDefaultValue = useCallback(() => {
        setDisplayMode(DisplayMode.DEFAULT_VALUE);
        editorContext?.updateDisplayMode(DisplayMode.DEFAULT_VALUE);
    }, [editorContext]);

    const handleShowNames = useCallback(() => {
        setDisplayMode(DisplayMode.NAME);
        editorContext?.updateDisplayMode(DisplayMode.NAME);
    }, [editorContext]);

    const handleShowIds = useCallback(() => {
        setDisplayMode(DisplayMode.ID_ONLY);
        editorContext?.updateDisplayMode(DisplayMode.ID_ONLY);
    }, [editorContext]);

    return (
        <Card className="h-full p-0 overflow-hidden bg-background border-elevation2">
            <MessageToolbar
                messageRecordId={messageRecordId}
                role={message.role}
                isCollapsed={isCollapsed}
                onDelete={handleDelete}
                onSave={handleSave}
                onToggleCollapse={handleToggleVisibility}
                onEncoded={handleShowEncoded}
                onWithNames={handleShowNames}
                onDefaultValue={handleShowDefaultValue}
                onWithIds={handleShowIds}
                onRoleChange={handleRoleChange}
                onDragDrop={onDragDrop}
                debug={DEBUG_STATUS}
                onDebugClick={toggleDebug}
                onProcessed={handleShowNames}
            />
            {debugVisible && (
                <DebugPanel
                    editorId={messageRecordId}
                    message={message}
                />
            )}
            <div className={`transition-all duration-200 ${isEditorHidden ? 'h-0 overflow-hidden' : 'h-[calc(100%-2rem)]'}`}>
                <SimpleTextEditor
                    content={editorContent}
                    className={className}
                    onBlur={handleBlur}
                    onChange={handleContentChange}
                    displayMode={displayMode}
                />
            </div>
        </Card>
    );
};

MessageEditor.displayName = 'MessageEditor';

export default MessageEditor;