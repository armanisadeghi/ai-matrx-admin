'use client';

import React from 'react';
import { PanelGroup, PanelResizeHandle, Panel } from 'react-resizable-panels';
import MultiEditorPage from './MultiEditorPage';
import EditorStateVisualizer from '@/features/rich-text-editor/admin/sidebar-analyzer/EditorStateVisualizer';
import { ScrollArea } from '@/components/ui';

export default function Page() {
    return (
        <div className="h-[calc(100vh-3rem)]">
            <PanelGroup direction="horizontal" className="h-full">
                {/* Left Panel */}
                <Panel defaultSize={50} className="p-2">
                    <MultiEditorPage />
                </Panel>

                {/* Resize Handle */}
                <PanelResizeHandle className="w-1 bg-gray-200" />

                {/* Right Panel */}
                <Panel defaultSize={50} className="p-2">
                    <ScrollArea className="h-full">
                    <EditorStateVisualizer />
                    </ScrollArea>
                </Panel>
            </PanelGroup>
        </div>
    );
}
