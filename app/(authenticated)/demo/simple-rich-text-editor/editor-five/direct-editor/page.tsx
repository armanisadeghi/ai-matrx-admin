'use client';

import React, { useState, useEffect } from 'react';
import { useEditorContext } from '@/features/rich-text-editor/provider/EditorProvider';
import { MatrxTableLoading } from '@/components/matrx/LoadingComponents';
import { useRefManager } from '@/lib/refs';
import RichTextEditor from '@/features/rich-text-editor/RichTextEditor';

const EDITOR_ID: string = 'main-editor';

const SAMPLE_TEXT: string = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.`;

const Page: React.FC = () => {
    const initialContent = SAMPLE_TEXT;
    const editorId = EDITOR_ID;
    const [isRegistered, setIsRegistered] = useState(false);
    const context = useEditorContext();
    const refManager = useRefManager();
    const [currentText, setCurrentText] = useState('');

    useEffect(() => {
        if (!isRegistered) {
            context.registerEditor(EDITOR_ID);
            setIsRegistered(true);
        }
    }, [context, isRegistered]);

    useEffect(() => {
        if (initialContent) {
            refManager.call(editorId, 'updateContent', initialContent);
        }
    }, [initialContent, editorId, refManager]);

    useEffect(() => {
        const updateText = () => {
            const text = refManager.call(editorId, 'getText');
            setCurrentText(text || '');
        };

        updateText();
        const interval = setInterval(updateText, 100);
        return () => clearInterval(interval);
    }, [refManager, editorId]);

    if (!isRegistered) {
        return <MatrxTableLoading />;
    }

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

export default Page;
