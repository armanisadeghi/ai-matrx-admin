import React, { useRef, useState, useEffect } from 'react';
import { Panel, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Expand, Minimize2 } from 'lucide-react';
import { useManagedEditor } from '@/features/rich-text-editor/hooks/useManagedEditor';
import { EditorWithProviders } from '@/features/rich-text-editor/withManagedEditor';

interface EditorPanelState {
    content: string;
    chipCount: number;
    isCollapsed: boolean;
    size: number;
}

interface AdjustableEditorPanelProps {
    id: string;
    order: number;
    role: 'system' | 'user' | 'assistant';
    onStateChange?: (state: EditorPanelState) => void;
    initialContent?: string;
}

export function AdjustableEditorPanel({ 
    id, 
    order, 
    role, 
    onStateChange, 
    initialContent 
}: AdjustableEditorPanelProps) {
    const panelRef = useRef<ImperativePanelHandle>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [previousSize, setPreviousSize] = useState(15);
    const editor = useManagedEditor(id);

    useEffect(() => {
        const currentState: EditorPanelState = {
            content: editor.plainTextContent,
            chipCount: editor.chipCount,
            isCollapsed,
            size: panelRef.current?.getSize() ?? previousSize
        };
        onStateChange?.(currentState);
    }, [
        editor.plainTextContent,
        editor.chipCount,
        isCollapsed,
        previousSize,
        onStateChange
    ]);

    const toggleCollapse = () => {
        if (isCollapsed) {
            setIsCollapsed(false);
            // Restore previous size when expanding
            panelRef.current?.resize(previousSize);
        } else {
            setPreviousSize(panelRef.current?.getSize() ?? 10);
            setIsCollapsed(true);
            // Set panel to minimal size when collapsing
            panelRef.current?.resize(0);
        }
    };

    return (
        <>
            <Panel
                ref={panelRef}
                order={order}
                defaultSize={isCollapsed ? 0 : previousSize}
                minSize={0}
                maxSize={75}
                collapsible={true}
            >
                <Card className={`h-full p-0 overflow-hidden bg-background relative transition-all duration-200
                    ${isCollapsed ? 'opacity-0 pointer-events-none h-6' : 'opacity-100'}`}
                >
                    <Button
                        variant='ghost'
                        size='sm'
                        className='absolute top-0 right-0 h-6 w-6 p-0 z-10'
                        onClick={toggleCollapse}
                    >
                        {isCollapsed ? (
                            <Expand className='h-2 w-2 text-gray-500' />
                        ) : (
                            <Minimize2 className='h-4 w-4 text-gray-500' />
                        )}
                    </Button>
                    <div className='h-full flex flex-col'>
                        <div className='text-sm text-muted-foreground px-1'>{role.toUpperCase()}</div>
                        <div className={`flex w-full h-full min-h-96 transition-all duration-200
                            ${isCollapsed ? 'invisible' : 'visible'}`}
                        >
                            <EditorWithProviders
                                id={id}
                                className='w-full h-full border border-gray-300 dark:border-gray-700 rounded-md'
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

export type { EditorPanelState };
export default AdjustableEditorPanel;