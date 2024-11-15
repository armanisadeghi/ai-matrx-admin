// ResizableLayout.tsx
import * as React from 'react';
import {
    ResizablePanel,
    ResizablePanelGroup,
    ResizableHandle,
} from '@/components/ui/resizable';

interface ResizableLayoutProps {
    leftPanel: React.ReactNode;
    rightPanel: React.ReactNode;
    defaultLeftSize?: number;
    minLeftSize?: number;
    maxLeftSize?: number;
    className?: string;
}

export function ResizableLayout(
    {
        leftPanel,
        rightPanel,
        defaultLeftSize = 25,
        minLeftSize = 10,
        maxLeftSize = 50,
        className = ''
    }: ResizableLayoutProps) {
    const [leftPanelSize, setLeftPanelSize] = React.useState(defaultLeftSize);

    return (
        <div className={`h-[calc(100vh-4rem)] ${className}`}>
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel
                    defaultSize={leftPanelSize}
                    minSize={minLeftSize}
                    maxSize={maxLeftSize}
                    onResize={setLeftPanelSize}
                >
                    {leftPanel}
                </ResizablePanel>

                <ResizableHandle/>

                <ResizablePanel defaultSize={100 - leftPanelSize}>
                    {rightPanel}
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
