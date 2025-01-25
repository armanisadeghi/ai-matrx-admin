'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '@/features/rich-text-editor/hooks/useEditor';
import { useComponentRef } from '@/lib/refs';
import { EditorChipButton } from './components/EditorChipButton';
import { WithRefsProps, withRefs } from '@/lib/refs';
import { setupEditorAttributes } from './utils/editorUtils';
import { getEditorSelection, SelectionState } from './utils/selectionUtils';
import { useSetEditorContent } from './hooks/useSetEditorContent';
import { useEditorContext } from './provider/provider';
import { ChipHandlers } from './utils/createChipUtil';
import { createEditorUpdateManager } from './createEditorUpdateManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrokerMetaData } from './types/editor.types';

export interface RichTextEditorProps extends WithRefsProps {
    onChange?: (content: string) => void;
    className?: string;
    onDragOver?: (e: React.DragEvent<HTMLElement>) => void;
    onDrop?: (e: React.DragEvent<HTMLElement>) => void;
    initialContent?: string;
    onBlur?: () => void;
    chipHandlers?: ChipHandlers;
    updateOptions?: {
        debounceDelay?: number;
        maxWait?: number;
        minUpdateInterval?: number;
    };
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    componentId,
    onChange,
    className = '',
    onDragOver,
    onDrop,
    initialContent,
    onBlur,
    chipHandlers: initialChipHandlers,
    updateOptions,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const context = useEditorContext();
    const blurListenersRef = useRef<Set<() => void>>(new Set());
    const initializedRef = useRef(false);
    const dialogEventListenerRef = useRef<(e: Event) => void>(() => {});

    const [selectionState, setSelectionState] = useState<SelectionState>({
        hasSelection: false,
        selectedText: '',
        range: null,
    });


    const [dialogState, setDialogState] = useState({
        isOpen: false,
        selectedChip: null as BrokerMetaData | null
    });

    // Memoize the enhanced chip handlers to prevent recreation
    const enhancedChipHandlers = useMemo(() => ({
        ...initialChipHandlers,
        onDoubleClick: (event: MouseEvent, metadata: BrokerMetaData) => {
            setDialogState({
                isOpen: true,
                selectedChip: metadata
            });
            initialChipHandlers?.onDoubleClick?.(event, metadata);
        }
    }), [initialChipHandlers]);

    useEffect(() => {
        const handleChipDialog = (e: CustomEvent) => {
            setDialogState({
                isOpen: true,
                selectedChip: e.detail.metadata
            });
        };

        dialogEventListenerRef.current = handleChipDialog as EventListener;
        document.addEventListener('openChipDialog', dialogEventListenerRef.current);
        
        return () => {
            if (dialogEventListenerRef.current) {
                document.removeEventListener('openChipDialog', dialogEventListenerRef.current);
            }
        };
    }, []);

    const editorHook = useEditor(componentId, enhancedChipHandlers, onChange);
    const { setContent, isProcessing } = useSetEditorContent(componentId, editorHook);

    const updateManager = useMemo(
        () => createEditorUpdateManager(componentId, context, onChange, updateOptions),
        [componentId, context, onChange, updateOptions]
    );

    const {
        updateEncodedText,
        insertChip,
        convertSelectionToChip,
        convertToEnhancedChip,
        applyStyle,
        getText,
        focus,
        handleDragOver: handleDragOverInternal,
        handleDrop: handleDropInternal,
    } = editorHook;

