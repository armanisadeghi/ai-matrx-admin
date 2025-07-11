'use client';

import { useRefManager } from '@/lib/refs';
import React, { useRef, useEffect, useState, useMemo } from 'react';
import Toolbar from '@/features/rich-text-editor/components/Toolbar';
import { TextStyle } from '@/types/editor.types';
import ChipSearchUtility from '@/features/rich-text-editor/components/ChipSearchUtility';
import { DebugStats } from '@/components/debug/debug-stats';
import { InspectHtmlUtil } from '@/features/rich-text-editor/components/InspectionComponents';
import { useMeasure } from "@uidotdev/usehooks";
import { EditorWithProviders } from '@/providers/rich-text-editor/withManagedEditor';

interface EditorTestPageProps {
    editorId: string;
    initialContent?: string;
}

const EditorTestPage: React.FC<EditorTestPageProps> = ({ editorId, initialContent }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const refManager = useRefManager();
    const [currentText, setCurrentText] = useState('');
    const [containerRef, { width, height }] = useMeasure();

    useEffect(() => {
        const updateText = () => {
            const text = refManager.call(editorId, 'getText');
            setCurrentText(text || '');
        };

        updateText();
        const interval = setInterval(updateText, 100);
        return () => clearInterval(interval);
    }, [refManager]);

    const handleApplyStyle = (style: TextStyle) => {
        refManager.call(editorId, 'applyStyle', style);
        editorRef.current?.focus();
    };

    const handleConvertToChip = () => {
        const success = refManager.call(editorId, 'convertSelectionToChip');
        if (!success) {
            console.warn('Please select some text to convert to a chip');
        }
        editorRef.current?.focus();
    };

    const handleInsertChip = () => {
        refManager.call(editorId, 'insertChip');
        editorRef.current?.focus();
    };


    const ToolBar = useMemo(() => {
        return <Toolbar
            onApplyStyle={handleApplyStyle}
            onInsertChip={handleInsertChip}
            onConvertToChip={handleConvertToChip}
        />
    }, []);

    return (
        <div ref={containerRef} className='flex w-full gap-4'>
            <div className='flex-1 space-y-4'>
                <div className='border border-gray-300 dark:border-gray-700 rounded-lg'>
                    {ToolBar}
                    <EditorWithProviders
                        id={editorId}
                        className='w-full border border-gray-300 dark:border-gray-700 rounded-md'
                        initialContent={initialContent}
                    />
                </div>

                <div className='space-y-4'>
                    <div>
                        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Text Representation</label>
                        <textarea
                            className='w-full h-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                            value={currentText}
                            readOnly
                        />
                    </div>
                    <ChipSearchUtility />
                    <DebugStats />
                </div>
            </div>

            <div className='w-1/3 overflow-auto' style={{ height: height ? height - 16 : undefined }}>
                <InspectHtmlUtil
                    editorId={editorId}
                    ref={editorRef}
                />
            </div>
        </div>
    );
};

export default EditorTestPage;