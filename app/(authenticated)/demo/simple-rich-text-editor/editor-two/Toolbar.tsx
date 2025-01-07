// Toolbar.jsx
import { button } from '@nextui-org/react';
import { BoldIcon, ItalicIcon, Plus, UnderlineIcon } from 'lucide-react';
import React from 'react';


const Toolbar = ({ editorRef, insertChip }) => {
    const execCommand = (command) => {
        document.execCommand(command, false, null);
        editorRef.current?.focus();
    };

    return (
        <div className="flex items-center gap-2 p-2 border-b border-neutral-300 dark:border-neutral-600">
            <button
                onClick={() => execCommand('bold')}
                className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Bold"
            >
                <BoldIcon className="w-4 h-4 text-neutral-950 dark:text-neutral-50" />
            </button>
            <button
                onClick={() => execCommand('italic')}
                className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Italic"
            >
                <ItalicIcon className="w-4 h-4 text-neutral-950 dark:text-neutral-50" />
            </button>
            <button
                onClick={() => execCommand('underline')}
                className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Underline"
            >
                <UnderlineIcon className="w-4 h-4 text-neutral-950 dark:text-neutral-50" />
            </button>
            <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-600" />
            <button
                onClick={insertChip}
                className="p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Insert Chip"
            >
                <Plus className="w-4 h-4 text-neutral-950 dark:text-neutral-50" />
            </button>
        </div>
    );
};

export default Toolbar;