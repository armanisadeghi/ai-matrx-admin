// RichTextEditor.tsx
import React, { useEffect, forwardRef, RefObject } from 'react';
import { useEditor } from '@/features/rich-text-editor/hooks/useEditor';
import { useComponentRef } from '@/lib/refs';
import { EditorChipButton } from './components/EditorChipButton';

interface RichTextEditorProps {
    id: string;
    onChange?: (content: string) => void;
    className?: string;
    onDragOver?: (e: React.DragEvent<HTMLElement>) => void;
    onDrop?: (e: React.DragEvent<HTMLElement>) => void;
}

const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(({ id, onChange, className = '', onDragOver, onDrop }, ref) => {
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
    } = useEditor(ref as RefObject<HTMLDivElement>, id);

    // Register methods with the Ref Manager
    useComponentRef(id, {
        getText,
        updateContent,
        applyStyle,
        normalize,
        insertChip,
        convertSelectionToChip,
        focus,
    });

    useEffect(() => {
        const editor = (ref as React.RefObject<HTMLDivElement>).current;
        if (!editor) return;

        editor.setAttribute('role', 'textbox');
        editor.setAttribute('aria-multiline', 'true');
        editor.setAttribute('spellcheck', 'true');
        editor.setAttribute('data-editor-root', 'true');
        editor.setAttribute('data-editor-id', id);

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            const text = e.clipboardData?.getData('text/plain');
            if (text) {
                document.execCommand('insertText', false, text);
            }
        };

        editor.addEventListener('paste', handlePaste);

        // Use our new drag event handlers from the hook
        editor.addEventListener('dragstart', (e: DragEvent) => {
            const target = e.target as HTMLElement;
            if (target.hasAttribute('data-chip')) {
                e.stopPropagation();
                handleNativeDragStart(e);
            }
        });

        editor.addEventListener('dragend', (e: DragEvent) => {
            const target = e.target as HTMLElement;
            if (target.hasAttribute('data-chip')) {
                e.stopPropagation();
                handleNativeDragEnd(e);
            }
        });

        return () => {
            editor.removeEventListener('paste', handlePaste);
            editor.removeEventListener('dragstart', handleNativeDragStart);
            editor.removeEventListener('dragend', handleNativeDragEnd);
        };
    }, [ref, id, handleNativeDragStart, handleNativeDragEnd]);

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
                ref={ref}
                data-editor-id={id}
                className={`w-full h-full min-h-48 p-4 focus:outline-none text-neutral-950 dark:text-neutral-50 whitespace-pre-wrap ${className}`}
                contentEditable
                onInput={handleInput}
                onBlur={normalizeContent}
                onDragOver={onDragOver || handleDragOverInternal}
                onDrop={onDrop || handleDropInternal}
            />
            <EditorChipButton
                editorId={id}
                onInsertChip={insertChip}
                onConvertToChip={handleConvertToChip}
            />
        </div>
    );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
