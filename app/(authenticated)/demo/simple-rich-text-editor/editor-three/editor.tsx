// Editor.tsx
import React from 'react';
import { useEditor } from './useEditor';
import Toolbar from './Toolbar';
import { normalizeEditorContent } from './utils';

const Editor: React.FC = () => {
    const { 
        editorRef, 
        content, 
        setContent, 
        handleApplyStyle, 
        handleInsertChip 
    } = useEditor();

    return (
        <div className='w-full max-w-4xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-950 rounded-lg'>
            <Toolbar 
                onApplyStyle={handleApplyStyle} 
                onInsertChip={handleInsertChip}
            />
            <div
                ref={editorRef}
                className='min-h-48 p-4 focus:outline-none text-neutral-950 dark:text-neutral-50'
                contentEditable
                onInput={(e) => {
                    setContent(e.currentTarget.textContent || '');
                    if (editorRef.current) {
                        normalizeEditorContent(editorRef.current);
                    }
                }}
                onBlur={() => {
                    if (editorRef.current) {
                        normalizeEditorContent(editorRef.current);
                    }
                }}
            />
        </div>
    );
};

export default Editor;