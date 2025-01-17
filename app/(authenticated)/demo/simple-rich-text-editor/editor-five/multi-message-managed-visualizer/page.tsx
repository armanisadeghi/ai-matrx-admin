'use client';

import React from 'react';
import MultiEditorPage from "./MultiEditorPage";
import EditorStateVisualizer from '@/features/rich-text-editor/admin/sidebar-analyzer/EditorStateVisualizer';

export default function Page() {
    return (
        <div className="flex w-full h-[calc(100vh-3rem)] gap-2">
            {/* Editor Section */}
            <div className="flex-1 overflow-auto">
                <MultiEditorPage />
            </div>
            
            {/* Debug Panel Section */}
            <div className="flex-1 overflow-auto">
                <EditorStateVisualizer />
            </div>
        </div>
    );
}