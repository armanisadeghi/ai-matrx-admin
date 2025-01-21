// RichTextEditor.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor } from '@/features/rich-text-editor/hooks/useEditor';
import { useComponentRef } from '@/lib/refs';
import { EditorChipButton } from './components/EditorChipButton';
import { WithRefsProps, withRefs } from '@/lib/refs';
import { setupEditorAttributes } from './utils/editorUtils';
import { getEditorSelection, SelectionState } from './utils/selectionUtils';
import { useChipMenu } from './components/ChipContextMenu';
import { ChipHandlers, createChipHandlers } from './utils/chipService';
import { useSetEditorContent } from './hooks/useSetEditorContent';

export interface RichTextEditorProps extends WithRefsProps {
    onChange?: (content: string) => void;
    className?: string;
    onDragOver?: (e: React.DragEvent<HTMLElement>) => void;
    onDrop?: (e: React.DragEvent<HTMLElement>) => void;
    initialContent?: string;
    onBlur?: () => void;
    chipHandlers?: ChipHandlers;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    componentId,
    onChange,
    className = '',
    onDragOver,
    onDrop,
    initialContent = '',
    onBlur,
    chipHandlers: handlers,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const initializedRef = useRef(false);
    const blurListenersRef = useRef<Set<() => void>>(new Set());
    const [selectionState, setSelectionState] = useState<SelectionState>({
        hasSelection: false,
        selectedText: '',
        range: null,
    });

    const { showMenu } = useChipMenu();
    const chipHandlers = createChipHandlers({ showMenu, editorId: componentId, handlers });
    const editorHook = useEditor(componentId, chipHandlers);
    const { setContent, isProcessing } = useSetEditorContent(componentId, editorHook);

    const {
        // Internal methods
        updatePlainTextContent,
        normalizeContent,
        handleStyleChange,

        // Ref methods
        insertChip,
        convertSelectionToChip,
        applyStyle,
        getText,
        normalize,
        updateContent,
        focus,

        // State
        plainTextContent,

        // Event handlers
        handleNativeDragStart,
        handleNativeDragEnd,
        handleDragOver: handleDragOverInternal,
        handleDrop: handleDropInternal,
    } = editorHook;

    // Register methods with the Ref Manager
    useComponentRef(componentId, {
        getText,
        updateContent,
        applyStyle,
        normalize,
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

    // Handle initial setup and content
    useEffect(() => {
        if (isProcessing) return;
        const editor = editorRef.current;
        if (!editor || initializedRef.current) return;

        setupEditorAttributes(editor, componentId);
        console.log('Setting initial content:', initialContent);

        // Use our new setContent method for initial content
        if (initialContent && !initializedRef.current) {
            setContent(initialContent).then(() => {
                initializedRef.current = true;
            });
            console.log('Setting initial content:', initialContent);
        }
    }, []);

    useEffect(() => {
        if (isProcessing) return;
        const editor = editorRef.current;
        if (!editor || initializedRef.current) return;
        console.log('--Additional useEffect:', initialContent);

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            const text = e.clipboardData?.getData('text/plain');
            if (text) {
                document.execCommand('insertText', false, text);
            }
        };

        editor.addEventListener('paste', handlePaste);
        editor.addEventListener('dragstart', handleNativeDragStart);
        editor.addEventListener('dragend', handleNativeDragEnd);
        console.log('event listeners added');

        return () => {
            editor.removeEventListener('paste', handlePaste);
            editor.removeEventListener('dragstart', handleNativeDragStart);
            editor.removeEventListener('dragend', handleNativeDragEnd);
        };
    }, [componentId, initialContent, handleNativeDragStart, handleNativeDragEnd, updatePlainTextContent]);

    // Handle content changes
    useEffect(() => {
        console.log('Content changed:', plainTextContent);
        onChange?.(plainTextContent);
    }, [onChange, plainTextContent]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        console.log('Input event:', e.currentTarget.textContent);
        updatePlainTextContent();
        onChange?.(e.currentTarget.textContent || '');
    };

    const handleConvertToChip = () => {
        console.log('Convert to chip');
        if (selectionState.hasSelection) {
            convertSelectionToChip();
        }
    };

    const handleBlurInternal = useCallback(() => {
        console.log('Blur event');
        normalizeContent();
        onBlur?.();
        blurListenersRef.current.forEach((listener) => listener());
    }, [normalizeContent, onBlur]);

    return (
        <div className='relative group w-full h-full flex flex-col'>
            <div className='flex-1 overflow-hidden'>
                <div
                    ref={editorRef}
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
                onInsertChip={insertChip}
                onConvertToChip={handleConvertToChip}
                hasSelection={selectionState.hasSelection}
            />
        </div>
    );
};

export default withRefs(RichTextEditor);
