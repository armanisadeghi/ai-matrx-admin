// useEditor.ts
'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { EditorRef, ChipData, TextStyle } from './types';
import { 
    normalizeEditorContent, 
    generateChipData, 
    createChipElement, 
    insertNodeAtSelection,
    applyTextStyle 
} from './utils';

export const useEditor = () => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [content, setContent] = useState('');

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        editor.setAttribute('role', 'textbox');
        editor.setAttribute('aria-multiline', 'true');
        editor.setAttribute('spellcheck', 'true');

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            const text = e.clipboardData?.getData('text/plain') || '';
            document.execCommand('insertText', false, text);
        };

        editor.addEventListener('paste', handlePaste);
        return () => editor.removeEventListener('paste', handlePaste);
    }, []);

    const handleInsertChip = useCallback(() => {
        const chipData = generateChipData();
        const chipElement = createChipElement(chipData);
        insertNodeAtSelection(chipElement);
        editorRef.current?.focus();
    }, []);

    const handleApplyStyle = useCallback((style: TextStyle) => {
        applyTextStyle(style);
        editorRef.current?.focus();
    }, []);

    return {
        editorRef,
        content,
        setContent,
        handleApplyStyle,
        handleInsertChip,
    };
};