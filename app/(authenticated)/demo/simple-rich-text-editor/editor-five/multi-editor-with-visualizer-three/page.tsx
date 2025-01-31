'use client';

import React from 'react';
import { PanelGroup, PanelResizeHandle, Panel } from 'react-resizable-panels';
import MultiEditorPage from './MultiEditorPage';
import EditorStateVisualizer from '@/features/rich-text-editor/admin/sidebar-analyzer/EditorStateVisualizer';
import MessagesContainer from '@/components/playground/messages/MessagesContainer';
import EditorDebugMonitor from './EditorDebugMonitor';

export default function Page() {
    return (
        <div className='h-[calc(100vh-3rem)]'>
            <PanelGroup
                direction='horizontal'
                className='h-full'
            >
                <Panel
                    defaultSize={50}
                    className='p-2'
                >
                    <MessagesContainer />
                </Panel>

                <PanelResizeHandle className='w-1 bg-gray-200' />

                <Panel
                    defaultSize={50}
                    className='p-2'
                >
                    <EditorStateVisualizer />
                </Panel>
            </PanelGroup>
        </div>
    );
}
