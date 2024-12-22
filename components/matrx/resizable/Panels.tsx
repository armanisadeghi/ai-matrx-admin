// PanelLeft.jsx
import React from 'react';
import {ResizablePanelGroup, ResizablePanel, ResizableHandle} from '@/components/ui/resizable';
import PanelContent from './dev/PanelContent';

export const PanelLeft = (
    {
        header,
        headerProps,
        children,
        defaultSize = 20,
        minSize = 1,
        maxSize = 99,
        onResize,
    }) => {
    return (
        <div className="fixed inset-0 z-50" data-testid="panel-container-left">
            <ResizablePanelGroup
                direction="horizontal"
                className="w-screen h-screen"
                onLayout={onResize}
            >
                <ResizablePanel
                    defaultSize={defaultSize}
                    minSize={minSize}
                    maxSize={maxSize}
                >
                    <PanelContent
                        position="left"
                        header={header}
                        headerProps={headerProps}
                    >
                        {children}
                    </PanelContent>
                </ResizablePanel>

                <ResizableHandle withHandle/>

                <ResizablePanel defaultSize={100 - defaultSize}>
                    <div className="h-full"/>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};

// PanelRight.jsx
export const PanelRight = (
    {
        header,
        headerProps,
        children,
        defaultSize = 20,
        minSize = 1,
        maxSize = 99,
        onResize,
    }) => {
    return (
        <div className="fixed inset-0 z-50" data-testid="panel-container-right">
            <ResizablePanelGroup
                direction="horizontal"
                className="w-screen h-screen"
                onLayout={onResize}
            >
                <ResizablePanel defaultSize={100 - defaultSize}>
                    <div className="h-full"/>
                </ResizablePanel>

                <ResizableHandle withHandle/>

                <ResizablePanel
                    defaultSize={defaultSize}
                    minSize={minSize}
                    maxSize={maxSize}
                >
                    <PanelContent
                        position="right"
                        header={header}
                        headerProps={headerProps}
                    >
                        {children}
                    </PanelContent>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};

// PanelTop.jsx
export const PanelTop = ({
                             header,
                             headerProps,
                             children,
                             defaultSize = 20,
                             minSize = 1,
                             maxSize = 99,
                             onResize,
                         }) => {
    return (
        <div className="fixed inset-0 z-50" data-testid="panel-container-top">
            <ResizablePanelGroup
                direction="vertical"
                className="w-screen h-screen"
                onLayout={onResize}
            >
                <ResizablePanel
                    defaultSize={defaultSize}
                    minSize={minSize}
                    maxSize={maxSize}
                >
                    <PanelContent
                        position="top"
                        header={header}
                        headerProps={headerProps}
                    >
                        {children}
                    </PanelContent>
                </ResizablePanel>

                <ResizableHandle withHandle/>

                <ResizablePanel defaultSize={100 - defaultSize}>
                    <div className="h-full"/>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};

// PanelBottom.jsx
export const PanelBottom = (
    {
        header,
        headerProps,
        children,
        defaultSize = 20,
        minSize = 1,
        maxSize = 99,
        onResize,
    }) => {
    return (
        <div className="fixed inset-0 z-50" data-testid="panel-container-bottom">
            <ResizablePanelGroup
                direction="vertical"
                className="w-screen h-screen"
                onLayout={onResize}
            >
                <ResizablePanel defaultSize={100 - defaultSize}>
                    <div className="h-full"/>
                </ResizablePanel>

                <ResizableHandle withHandle/>

                <ResizablePanel
                    defaultSize={defaultSize}
                    minSize={minSize}
                    maxSize={maxSize}
                >
                    <PanelContent
                        position="bottom"
                        header={header}
                        headerProps={headerProps}
                    >
                        {children}
                    </PanelContent>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};

