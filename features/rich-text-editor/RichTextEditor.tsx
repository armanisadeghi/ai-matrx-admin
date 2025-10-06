// RichTextEditor.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '@/features/rich-text-editor/hooks/useEditor';
import { useComponentRef } from '@/lib/refs';
import { EditorChipButton } from './components/EditorChipButton';
import { WithRefsProps, withRefs } from '@/lib/refs';
import { setupEditorAttributes } from './utils/editorUtils';
import { getEditorSelection, SelectionState } from './utils/selectionUtils';
import { useSetEditorContent } from './hooks/useSetEditorContent';
import { useEditorContext } from '@/providers/rich-text-editor/Provider';
import { BrokerMetaData } from '@/types/editor.types';
import MetadataDialog from './components/MetadataDialog';
import _ from 'lodash';
import { ChipHandlers } from './utils/enhancedChipUtils';
import { handleEditorPaste } from './utils/setEditorUtils';
import { EditorContextMenu } from './components/EditorContextMenu';

export interface RichTextEditorProps extends WithRefsProps {
    onChange?: (content: string) => void;
    className?: string;
    onDragOver?: (e: React.DragEvent<HTMLElement>) => void;
    onDrop?: (e: React.DragEvent<HTMLElement>) => void;
    initialContent?: string;
    onBlur?: () => void;
    chipHandlers?: ChipHandlers;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ componentId, onChange, className = '', onDragOver, onDrop, initialContent, onBlur, chipHandlers }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const context = useEditorContext();
    const initializedRef = useRef(false);
    const blurListenersRef = useRef<Set<() => void>>(new Set());
    const dialogEventListenerRef = useRef<(e: Event) => void>(() => {});
    const [dialogState, setDialogState] = useState({
        isOpen: false,
        selectedChip: null as BrokerMetaData | null,
    });

    const [selectionState, setSelectionState] = useState<SelectionState>({
        hasSelection: false,
        selectedText: '',
        range: null,
    });

    const editorHook = useEditor(componentId, chipHandlers, onChange);
    const { setContent, isProcessing } = useSetEditorContent(componentId, editorHook);
    const {
        updateContentAndMetadata,
        createEnhancedChip,
        applyStyle,
        getText,
        focus,
        handleDragOver: handleDragOverInternal,
        handleDrop: handleDropInternal,
    } = editorHook;

    useComponentRef(componentId, {
        getText,
        updateContentAndMetadata,
        applyStyle,
        createEnhancedChip,
        focus,
        setContent,
        // Add new ref methods
        blur: () => {
            editorRef.current?.blur();
        },
        addBlurListener: (handler: () => void) => {
            blurListenersRef.current.add(handler);
        },
        removeBlurListener: (handler: () => void) => {
            blurListenersRef.current.delete(handler);
        },
    });

    useEffect(() => {
        const handleSelectionChange = () => {
            if (editorRef.current) {
                const newState = getEditorSelection(editorRef.current);
                setSelectionState(newState);
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, []);

    useEffect(() => {
        const initializeEditor = async () => {
            if (isProcessing) return;
            const editor = editorRef.current;
            if (!editor || initializedRef.current) return;

            setupEditorAttributes(editor, componentId);

            try {
                if (initialContent && !initializedRef.current) {
                    await setContent(initialContent);
                    initializedRef.current = true;
                }
            } catch (error) {
                console.error('Error initializing editor:', error);
            }
        };

        initializeEditor();
    }, [isProcessing, componentId, initialContent, context.setEditorInitialized, setContent]);

    // const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    //     e.preventDefault();
    //     const text = e.clipboardData.getData('text/plain');
    //     if (text) {
    //         const selection = window.getSelection();
    //         if (selection && selection.rangeCount > 0) {
    //             const range = selection.getRangeAt(0);
    //             range.deleteContents();
    //             range.insertNode(document.createTextNode(text));
    //         }
    //         updateContentAndMetadata();
    //     }
    // };
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        handleEditorPaste(e.nativeEvent, editorRef, updateContentAndMetadata);
    };


    const handleMouseUp = () => {
        if (editorRef.current) {
            const newState = getEditorSelection(editorRef.current);
            setSelectionState(newState);
        }
    };

    useEffect(() => {
        const handleChipDialog = (e: CustomEvent) => {
            console.log('Dialog handler triggered from useEffect'); // Debug log
            setDialogState({
                isOpen: true,
                selectedChip: e.detail.metadata,
            });
        };

        dialogEventListenerRef.current = handleChipDialog as EventListener;
        document.addEventListener('openChipDialog', dialogEventListenerRef.current);

        return () => {
            console.log('Cleaning up openChipDialog listener'); // Debug log
            if (dialogEventListenerRef.current) {
                document.removeEventListener('openChipDialog', dialogEventListenerRef.current);
            }
        };
    }, []);

    const debounceUpdateContent = useMemo(
        () =>
            _.debounce(() => {
                if (isProcessing || !initializedRef.current) return;
                updateContentAndMetadata();
            }, 1000),
        [updateContentAndMetadata, isProcessing]
    );

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        if (isProcessing || !initializedRef.current) return;
        const inputType = (e as unknown as InputEvent).inputType;
        if (inputType === 'deleteByCut' || inputType === 'insertFromPaste' || inputType === 'deleteContentBackward' || inputType === 'deleteContentForward') {
            console.log('Input type:', inputType, ' - Updating content immediately');
            updateContentAndMetadata();
            return;
        }
        debounceUpdateContent();
    };

    const handleNewChip = () => {
        if (isProcessing || !initializedRef.current) return;
        createEnhancedChip();
    };

    const handleBlurInternal = useCallback(() => {
        if (isProcessing || !initializedRef.current) return;
        updateContentAndMetadata();
        onBlur?.();
        blurListenersRef.current.forEach((listener) => listener());
    }, [updateContentAndMetadata, onBlur]);

    const handleContentInserted = useCallback(() => {
        if (isProcessing || !initializedRef.current) return;
        updateContentAndMetadata();
    }, [updateContentAndMetadata, isProcessing]);

    return (
        <div className='relative group w-full h-full flex flex-col'>
            <div className='flex-1 overflow-hidden'>
                <EditorContextMenu editorId={componentId} onContentInserted={handleContentInserted}>
                    <div
                        ref={editorRef}
                        data-editor-id={componentId}
                        className={`w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 
                            dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent px-4 py-2
                            focus:outline-none text-neutral-950 dark:text-neutral-50 whitespace-pre-wrap ${className}`}
                        contentEditable
                        onInput={handleInput}
                        onBlur={handleBlurInternal}
                        onPaste={handlePaste}
                        onMouseUp={handleMouseUp}
                        onDragOver={onDragOver || handleDragOverInternal}
                        onDrop={onDrop || handleDropInternal}
                    />
                </EditorContextMenu>
            </div>

            <EditorChipButton
                editorId={componentId}
                onInsertChip={handleNewChip}
                onConvertToChip={handleNewChip}
                hasSelection={selectionState.hasSelection}
            />
            <MetadataDialog
                isOpen={dialogState.isOpen}
                onOpenChange={(open) => setDialogState((prev) => ({ ...prev, isOpen: open }))}
                metadata={dialogState.selectedChip}
            />
        </div>
    );
};

export default withRefs(RichTextEditor);
