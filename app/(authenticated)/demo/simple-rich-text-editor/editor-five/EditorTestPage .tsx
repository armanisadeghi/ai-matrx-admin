'use client';

import { useRefManager } from '@/lib/refs';
import React, { useRef, useEffect, useState } from 'react';
import RichTextEditor from '@/features/rich-text-editor/RichTextEditor';
import { useEditor } from '@/features/rich-text-editor/hooks/useEditor';
import Toolbar from '@/features/rich-text-editor/components/Toolbar';
import { TextStyle } from '@/features/rich-text-editor/types/editor.types';
import ChipSearchUtility from '@/features/rich-text-editor/components/ChipSearchUtility';
import { DebugStats } from '@/components/debug/debug-stats';
import { InspectHtmlUtil } from '@/features/rich-text-editor/components/InspectionComponents';

const EDITOR_ID = 'main-editor';

const EditorTestPage: React.FC = () => {
    const editorRef = useRef<HTMLDivElement>(null);
    const refManager = useRefManager();
    const [currentText, setCurrentText] = useState('');

    const {
        insertChip,
        handleDragOver,
        handleDrop,
        handleStyleChange,
        convertSelectionToChip,
        normalizeContent,
    } = useEditor(editorRef, EDITOR_ID);

    useEffect(() => {
        const updateText = () => {
            const text = refManager.call(EDITOR_ID, 'getText');
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

    const handleInsertChip = () => {
        normalizeContent();
        insertChip();
    };

    return (
        <div className="flex w-full gap-4">
            <div className="flex-1 space-y-4">
                <div className="border border-gray-300 dark:border-gray-700 rounded-lg">
                    <Toolbar
                        editorId={EDITOR_ID}
                        onApplyStyle={handleApplyStyle}
                        onInsertChip={handleInsertChip}
                        onConvertToChip={handleConvertToChip}
                    />
                    <RichTextEditor
                        id={EDITOR_ID}
                        ref={editorRef}
                        className="border-t border-gray-300 dark:border-gray-700"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    />
                </div>

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
                    <ChipSearchUtility />
                    <DebugStats />
                </div>
            </div>

            <div className="w-1/3 h-[85vh] overflow-auto">
                <InspectHtmlUtil editorId={EDITOR_ID} ref={editorRef} />
            </div>
        </div>
    );
};

export default EditorTestPage;