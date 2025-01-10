// RichTextEditor.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useEditor } from '@/features/rich-text-editor/hooks/useEditor';
import { useComponentRef } from '@/lib/refs';
import { EditorChipButton } from './components/EditorChipButton';
import { WithRefsProps, withRefs } from '@/lib/refs';
import { setupEditorAttributes } from './utils/editorUtils';
import { getEditorSelection, SelectionState } from './utils/selectionUtils';

interface RichTextEditorProps extends WithRefsProps {
    onChange?: (content: string) => void;
    className?: string;
    onDragOver?: (e: React.DragEvent<HTMLElement>) => void;
    onDrop?: (e: React.DragEvent<HTMLElement>) => void;
    initialContent?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
    componentId,
    onChange, 
    className = '', 
    onDragOver, 
    onDrop,
    initialContent = ''
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);
    const [selectionState, setSelectionState] = useState<SelectionState>({
        hasSelection: false,
        selectedText: '',
        range: null
    });

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
    } = useEditor(componentId);

    // Register methods with the Ref Manager
    useComponentRef(componentId, {
        getText,
        updateContent,
        applyStyle,
        normalize,
        insertChip,
        convertSelectionToChip,
        focus,
        setContent: (content: string) => {
            const editor = editorRef.current;
            if (!editor) return;
            editor.textContent = content;
            updatePlainTextContent();
        }
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
        const editor = editorRef.current;
        if (!editor || initializedRef.current) return;

        setupEditorAttributes(editor, componentId);

        if (initialContent && !initializedRef.current) {
            editor.textContent = initialContent;
            updatePlainTextContent();
            initializedRef.current = true;
        }

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

        return () => {
            editor.removeEventListener('paste', handlePaste);
            editor.removeEventListener('dragstart', handleNativeDragStart);
            editor.removeEventListener('dragend', handleNativeDragEnd);
        };
    }, [componentId, initialContent, handleNativeDragStart, handleNativeDragEnd, updatePlainTextContent]);

    // Handle content changes
    useEffect(() => {
        onChange?.(plainTextContent);
    }, [onChange, plainTextContent]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        updatePlainTextContent();
        onChange?.(e.currentTarget.textContent || '');
    };

    const handleConvertToChip = () => {
        if (selectionState.hasSelection) {
            convertSelectionToChip();
        }
    };

    return (
        <div className="relative group w-full h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
                <div
                    ref={editorRef}
                    className={`w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 
                        dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent px-4 py-2
                        focus:outline-none text-neutral-950 dark:text-neutral-50 whitespace-pre-wrap ${className}`}
                    contentEditable
                    onInput={handleInput}
                    onBlur={normalizeContent}
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
