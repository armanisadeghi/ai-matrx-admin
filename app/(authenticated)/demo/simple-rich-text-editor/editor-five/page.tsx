'use client';

import React, { useRef, useEffect, useState } from 'react';
import RichTextEditor from './RichTextEditor';
import Toolbar from './components/Toolbar';
import { useEditor } from './hooks/useEditor';
import { TextStyle } from './types';
import ChipSearchUtility from './components/ChipSearchUtility';
import { useRefManager } from '@/lib/refs';
import { DebugStats, InspectHtmlUtil } from './components/InspectionComponents';

const Page: React.FC = () => {
    const editorRef = useRef<HTMLDivElement>(null);
    const refManager = useRefManager();
    const [currentText, setCurrentText] = useState('');

    const { insertChip, handleDragOver, handleDrop, handleStyleChange, convertSelectionToChip } = useEditor(editorRef);

    useEffect(() => {
        const updateText = () => {
            const text = refManager.call('main-editor', 'getText');
            setCurrentText(text || '');
        };

        updateText();
        const interval = setInterval(updateText, 100);
        return () => clearInterval(interval);
    }, [refManager]);

    const handleApplyStyle = (style: TextStyle) => {
        handleStyleChange(style);
        editorRef.current?.focus();
    };

    const handleConvertToChip = () => {
        const success = convertSelectionToChip();
        if (!success) {
            console.warn('Please select some text to convert to a chip');
        }
        editorRef.current?.focus();
    };

    return (
        <div className="flex w-full gap-4">
            {/* Left column with editor and utilities */}
            <div className="flex-1 space-y-4">
                {/* Editor section */}
                <div className="border border-gray-300 dark:border-gray-700 rounded-lg">
                    <Toolbar
                        onApplyStyle={handleApplyStyle}
                        onInsertChip={insertChip}
                        onConvertToChip={handleConvertToChip}
                    />
                    <RichTextEditor
                        id="main-editor"
                        ref={editorRef}
                        className="border-t border-gray-300 dark:border-gray-700"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    />
                </div>

                {/* Stacked utilities section */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Text Representation
                        </label>
                        <textarea
                            className="w-full h-48 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            value={currentText}
                            readOnly
                        />
                    </div>
                    <ChipSearchUtility editorId="main-editor" />
                    <DebugStats editorId="main-editor" ref={editorRef} />
                </div>
            </div>

            {/* Right column - HTML Inspector */}
            <div className="w-1/3 h-[85vh] overflow-auto">
                <InspectHtmlUtil editorId="main-editor" ref={editorRef} />
            </div>
        </div>
    );
};

export default Page;