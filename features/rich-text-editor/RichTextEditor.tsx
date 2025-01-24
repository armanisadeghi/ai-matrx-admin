// RichTextEditor.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '@/features/rich-text-editor/hooks/useEditor';
import { useComponentRef } from '@/lib/refs';
import { EditorChipButton } from './components/EditorChipButton';
import { WithRefsProps, withRefs } from '@/lib/refs';
import { extractEncodedTextFromDom, setupEditorAttributes } from './utils/editorUtils';
import { getEditorSelection, SelectionState } from './utils/selectionUtils';
import { useSetEditorContent } from './hooks/useSetEditorContent';
import { useEditorContext } from './provider/provider';
import { ChipHandlers } from './utils/createChipUtil';
import { debounce } from 'lodash';
import { createEditorUpdateManager } from './createEditorUpdateManager';

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

    const updateManager = useMemo(
        () => createEditorUpdateManager(componentId, context, onChange),
        [componentId, context, onChange]
    );


    const providerContent = context.getContent(componentId);
    const initializedRef = useRef(false);
    const blurListenersRef = useRef<Set<() => void>>(new Set());
    const [selectionState, setSelectionState] = useState<SelectionState>({
        hasSelection: false,
        selectedText: '',
        range: null,
    });

    const editorHook = useEditor(componentId, chipHandlers, onChange);
    const { setContent, isProcessing } = useSetEditorContent(componentId, editorHook);

    const {
        // Internal methods
        updateEncodedText,
        // Ref methods
        insertChip,
        convertSelectionToChip,
        applyStyle,
        getText,
        focus,
        // Event handlers
        handleDragOver: handleDragOverInternal,
        handleDrop: handleDropInternal,
    } = editorHook;

    // Register methods with the Ref Manager
    useComponentRef(componentId, {
        getText,
        updateEncodedText,
        applyStyle,
        insertChip,
        convertSelectionToChip,
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

    // Handle selection changes
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const handleSelectionChange = () => {
            const newState = getEditorSelection(editor);
            setSelectionState(newState);
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        editor.addEventListener('mouseup', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            editor.removeEventListener('mouseup', handleSelectionChange);
        };
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
    }, [isProcessing, componentId, initialContent]);

    useEffect(() => {
        if (isProcessing) return;
        const editor = editorRef.current;
        if (!editor || initializedRef.current) return;

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            const text = e.clipboardData?.getData('text/plain');
            if (text) {
                document.execCommand('insertText', false, text);
                updateEncodedText();
            }
        };

        editor.addEventListener('paste', handlePaste);
        console.log('event listeners added');

        return () => {
            editor.removeEventListener('paste', handlePaste);
        };
    }, [componentId, initialContent, updateEncodedText]);

    // Handle content changes
    useEffect(() => {
        onChange?.(providerContent);
    }, [onChange, providerContent]);


    const handleContentUpdate = (element: HTMLDivElement, componentId: string, onChange?: (content: string) => void) => {
        const content = extractEncodedTextFromDom(element);
        context.setContent(componentId, content);
        onChange?.(content);
    };

    const debouncedUpdate = debounce(handleContentUpdate, 1000);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        const element = e.currentTarget;
        const inputType = (e as unknown as InputEvent).inputType;

        // Immediate updates for specific types of changes
        if (inputType === 'deleteByCut' || inputType === 'insertFromPaste' || inputType === 'deleteContentBackward' || inputType === 'deleteContentForward') {
            handleContentUpdate(element, componentId, onChange);
            return;
        }

        // Debounced updates for regular typing
        debouncedUpdate(element, componentId, onChange);
    };

    const handleNewChip = () => {
        if (selectionState.hasSelection) {
            convertSelectionToChip();
        } else {
            insertChip();
        }
    };

    const handleBlurInternal = useCallback(() => {
        updateEncodedText();
        onBlur?.();
        blurListenersRef.current.forEach((listener) => listener());
    }, [updateEncodedText, onBlur]);

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
        </div>
    );
};

export default withRefs(RichTextEditor);
