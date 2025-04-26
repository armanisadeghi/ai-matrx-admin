'use client';

import React, { useRef, useState } from 'react';
import { ImperativePanelHandle, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { Button, Card } from '@/components/ui';
import MarkdownRenderer from '@/components/mardown-display/MarkdownRenderer';
import DraggableToolbar, { ToolbarAction } from '../components/DraggableToolbar';
import { Eye, Code, FileText, Copy, Braces, Plus } from 'lucide-react';

interface ResultPanelProps {
    id: string;
    order: number;
    number: number;
    label: string;
    streamingText: string;
    onDelete?: (id: string) => void;
    onDragDrop?: (draggedId: string, targetId: string) => void;
    onLabelChange?: (id: string, newLabel: string) => void;
    debug?: boolean;
    onDebugClick?: (id: string) => void;
    minSize?: number;
    addAssistantResponse?: (response: string) => void;
}

export function ResultPanel({ id, order, number, label, streamingText, onDelete, onDragDrop, onLabelChange, debug, onDebugClick, minSize, addAssistantResponse }: ResultPanelProps) {
    const panelRef = useRef<ImperativePanelHandle>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [previousSize, setPreviousSize] = useState(minSize);
    const [viewMode, setViewMode] = useState<'rendered' | 'raw' | 'processed' | 'parsedAsJson'>('rendered');
    const [showCopySuccess, setShowCopySuccess] = useState(false);

    const toggleCollapse = () => {
        if (isCollapsed) {
            setIsCollapsed(false);
        } else {
            setPreviousSize(panelRef.current?.getSize() ?? 10);
            setIsCollapsed(true);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(streamingText);
            setShowCopySuccess(true);
            setTimeout(() => setShowCopySuccess(false), 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const customActions: ToolbarAction[] = [
        {
            label: showCopySuccess ? 'Copied!' : 'Copy',
            icon: <Copy className='h-4 w-4' />,
            onClick: handleCopy,
        },
        {
            label: 'View Rendered',
            icon: <Eye className='h-4 w-4' />,
            onClick: () => setViewMode('rendered'),
        },
        {
            label: 'View Raw',
            icon: <Code className='h-4 w-4' />,
            onClick: () => setViewMode('raw'),
        },
        {
            label: 'View Processed',
            icon: <FileText className='h-4 w-4' />,
            onClick: () => setViewMode('processed'),
        },
        {
            label: 'View Parsed as JSON',
            icon: <Braces className='h-4 w-4' />,
            onClick: () => setViewMode('parsedAsJson'),
        },
        {
            label: 'Add Assistant Response',
            icon: <Plus className='h-4 w-4' />,
            onClick: () => addAssistantResponse(streamingText),
        },
    ];

    const renderContent = () => {
        switch (viewMode) {
            case 'raw':
            case 'processed':
                return <pre className='p-4 whitespace-pre-wrap overflow-y-auto font-mono text-sm'>{streamingText}</pre>;
            case 'rendered':
            default:
                return (
                    <div className='flex-1 p-2 overflow-y-auto overflow-x-hidden scrollbar-thin'>
                        <MarkdownRenderer
                            content={streamingText}
                            type='message'
                            role='assistant'
                            fontSize={18}
                        />
                    </div>
                );
        }
    };

    if (isCollapsed) {
        return (
            <div className='h-6 flex-none border bg-background'>
                <DraggableToolbar
                    id={id}
                    currentLabel={label}
                    isCollapsed={isCollapsed}
                    onLabelChange={onLabelChange}
                    onToggleCollapse={toggleCollapse}
                    onDragDrop={onDragDrop}
                    onDelete={onDelete}
                    actions={customActions}
                    debug={debug}
                    onDebugClick={onDebugClick}
                />
            </div>
        );
    }

    return (
        <>
            <Panel
                ref={panelRef}
                id={id}
                order={order}
                defaultSize={previousSize}
                minSize={10}
                maxSize={75}
            >
                <Card className='h-full p-0 overflow-hidden bg-background'>
                    <div className='h-full flex flex-col'>
                        <DraggableToolbar
                            id={id}
                            currentLabel={label}
                            isCollapsed={isCollapsed}
                            onLabelChange={onLabelChange}
                            onToggleCollapse={toggleCollapse}
                            onDragDrop={onDragDrop}
                            onDelete={onDelete}
                            actions={customActions}
                            debug={debug}
                            onDebugClick={onDebugClick}
                        />
                        {renderContent()}
                    </div>
                </Card>
            </Panel>
            <PanelResizeHandle />
        </>
    );
}

export default ResultPanel;
