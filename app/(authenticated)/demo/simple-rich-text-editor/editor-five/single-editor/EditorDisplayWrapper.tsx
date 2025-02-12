'use client';

import { useRefManager } from '@/lib/refs';
import React, { useEffect, useState } from 'react';
import RichTextEditor from '@/features/rich-text-editor/RichTextEditor';

interface EditorDisplayWrapperProps {
    editorId: string;
    initialContent?: string;
}

const EditorDisplayWrapper: React.FC<EditorDisplayWrapperProps> = ({ editorId, initialContent }) => {
    const refManager = useRefManager();
    const [currentText, setCurrentText] = useState('');

    useEffect(() => {
        if (initialContent) {
            refManager.call(editorId, 'updateContent', initialContent);
        }
    }
    , [initialContent, editorId, refManager]);

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
                componentId={editorId}
                className='w-full border border-gray-300 dark:border-red-700 rounded-md'
                initialContent={initialContent}
            />
        </div>
    );
};

export default EditorDisplayWrapper;