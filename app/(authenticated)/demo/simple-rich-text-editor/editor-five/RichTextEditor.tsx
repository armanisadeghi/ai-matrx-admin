// RichTextEditor.tsx
import React, { useEffect, forwardRef } from 'react';
import { useEditor } from './hooks/useEditor';
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
        applyStyle,
        getText,
        normalize,
        updateContent,
        focus,

        // State
        plainTextContent,

        // Event handlers
        handleDragOver: handleDragOverInternal,
        handleDrop: handleDropInternal,
    } = useEditor(ref as React.RefObject<HTMLDivElement>);

    // Register methods with the Ref Manager
    useComponentRef(id, {
        insertChip,
        applyStyle,
        getText,
        normalize,
        updateContent,
        focus,
    });

    useEffect(() => {
        const editor = (ref as React.RefObject<HTMLDivElement>).current;
        if (!editor) return;

        editor.setAttribute('role', 'textbox');
        editor.setAttribute('aria-multiline', 'true');
        editor.setAttribute('spellcheck', 'true');

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            const text = e.clipboardData?.getData('text/plain');
            if (text) {
                document.execCommand('insertText', false, text);
            }
        };

        editor.addEventListener('paste', handlePaste);

        // Add drag and drop event listeners
        editor.addEventListener('dragstart', (e: DragEvent) => {
            const target = e.target as HTMLElement;
            if (target.hasAttribute('data-chip')) {
                e.stopPropagation();
                handleDragOverInternal(e as any);
            }
        });

        editor.addEventListener('dragend', (e: DragEvent) => {
            const target = e.target as HTMLElement;
            if (target.hasAttribute('data-chip')) {
                e.stopPropagation();
                handleDropInternal(e as any);
            }
        });

        return () => {
            editor.removeEventListener('paste', handlePaste);
            // Consider adding cleanup for drag events if needed
        };
    }, [ref, handleDragOverInternal, handleDropInternal]);

    useEffect(() => {
        onChange?.(plainTextContent);
    }, [onChange, plainTextContent]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        updatePlainTextContent();
        onChange?.(e.currentTarget.textContent || '');
    };

    return (
        <div className='relative group'>
            <div
                ref={ref}
                data-editor-id={id}
                className={`min-h-48 p-4 focus:outline-none text-neutral-950 dark:text-neutral-50 whitespace-pre-wrap ${className}`}
                contentEditable
                onInput={handleInput}
                onBlur={normalizeContent}
                onDragOver={onDragOver}
                onDrop={onDrop}
            />
            <EditorChipButton
                editorId={id}
                onInsertChip={() => console.log('Insert new chip')}
                onConvertToChip={() => console.log('Convert selection to chip')}
            >
                {/* Custom dialog content can be passed as children */}
                <div className='p-4'>
                    <h2 className='text-lg font-semibold mb-4'>Customize Your Chip</h2>
                    {/* Add your custom dialog content here */}
                </div>
            </EditorChipButton>
        </div>
    );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
