'use client';


import React from 'react';
import MultiEditorPage from '../multi-editor/page';
import EditorStateVisualizer from '@/features/rich-text-editor/admin/sidebar-analyzer/EditorStateVisualizer';


export default function MessagesPage() {
    return (
        <div className="flex h-[calc(100vh-3rem)] gap-4 p-4">
            {/* Editor Panel */}
            <div className="flex-1 overflow-auto">
                <MultiEditorPage />
            </div>

            {/* Visualizer Panel */}
            <div className="flex-1">
                <EditorStateVisualizer />
            </div>
        </div>
    );
}