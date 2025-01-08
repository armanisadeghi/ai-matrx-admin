'use client';

import { useRefManager } from '@/lib/refs';
import React, { useRef, useEffect, useState } from 'react';
import RichTextEditor from '@/features/rich-text-editor/RichTextEditor';
import { useEditor } from '@/features/rich-text-editor/hooks/useEditor';

interface EditorDisplayWrapperProps {
    editorId: string;
}

const EditorDisplayWrapper: React.FC<EditorDisplayWrapperProps> = ({ editorId }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const refManager = useRefManager();
    const [currentText, setCurrentText] = useState('');

    const { insertChip, handleDragOver, handleDrop, handleStyleChange, convertSelectionToChip, normalizeContent } = useEditor(editorRef, editorId);

    useEffect(() => {
        const updateText = () => {
            const text = refManager.call(editorId, 'getText');
            setCurrentText(text || '');
        };

        updateText();
        const interval = setInterval(updateText, 100);
        return () => clearInterval(interval);
    }, [refManager, editorId]);

    return (
        <div className='flex w-full h-full min-h-96 border border-blue-500'>
            <RichTextEditor
                id={editorId}
                ref={editorRef}
                className='w-full border border-gray-300 dark:border-red-700 rounded-md'
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            />
        </div>
    );
};

export default EditorDisplayWrapper;