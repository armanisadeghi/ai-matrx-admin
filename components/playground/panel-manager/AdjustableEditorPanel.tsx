'use client';

import React, { useRef, useState } from 'react';
import { Panel, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Expand, Minimize2 } from 'lucide-react';
import { useRefManager } from '@/lib/refs';
import { EditorWithProviders } from '@/features/rich-text-editor/withManagedEditor';

interface AdjustableEditorPanelProps {
    id: string;
    order: number;
    role: 'system' | 'user' | 'assistant';
    onStateChange: (state: any) => void;
    initialContent?: string;
}

export function AdjustableEditorPanel({ id, order, role, onStateChange, initialContent }: AdjustableEditorPanelProps) {
    const panelRef = useRef<ImperativePanelHandle>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [previousSize, setPreviousSize] = useState(15);
    const refManager = useRefManager();
    const [currentText, setCurrentText] = useState('');

    const toggleCollapse = () => {
        if (isCollapsed) {
            setIsCollapsed(false);
        } else {
            setPreviousSize(panelRef.current?.getSize() ?? 10);
            setIsCollapsed(true);
        }
    };

    if (isCollapsed) {
        return (
            <div className='h-6 flex-none border bg-background relative'>
                <span className='text-sm text-muted-foreground px-1'>{role.toUpperCase()}</span>
                <Button
                    variant='ghost'
                    size='sm'
                    className='absolute top-0 right-0 h-6 w-6 p-0 z-10'
                    onClick={toggleCollapse}
                >
                    <Expand className='h-2 w-2 text-gray-500' />
                </Button>
            </div>
        );
    }

    return (
        <>
            <Panel
                ref={panelRef}
                order={order}
                defaultSize={previousSize}
                minSize={10}
                maxSize={75}
            >
                <Card className='h-full p-0 overflow-hidden bg-background relative'>
                    <Button
                        variant='ghost'
                        size='sm'
                        className='absolute top-0 right-0 h-6 w-6 p-0 z-10'
                        onClick={toggleCollapse}
                    >
                        <Minimize2 className='h-4 w-4 text-gray-500' />
                    </Button>
                    <div className='h-full flex flex-col'>
                        <div className='text-sm text-muted-foreground px-1'>{role.toUpperCase()}</div>
                        <div className='flex w-full h-full min-h-96 border border-blue-500'>
                            <EditorWithProviders
                                id={id}
                                className='w-full h-full border border-gray-300 dark:border-red-700 rounded-md'
                                initialContent={initialContent}
                            />
                        </div>
                    </div>
                </Card>
            </Panel>
            <PanelResizeHandle />
        </>
    );
}

export default AdjustableEditorPanel;
