// RichTextEditor.jsx
'use client';

import React, { useRef, useEffect, useState } from 'react';
import Toolbar from './Toolbar';


const RichTextEditor = () => {
    const editorRef = useRef(null);
    const [content, setContent] = useState('');

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        editor.setAttribute('role', 'textbox');
        editor.setAttribute('aria-multiline', 'true');
        editor.setAttribute('spellcheck', 'true');

        editor.addEventListener('paste', handlePaste);
        return () => editor.removeEventListener('paste', handlePaste);
    }, []);

    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    };

    const handleChipClick = (chipId) => {
        console.log('RichTextEditor Chip clicked:', chipId);
        // Add your chip click handling logic here
    };

    const insertChip = () => {
        const uniqueId = `chip-${Date.now()}`;
        const chipName = `Chip ${Math.floor(Math.random() * 1000)}`;

        const chip = document.createElement('span');
        chip.contentEditable = 'false';
        chip.className = 'inline-flex items-center px-2 py-1 mx-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-md cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors duration-200';
        chip.setAttribute('data-chip', 'true');
        chip.setAttribute('data-chip-id', uniqueId);
        chip.textContent = chipName;
        
        chip.addEventListener('click', () => handleChipClick(uniqueId));

        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.insertNode(chip);

        const newRange = document.createRange();
        newRange.setStartAfter(chip);
        newRange.setEndAfter(chip);
        selection.removeAllRanges();
        selection.addRange(newRange);
    };

    const normalizeContent = () => {
        const editor = editorRef.current;
        if (!editor) return;

        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
            if (node.parentNode === editor) {
                const span = document.createElement('span');
                node.parentNode.insertBefore(span, node);
                span.appendChild(node);
            }
        }
    };

    return (
        <div className='w-full max-w-4xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-950 rounded-lg'>
            <Toolbar editorRef={editorRef} insertChip={insertChip} />
            <div
                ref={editorRef}
                className='min-h-48 p-4 focus:outline-none text-neutral-950 dark:text-neutral-50'
                contentEditable
                onInput={(e) => {
                    setContent(e.currentTarget.textContent);
                    normalizeContent();
                }}
                onBlur={normalizeContent}
            />
        </div>
    );
};

export default RichTextEditor;