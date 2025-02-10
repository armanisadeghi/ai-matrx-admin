// page.tsx
'use client';

import { EditorWithProviders } from "@/providers/rich-text-editor/withManagedEditor";

const EditorController = () => {
    const editor = useManagedEditor('main-editor');
    
    const handleAction = () => {
        editor.setText('New content');
        editor.focus();
        editor.insertChip();
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex gap-2">
                <button 
                    onClick={handleAction}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Update Editor
                </button>
                <div>Chip Count: {editor.chipCount}</div>
            </div>
            
            <EditorWithProviders
                id="main-editor"
                className="w-full min-h-[200px] border border-gray-300 dark:border-gray-700 rounded-md"
                onChange={(content) => console.log('Content changed:', content)}
            />
        </div>
    );
};

export default EditorController;