    useComponentRef(componentId, {
        getText,
        updateEncodedText: () => {
            if (editorRef.current && !isProcessing) {
                updateManager.forceUpdate(editorRef.current);
            }
        },
        applyStyle,
        insertChip,
        convertSelectionToChip,
        focus,
        setContent,
        blur: () => {
            if (!isProcessing) {
                updateManager.flushPendingUpdates(editorRef.current!);
            }
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
        const editor = editorRef.current;
        if (!editor) return;

        const handleSelectionChange = () => {
            if (!isProcessing) {
                const newState = getEditorSelection(editor);
                setSelectionState(newState);
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        editor.addEventListener('mouseup', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            editor.removeEventListener('mouseup', handleSelectionChange);
        };
    }, [isProcessing]);

    useEffect(() => {
        if (!isProcessing && !initializedRef.current) {
            updateManager.initialize();
        }
    }, [isProcessing, updateManager]);

    useEffect(() => {
        const initializeEditor = async () => {
            if (isProcessing) return;
            const editor = editorRef.current;
            if (!editor || initializedRef.current) return;

            setupEditorAttributes(editor, componentId);

            try {
                if (initialContent) {
                    await setContent(initialContent);
                    initializedRef.current = true;
                }
            } catch (error) {
                console.error('Error initializing editor:', error);
            }
        };

        initializeEditor();
    }, [isProcessing, componentId, initialContent, setContent]);

    useEffect(() => {
        if (isProcessing) return;
        const editor = editorRef.current;
        if (!editor || !initializedRef.current) return;

        const handlePaste = async (e: ClipboardEvent) => {
            e.preventDefault();
            const text = e.clipboardData?.getData('text/plain');
            if (text) {
                document.execCommand('insertText', false, text);
                if (initializedRef.current) {
                    updateManager.forceUpdate(editor);
                }
            }
        };

        editor.addEventListener('paste', handlePaste);

        return () => {
            editor.removeEventListener('paste', handlePaste);
        };
    }, [componentId, updateManager, isProcessing]);

    useEffect(() => {
        return () => {
            updateManager.cleanup();
        };
    }, [updateManager]);

    const handleInput = useCallback(
        (e: React.FormEvent<HTMLDivElement>) => {
            if (!isProcessing && initializedRef.current) {
                updateManager.handleInput(e);
            }
        },
        [updateManager, isProcessing]
    );

    const handleNewChip = useCallback(async () => {
        const editor = editorRef.current;
        if (!editor) return;

        try {
            if (selectionState.hasSelection) {
                // await convertSelectionToChip();
                await convertToEnhancedChip();
            } else {
                await insertChip();
            }
        } catch (error) {
            console.error('Error handling chip operation:', error);
        }
    }, [selectionState.hasSelection, convertSelectionToChip, insertChip, isProcessing]);

    const handleBlurInternal = useCallback(() => {
        if (!isProcessing && initializedRef.current) {
            updateManager.flushPendingUpdates(editorRef.current!);
        }
        onBlur?.();
        blurListenersRef.current.forEach((listener) => listener());
    }, [updateManager, onBlur, isProcessing]);

    return (
        <div className='relative group w-full h-full flex flex-col'>
            <div className='flex-1 overflow-hidden'>
                <div
                    ref={editorRef}
                    data-editor-id={componentId}
                    className={`w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300
                        dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent px-4 py-2
                        focus:outline-none text-neutral-950 dark:text-neutral-50 whitespace-pre-wrap ${className}`}
                    contentEditable
                    onInput={handleInput}
                    onBlur={handleBlurInternal}
                    onDragOver={onDragOver || handleDragOverInternal}
                    onDrop={onDrop || handleDropInternal}
                />
            </div>

            <EditorChipButton
                editorId={componentId}
                onInsertChip={handleNewChip}
                onConvertToChip={handleNewChip}
                hasSelection={selectionState.hasSelection}
            />
            <Dialog 
                open={dialogState.isOpen} 
                onOpenChange={(open) => setDialogState(prev => ({ ...prev, isOpen: open }))}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Chip Details</DialogTitle>
                    </DialogHeader>
                    {dialogState.selectedChip && (
                        <div className="p-4">
                            <p>Name: {dialogState.selectedChip.name}</p>
                            <p>Record ID: {dialogState.selectedChip.matrxRecordId}</p>
                            <p>Status: {dialogState.selectedChip.status}</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default withRefs(RichTextEditor);
