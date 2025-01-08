// RichTextEditor.tsx
import React, { useEffect, useRef } from 'react';
import { useEditor } from '@/features/rich-text-editor/hooks/useEditor';
import { useComponentRef } from '@/lib/refs';
import { EditorChipButton } from './components/EditorChipButton';
import { WithRefsProps, withRefs } from '@/lib/refs';
import { setupEditorAttributes } from './utils/editorUtils';

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
        // Add method to set content programmatically
        setContent: (content: string) => {
            const editor = editorRef.current;
            if (!editor) return;
            editor.textContent = content;
            updatePlainTextContent();
        }
    });

    // Handle initial setup and content
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor || initializedRef.current) return;

        setupEditorAttributes(editor, componentId);

        // Set initial content if provided
        if (initialContent && !initializedRef.current) {
            editor.textContent = initialContent;
            updatePlainTextContent();
            initializedRef.current = true;
        }

        // Set up event listeners
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
        convertSelectionToChip();
    };

    return (
        <div className='relative group w-full h-full flex flex-col'>
            <div
                ref={editorRef}
                className={`w-full h-full min-h-48 p-4 focus:outline-none text-neutral-950 dark:text-neutral-50 whitespace-pre-wrap ${className}`}
                contentEditable
                onInput={handleInput}
                onBlur={normalizeContent}
                onDragOver={onDragOver || handleDragOverInternal}
                onDrop={onDrop || handleDropInternal}
            />
            <EditorChipButton
                editorId={componentId}
                onInsertChip={insertChip}
                onConvertToChip={handleConvertToChip}
            />
        </div>
    );
};

export default withRefs(RichTextEditor);